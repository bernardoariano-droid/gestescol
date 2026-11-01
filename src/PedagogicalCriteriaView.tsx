import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ArrowRightCircle, 
  UserX, 
  Repeat, 
  History, 
  Save, 
  RotateCcw, 
  Printer, 
  Download, 
  AlertTriangle, 
  ShieldCheck, 
  Info, 
  Sliders, 
  BookOpen, 
  Search, 
  Users, 
  GraduationCap, 
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  Check,
  Building,
  Sparkles
} from 'lucide-react';
import { Class, Student, Grade, SchoolSettings, PedagogicalCriteria, CriteriaHistoryLog } from './types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PedagogicalCriteriaViewProps {
  classes: Class[];
  students: Student[];
  grades: Grade[];
  schoolSettings?: SchoolSettings;
  currentSchoolId?: string;
  currentUser: any;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SUBSYSTEMS = [
  'Ensino Geral',
  'Ensino Secundário Técnico-Profissional',
  'Formação de Professores',
  'Educação de Adultos (EJA)'
] as const;

const EDUCATION_LEVELS = [
  'Ensino Primário',
  'Iº Ciclo do Ensino Secundário',
  'IIº Ciclo do Ensino Secundário',
  'Ensino Técnico-Profissional',
  'Educação de Adultos (EJA)'
] as const;

const COURSES = [
  'Geral',
  'Ciências Físicas e Biológicas',
  'Ciências Económicas e Jurídicas',
  'Ciências Sociais',
  'Técnico de Informática',
  'Técnico de Gestão Empresarial',
  'Técnico de Construção Civil'
];

export function getDefaultCriteria(schoolId: string, level: string, year: string = '2024/2025'): PedagogicalCriteria {
  const isPrimary = level === 'Ensino Primário';
  const minAvg = isPrimary ? 5 : 10;
  const minSubject = isPrimary ? 5 : 10;

  return {
    id: `crit_${schoolId}_${Date.now()}`,
    schoolId: schoolId || 's1',
    subsystem: 'Ensino Geral',
    educationLevel: (level as any) || 'Iº Ciclo do Ensino Secundário',
    levelOrClass: 'Todas as Classes do Nível',
    course: 'Geral',
    academicYear: year,
    evaluationPeriod: 'Anual / Final',
    curriculumPlan: 'Padrão Oficial MED (Angola)',

    // 1. Aprovação
    approval: {
      minGeneralAverage: minAvg,
      minSubjectGrade: minSubject,
      maxDeficienciesAllowed: isPrimary ? 0 : 2,
      directApprovalConditions: 'Todas as disciplinas com classificação igual ou superior a 10 valores (ou 5 no Primário) e média geral positiva.',
      examApprovalConditions: 'Classificação final calculada por média ponderada (60% MAC + 40% Exame) igual ou superior a 10 valores.',
      recursoApprovalConditions: 'Obtenção de nota igual ou superior a 10 valores no exame de recurso nas disciplinas em atraso.',
      roundingRule: 'matematico',
      minAttendancePercentage: 75,
      maxUnjustifiedAbsences: 20
    },

    // 2. Reprovação
    reprobation: {
      belowMinAverageReprobes: true,
      maxNegativeSubjectsToReprove: 3,
      criticalSubjects: ['Língua Portuguesa', 'Matemática'],
      examFailConditions: 'Classificação ponderada pós-exame inferior a 10 valores ou falta não justificada à prova de exame.',
      recursoFailConditions: 'Classificação inferior a 10 valores no exame de recurso ou reprovação em mais de 2 disciplinas.',
      failByAbsences: true,
      maxAbsencePercentage: 25
    },

    // 3. Transição
    transition: {
      allowsConditionalTransition: !isPrimary,
      maxDeficienciesForTransition: isPrimary ? 0 : 2,
      terminalClassesNoTransition: ['6ª Classe', '9ª Classe', '12ª Classe'],
      deficiencyResolutionDeadline: 'Até ao encerramento do 1º Trimestre do ano lectivo subsequente.',
      notes: 'O aluno com transição condicionada frequenta a classe superior com obrigatoriedade de recuperação das deficiências.'
    },

    // 4. Desistência
    abandonment: {
      riskAbsenceCount: 2,
      riskConsecutiveDays: 15,
      confirmedDropAbsenceCount: 30,
      notifyGuardiansOnRisk: true,
      administrativeConfirmationRequired: true
    },

    // 5. Recurso
    recurso: {
      eligibleClasses: ['7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe', '11ª Classe', '12ª Classe'],
      eligibleSubjectsType: 'all',
      eligibleSubjects: [],
      minAccessGrade: 7.0,
      maxAccessGrade: 9.4,
      maxSubjectsAllowed: 2,
      finalGradeFormula: 'recurso_direct',
      minPassingGrade: 10.0,
      definitiveFailConditions: 'Classificação no exame de recurso inferior a 10 valores.',
      startDate: '2025-07-10',
      endDate: '2025-07-20',
      registrationDeadline: '2025-07-08'
    },

    updatedAt: new Date().toISOString(),
    updatedBy: 'Administrador do Sistema',
    updatedByEmail: 'admin@escola.ao',
    version: 1
  };
}

export function PedagogicalCriteriaView({
  classes,
  students,
  grades,
  schoolSettings,
  currentSchoolId = 's1',
  currentUser,
  showToast
}: PedagogicalCriteriaViewProps) {
  const isManager = currentUser?.role === 'Administrador' || currentUser?.role === 'Super-Administrador';
  const targetSchoolId = currentSchoolId || currentUser?.schoolId || 's1';

  // State: Context Selection
  const [subsystem, setSubsystem] = useState<'Ensino Geral' | 'Ensino Secundário Técnico-Profissional' | 'Formação de Professores' | 'Educação de Adultos (EJA)'>('Ensino Geral');
  const [educationLevel, setEducationLevel] = useState<'Ensino Primário' | 'Iº Ciclo do Ensino Secundário' | 'IIº Ciclo do Ensino Secundário' | 'Ensino Técnico-Profissional' | 'Educação de Adultos (EJA)'>('Iº Ciclo do Ensino Secundário');
  const [levelOrClass, setLevelOrClass] = useState<string>('Todas as Classes do Nível');
  const [course, setCourse] = useState<string>('Geral');
  const [academicYear, setAcademicYear] = useState<string>(schoolSettings?.anoLectivo || '2024/2025');
  const [evaluationPeriod, setEvaluationPeriod] = useState<'Anual / Final' | '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | 'Exames'>('Anual / Final');
  const [curriculumPlan, setCurriculumPlan] = useState<string>('Padrão Oficial MED (Angola)');

  // Active Tab
  type TabType = 'aprovacao' | 'reprovacao' | 'transicao' | 'desistencia' | 'recurso' | 'historico' | 'simulador';
  const [activeTab, setActiveTab] = useState<TabType>('aprovacao');

  // Storage key specific to school and level
  const storageKey = `edugest_pedagogical_criteria_${targetSchoolId}_${educationLevel}`;
  const historyStorageKey = `edugest_pedagogical_history_${targetSchoolId}`;

  // Current Criteria State
  const [criteria, setCriteria] = useState<PedagogicalCriteria>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Erro ao carregar critérios:', e);
      }
    }
    return getDefaultCriteria(targetSchoolId, educationLevel, academicYear);
  });

  // History state
  const [historyLogs, setHistoryLogs] = useState<CriteriaHistoryLog[]>(() => {
    const saved = localStorage.getItem(historyStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'hist_init_1',
        schoolId: targetSchoolId,
        timestamp: new Date().toISOString(),
        userName: 'Direcção Pedagógica',
        userEmail: 'direccao@escola.ao',
        userRole: 'Administrador',
        summary: 'Configuração Inicial dos Critérios Oficiais MED',
        details: 'Parametrização de médias, transição condicionada e exames de recurso conforme directrizes do Ministério da Educação de Angola.',
        criteriaSnapshot: getDefaultCriteria(targetSchoolId, 'Iº Ciclo do Ensino Secundário', academicYear)
      }
    ];
  });

  // Update criteria when educationLevel changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCriteria(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setCriteria(getDefaultCriteria(targetSchoolId, educationLevel, academicYear));
  }, [educationLevel, storageKey, targetSchoolId, academicYear]);

  // Available classes for simulation & filtering
  const schoolClasses = useMemo(() => {
    return classes.filter(c => !c.schoolId || c.schoolId === targetSchoolId);
  }, [classes, targetSchoolId]);

  const [simulationClassId, setSimulationClassId] = useState<string>(schoolClasses[0]?.id || '');
  const [recursoSearchTerm, setRecursoSearchTerm] = useState<string>('');

  // Handle Save Criteria
  const handleSaveCriteria = () => {
    if (!isManager) {
      showToast('Apenas administradores podem modificar as configurações pedagógicas.', 'error');
      return;
    }

    const updatedCriteria: PedagogicalCriteria = {
      ...criteria,
      schoolId: targetSchoolId,
      subsystem,
      educationLevel,
      levelOrClass,
      course,
      academicYear,
      evaluationPeriod,
      curriculumPlan,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrador',
      updatedByEmail: currentUser?.email || 'admin@escola.ao',
      version: (criteria.version || 1) + 1
    };

    setCriteria(updatedCriteria);
    localStorage.setItem(storageKey, JSON.stringify(updatedCriteria));

    // Add to history
    const newLog: CriteriaHistoryLog = {
      id: `hist_${Date.now()}`,
      schoolId: targetSchoolId,
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'Administrador',
      userEmail: currentUser?.email || 'admin@escola.ao',
      userRole: currentUser?.role || 'Administrador',
      summary: `Actualização de critérios para ${educationLevel} (${academicYear})`,
      details: `Média mínima: ${updatedCriteria.approval.minGeneralAverage} | Máx. Deficiências: ${updatedCriteria.approval.maxDeficienciesAllowed} | Recurso (Notas ${updatedCriteria.recurso.minAccessGrade}-${updatedCriteria.recurso.maxAccessGrade})`,
      criteriaSnapshot: updatedCriteria
    };

    const newLogs = [newLog, ...historyLogs];
    setHistoryLogs(newLogs);
    localStorage.setItem(historyStorageKey, JSON.stringify(newLogs));

    showToast('Critérios pedagógicos guardados com sucesso!', 'success');
  };

  // Restore Default MED Criteria
  const handleRestoreDefaults = () => {
    if (!isManager) {
      showToast('Apenas administradores podem restaurar critérios.', 'error');
      return;
    }
    if (window.confirm('Tem a certeza que deseja restaurar os critérios padrão do Ministério da Educação (MED)? Todas as personalizações deste nível serão repostas.')) {
      const defaults = getDefaultCriteria(targetSchoolId, educationLevel, academicYear);
      setCriteria(defaults);
      localStorage.setItem(storageKey, JSON.stringify(defaults));
      showToast('Critérios padrão do Ministério da Educação restaurados.', 'info');
    }
  };

  // Restore from history
  const handleRestoreFromHistory = (log: CriteriaHistoryLog) => {
    if (!isManager) {
      showToast('Apenas administradores podem restaurar versões anteriores.', 'error');
      return;
    }
    if (window.confirm(`Deseja restaurar as configurações de ${new Date(log.timestamp).toLocaleDateString()} gravadas por ${log.userName}?`)) {
      setCriteria(log.criteriaSnapshot);
      localStorage.setItem(storageKey, JSON.stringify(log.criteriaSnapshot));
      showToast('Versão anterior restaurada com sucesso!', 'success');
    }
  };

  // Calculate Student Status based on Criteria
  const evaluateStudentStatus = (student: Student, targetClass: Class | undefined) => {
    if (!targetClass) return { status: 'Indefinido', average: 0, negativeSubjects: [], eligibleForRecurso: false };

    const classSubjects = targetClass.subjects && targetClass.subjects.length > 0
      ? targetClass.subjects
      : ['Língua Portuguesa', 'Matemática', 'Biologia', 'Física', 'Química', 'História', 'Geografia'];

    // Get subject final averages
    let totalScore = 0;
    let gradedSubjectsCount = 0;
    const negativeSubjects: { subject: string; grade: number }[] = [];

    classSubjects.forEach(sub => {
      // Find grades for this student and subject
      const subGrades = grades.filter(g => g.studentId === student.id && g.subjectId === sub);
      if (subGrades.length > 0) {
        // Average or final grade
        const sum = subGrades.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
        const subAvg = Number((sum / subGrades.length).toFixed(1));
        totalScore += subAvg;
        gradedSubjectsCount++;

        if (subAvg < criteria.approval.minSubjectGrade) {
          negativeSubjects.push({ subject: sub, grade: subAvg });
        }
      }
    });

    const studentAverage = gradedSubjectsCount > 0 ? Number((totalScore / gradedSubjectsCount).toFixed(1)) : 0;

    // Check if dropout
    if (student.enrollmentStatus === 'Desistente') {
      return { status: 'Desistente Confirmado', average: studentAverage, negativeSubjects, eligibleForRecurso: false };
    }

    // Check Recurso Eligibility
    // Student has negatives between minAccessGrade and maxAccessGrade, and count <= maxSubjectsAllowed
    const recursoCandidates = negativeSubjects.filter(
      ns => ns.grade >= criteria.recurso.minAccessGrade && ns.grade <= criteria.recurso.maxAccessGrade
    );
    const belowRecurso = negativeSubjects.filter(ns => ns.grade < criteria.recurso.minAccessGrade);

    const isEligibleForRecurso = 
      negativeSubjects.length > 0 &&
      negativeSubjects.length <= criteria.recurso.maxSubjectsAllowed &&
      belowRecurso.length === 0;

    // Check Approval Status
    if (negativeSubjects.length === 0 && studentAverage >= criteria.approval.minGeneralAverage) {
      return { status: 'Aprovado Directo', average: studentAverage, negativeSubjects, eligibleForRecurso: false };
    }

    if (
      criteria.transition.allowsConditionalTransition &&
      negativeSubjects.length > 0 &&
      negativeSubjects.length <= criteria.transition.maxDeficienciesForTransition &&
      studentAverage >= criteria.approval.minGeneralAverage &&
      !criteria.transition.terminalClassesNoTransition.includes(targetClass.level)
    ) {
      return { status: 'Transita c/ Deficiência', average: studentAverage, negativeSubjects, eligibleForRecurso: false };
    }

    if (isEligibleForRecurso) {
      return { status: 'Admitido a Recurso', average: studentAverage, negativeSubjects, eligibleForRecurso: true };
    }

    return { status: 'Reprovado', average: studentAverage, negativeSubjects, eligibleForRecurso: false };
  };

  // Filtered Students for the Selected Simulation Class
  const simulationClass = schoolClasses.find(c => c.id === simulationClassId) || schoolClasses[0];
  const simulationStudents = useMemo(() => {
    if (!simulationClass) return [];
    return students.filter(s => s.classId === simulationClass.id);
  }, [students, simulationClass]);

  // Overall Students Eligible for Recurso across all school classes
  const allRecursoAdmittedStudents = useMemo(() => {
    const list: Array<{
      student: Student;
      classItem: Class;
      average: number;
      negativeSubjects: { subject: string; grade: number }[];
    }> = [];

    students.forEach(st => {
      const c = classes.find(cls => cls.id === st.classId);
      if (c && (!c.schoolId || c.schoolId === targetSchoolId)) {
        const evaluation = evaluateStudentStatus(st, c);
        if (evaluation.eligibleForRecurso) {
          list.push({
            student: st,
            classItem: c,
            average: evaluation.average,
            negativeSubjects: evaluation.negativeSubjects
          });
        }
      }
    });

    return list.filter(item => 
      item.student.name.toLowerCase().includes(recursoSearchTerm.toLowerCase()) ||
      item.classItem.name.toLowerCase().includes(recursoSearchTerm.toLowerCase()) ||
      item.student.bi?.toLowerCase().includes(recursoSearchTerm.toLowerCase())
    );
  }, [students, classes, targetSchoolId, criteria, grades, recursoSearchTerm]);

  // Export Recurso List to Excel
  const exportRecursoExcel = () => {
    if (allRecursoAdmittedStudents.length === 0) {
      showToast('Não existem alunos admitidos a recurso no momento.', 'info');
      return;
    }

    const data = allRecursoAdmittedStudents.map((item, idx) => ({
      'Nº': idx + 1,
      'Nome do Aluno': item.student.name,
      'Nº de Processo / BI': item.student.bi || item.student.id,
      'Turma': item.classItem.name,
      'Classe': item.classItem.level,
      'Média Anual': item.average,
      'Disciplinas a Recurso': item.negativeSubjects.map(ns => `${ns.subject} (${ns.grade}v)`).join('; '),
      'Situação': 'Admitido ao Exame de Recurso',
      'Data Limite Inscrição': criteria.recurso.registrationDeadline
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos em Recurso');
    XLSX.writeFile(wb, `Alunos_Admitidos_Recurso_${academicYear.replace('/', '_')}.xlsx`);
    showToast('Lista de alunos em recurso exportada em Excel com sucesso!', 'success');
  };

  // Export PDF of Criteria Regulations
  const exportCriteriaPDF = () => {
    const doc = new jsPDF();
    const schoolName = schoolSettings?.nomeEscola || 'Instituição de Ensino EduGest';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('REGULAMENTO E CRITÉRIOS DE AVALIAÇÃO PEDAGÓGICA', 105, 25, { align: 'center' });
    doc.text(`Ano Lectivo: ${academicYear} | Nível: ${educationLevel}`, 105, 31, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    autoTable(doc, {
      startY: 40,
      head: [['Módulo / Seção', 'Critério Configurado', 'Valor / Parâmetro Oficial']],
      body: [
        ['Aprovação', 'Média Geral Mínima', `${criteria.approval.minGeneralAverage} valores`],
        ['Aprovação', 'Nota Mínima por Disciplina', `${criteria.approval.minSubjectGrade} valores`],
        ['Aprovação', 'Regra de Arredondamento', criteria.approval.roundingRule === 'matematico' ? 'Matemático (>=0.5 para cima)' : 'Truncatura'],
        ['Aprovação', 'Assiduidade Mínima', `${criteria.approval.minAttendancePercentage}%`],
        ['Reprovação', 'Limite de Negativas para Reprovação Directa', `>= ${criteria.reprobation.maxNegativeSubjectsToReprove} disciplinas`],
        ['Reprovação', 'Disciplinas Eliminatórias', criteria.reprobation.criticalSubjects.join(', ') || 'Nenhuma'],
        ['Transição', 'Transição com Deficiência', criteria.transition.allowsConditionalTransition ? `Permitida (Até ${criteria.transition.maxDeficienciesForTransition} disciplinas)` : 'Não Permitida'],
        ['Transição', 'Classes Terminais (Sem Deficiência)', criteria.transition.terminalClassesNoTransition.join(', ')],
        ['Recurso', 'Intervalo de Notas para Acesso', `De ${criteria.recurso.minAccessGrade} a ${criteria.recurso.maxAccessGrade} valores`],
        ['Recurso', 'Máximo de Disciplinas a Recurso', `${criteria.recurso.maxSubjectsAllowed} disciplinas`],
        ['Recurso', 'Fórmula da Classificação Final', criteria.recurso.finalGradeFormula === 'recurso_direct' ? 'Nota do Recurso substitui a Anual' : 'Média Ponderada / Simples'],
        ['Desistência', 'Faltas Contínuas para Risco de Abandono', `${criteria.abandonment.riskAbsenceCount} avaliações consecutivas`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 }
    });

    doc.save(`Regulamento_Criterios_Pedagogicos_${academicYear.replace('/', '_')}.pdf`);
    showToast('Regulamento pedagógico exportado em PDF!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Sliders size={26} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  Configurações Pedagógicas
                </h1>
                <p className="text-xs sm:text-sm font-medium text-neutral-500">
                  Critérios Oficiais de Avaliação, Transição, Reprovação, Desistência e Exames de Recurso
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons & Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {!isManager ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold">
                <Eye size={16} />
                <span>Modo Consulta Docente (Apenas Leitura)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">
                <ShieldCheck size={16} />
                <span>Gestor Escolar Autorizado</span>
              </div>
            )}

            <button
              onClick={exportCriteriaPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl text-xs font-bold transition-all active:scale-95"
            >
              <FileText size={16} />
              <span>Regulamento (PDF)</span>
            </button>

            {isManager && (
              <>
                <button
                  onClick={handleRestoreDefaults}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl text-xs font-bold transition-all active:scale-95"
                >
                  <RotateCcw size={16} />
                  <span>Restaurar MED</span>
                </button>

                <button
                  onClick={handleSaveCriteria}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  <Save size={16} />
                  <span>Gravar Critérios</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Multi-Institution & Educational Context Selector */}
        <div className="mt-8 pt-6 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400 mb-4">
            <Building size={16} className="text-blue-600" />
            <span>Contexto Pedagógico da Instituição ({schoolSettings?.nomeEscola || 'Escola Actual'})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Subsistema */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Subsistema de Ensino
              </label>
              <select
                disabled={!isManager}
                value={subsystem}
                onChange={(e) => setSubsystem(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500 disabled:opacity-75"
              >
                {SUBSYSTEMS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 2. Nível de Ensino */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Nível de Ensino
              </label>
              <select
                disabled={!isManager}
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500 disabled:opacity-75"
              >
                {EDUCATION_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {/* 3. Classe / Ano */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Classe ou Ano
              </label>
              <select
                disabled={!isManager}
                value={levelOrClass}
                onChange={(e) => setLevelOrClass(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500 disabled:opacity-75"
              >
                <option value="Todas as Classes do Nível">Todas as Classes do Nível</option>
                <option value="Iniciação">Iniciação</option>
                <option value="1ª Classe">1ª Classe</option>
                <option value="2ª Classe">2ª Classe</option>
                <option value="3ª Classe">3ª Classe</option>
                <option value="4ª Classe">4ª Classe</option>
                <option value="5ª Classe">5ª Classe</option>
                <option value="6ª Classe">6ª Classe (Terminal)</option>
                <option value="7ª Classe">7ª Classe</option>
                <option value="8ª Classe">8ª Classe</option>
                <option value="9ª Classe">9ª Classe (Terminal)</option>
                <option value="10ª Classe">10ª Classe</option>
                <option value="11ª Classe">11ª Classe</option>
                <option value="12ª Classe">12ª Classe (Terminal)</option>
                <option value="Módulo 1">Módulo 1 (EJA)</option>
                <option value="Módulo 2">Módulo 2 (EJA)</option>
                <option value="Módulo 3">Módulo 3 (EJA)</option>
              </select>
            </div>

            {/* 4. Curso */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Curso / Área
              </label>
              <select
                disabled={!isManager}
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500 disabled:opacity-75"
              >
                {COURSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 5. Ano Lectivo */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Ano Lectivo
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024/2025"
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500 disabled:opacity-75"
              />
            </div>

            {/* 6. Período de Avaliação */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Período Avaliado
              </label>
              <select
                disabled={!isManager}
                value={evaluationPeriod}
                onChange={(e) => setEvaluationPeriod(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500 disabled:opacity-75"
              >
                <option value="Anual / Final">Anual / Final</option>
                <option value="1º Trimestre">1º Trimestre</option>
                <option value="2º Trimestre">2º Trimestre</option>
                <option value="3º Trimestre">3º Trimestre</option>
                <option value="Exames">Exames Nacionais / Finais</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200/80">
        <button
          onClick={() => setActiveTab('aprovacao')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'aprovacao'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <CheckCircle size={16} className={activeTab === 'aprovacao' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>1. Critérios de Aprovação</span>
        </button>

        <button
          onClick={() => setActiveTab('reprovacao')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'reprovacao'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <XCircle size={16} className={activeTab === 'reprovacao' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>2. Critérios de Reprovação</span>
        </button>

        <button
          onClick={() => setActiveTab('transicao')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'transicao'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ArrowRightCircle size={16} className={activeTab === 'transicao' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>3. Critérios de Transição</span>
        </button>

        <button
          onClick={() => setActiveTab('desistencia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'desistencia'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <UserX size={16} className={activeTab === 'desistencia' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>4. Critérios de Desistência</span>
        </button>

        <button
          onClick={() => setActiveTab('recurso')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'recurso'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Repeat size={16} className={activeTab === 'recurso' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>5. Exames de Recurso</span>
          {allRecursoAdmittedStudents.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">
              {allRecursoAdmittedStudents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('simulador')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'simulador'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Sparkles size={16} className={activeTab === 'simulador' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>Simulador & Alunos</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'historico'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <History size={16} className={activeTab === 'historico' ? 'text-blue-600' : 'text-neutral-400'} />
          <span>6. Histórico</span>
        </button>
      </div>

      {/* TAB CONTENT 1: APROVAÇÃO */}
      {activeTab === 'aprovacao' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">Critérios Oficiais de Aprovação</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Regras de média ponderada, notas mínimas, arredondamento e condições de aprovação directa
              </p>
            </div>
            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
              Escala Oficial: {educationLevel === 'Ensino Primário' ? '0 a 10 valores' : '0 a 20 valores'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Média Mínima de Aprovação Geral
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  step="0.5"
                  min="0"
                  max="20"
                  value={criteria.approval.minGeneralAverage}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, minGeneralAverage: Number(e.target.value) }
                  })}
                  className="w-28 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-base font-black text-neutral-900 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500 font-bold">valores</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Padrão MED: 10 valores para Ensino Secundário (ou 5 valores para Ensino Primário).
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Nota Mínima por Disciplina
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  step="0.5"
                  min="0"
                  max="20"
                  value={criteria.approval.minSubjectGrade}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, minSubjectGrade: Number(e.target.value) }
                  })}
                  className="w-28 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-base font-black text-neutral-900 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500 font-bold">valores</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Notas abaixo deste limiar são contabilizadas como disciplinas negativas/em atraso.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Máximo de Negativas p/ Transição
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="0"
                  max="5"
                  value={criteria.approval.maxDeficienciesAllowed}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, maxDeficienciesAllowed: Number(e.target.value) }
                  })}
                  className="w-28 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-base font-black text-neutral-900 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500 font-bold">disciplinas</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Permitidas no 1º e 2º Ciclos em classes não terminais (até 2 disciplinas com deficiência).
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Regra de Arredondamento Oficial
              </label>
              <select
                disabled={!isManager}
                value={criteria.approval.roundingRule}
                onChange={(e) => setCriteria({
                  ...criteria,
                  approval: { ...criteria.approval, roundingRule: e.target.value as any }
                })}
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500"
              >
                <option value="matematico">Arredondamento Matemático (&gt;= 0.5 para cima)</option>
                <option value="truncatura">Truncatura Estrita (sem arredondamento)</option>
                <option value="teto">Arredondamento por Excesso</option>
              </select>
              <p className="text-[11px] text-neutral-500">
                Aplica-se às Médias Trimestrais (MT), Médias Finais (MF) e Pautas Oficiais.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Assiduidade Mínima Exigida
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="50"
                  max="100"
                  value={criteria.approval.minAttendancePercentage}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, minAttendancePercentage: Number(e.target.value) }
                  })}
                  className="w-28 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-base font-black text-neutral-900 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500 font-bold">% de aulas</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Percentagem mínima legal de frequência para poder comparecer às provas finais.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Máximo de Faltas Injustificadas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="5"
                  max="50"
                  value={criteria.approval.maxUnjustifiedAbsences}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, maxUnjustifiedAbsences: Number(e.target.value) }
                  })}
                  className="w-28 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-base font-black text-neutral-900 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500 font-bold">faltas</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Limite anual estabelecido pelo regulamento interno da instituição.
              </p>
            </div>
          </div>

          {/* Text Criteria Descriptions */}
          <div className="space-y-4 pt-4 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                Condições de Aprovação Directa
              </label>
              <textarea
                rows={2}
                disabled={!isManager}
                value={criteria.approval.directApprovalConditions}
                onChange={(e) => setCriteria({
                  ...criteria,
                  approval: { ...criteria.approval, directApprovalConditions: e.target.value }
                })}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                  Condições de Aprovação após Exame
                </label>
                <textarea
                  rows={2}
                  disabled={!isManager}
                  value={criteria.approval.examApprovalConditions}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, examApprovalConditions: e.target.value }
                  })}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                  Condições de Aprovação após Recurso
                </label>
                <textarea
                  rows={2}
                  disabled={!isManager}
                  value={criteria.approval.recursoApprovalConditions}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    approval: { ...criteria.approval, recursoApprovalConditions: e.target.value }
                  })}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: REPROVAÇÃO */}
      {activeTab === 'reprovacao' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">Critérios Oficiais de Reprovação</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Definição de regras que determinam a reprovação imediata por média, negativas ou excesso de faltas
              </p>
            </div>
            <div className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold">
              Cálculo Automático na Mini-Pauta & Pauta Final
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isManager}
                  checked={criteria.reprobation.belowMinAverageReprobes}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    reprobation: { ...criteria.reprobation, belowMinAverageReprobes: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Média Geral Inferior ao Mínimo
                </span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Se activado, o aluno com média global inferior a {criteria.approval.minGeneralAverage} valores reprova automaticamente.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Limite de Disciplinas Negativas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="1"
                  max="10"
                  value={criteria.reprobation.maxNegativeSubjectsToReprove}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    reprobation: { ...criteria.reprobation, maxNegativeSubjectsToReprove: Number(e.target.value) }
                  })}
                  className="w-28 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-base font-black text-neutral-900 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500 font-bold">ou mais disciplinas</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                No Ensino Geral, acumular 3 ou mais disciplinas negativas no ano lectivo dita a reprovação directa sem recurso.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isManager}
                  checked={criteria.reprobation.failByAbsences}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    reprobation: { ...criteria.reprobation, failByAbsences: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Reprovação por Excesso de Faltas
                </span>
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  disabled={!isManager || !criteria.reprobation.failByAbsences}
                  min="10"
                  max="50"
                  value={criteria.reprobation.maxAbsencePercentage}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    reprobation: { ...criteria.reprobation, maxAbsencePercentage: Number(e.target.value) }
                  })}
                  className="w-20 px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-sm font-bold text-neutral-900 outline-none"
                />
                <span className="text-xs text-neutral-500 font-bold">% de faltas no ano</span>
              </div>
            </div>
          </div>

          {/* Critical / Eliminatory Subjects */}
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
            <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
              Disciplinas Nucleares Eliminatórias (Negativa Directa = Reprovação)
            </label>
            <p className="text-[11px] text-neutral-500">
              Disciplinas em que o insucesso impede a transição ou o recurso (ex: Língua Portuguesa no Primário ou Matemática no curso de Ciências):
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Língua Portuguesa', 'Matemática', 'Física', 'Química', 'Biologia', 'Inglês', 'História'].map(subj => {
                const isSelected = criteria.reprobation.criticalSubjects.includes(subj);
                return (
                  <button
                    key={subj}
                    type="button"
                    disabled={!isManager}
                    onClick={() => {
                      if (!isManager) return;
                      const next = isSelected
                        ? criteria.reprobation.criticalSubjects.filter(s => s !== subj)
                        : [...criteria.reprobation.criticalSubjects, subj];
                      setCriteria({
                        ...criteria,
                        reprobation: { ...criteria.reprobation, criticalSubjects: next }
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {subj} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                Condições de Reprovação após Exame
              </label>
              <textarea
                rows={2}
                disabled={!isManager}
                value={criteria.reprobation.examFailConditions}
                onChange={(e) => setCriteria({
                  ...criteria,
                  reprobation: { ...criteria.reprobation, examFailConditions: e.target.value }
                })}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                Condições de Reprovação Definitiva após Recurso
              </label>
              <textarea
                rows={2}
                disabled={!isManager}
                value={criteria.reprobation.recursoFailConditions}
                onChange={(e) => setCriteria({
                  ...criteria,
                  reprobation: { ...criteria.reprobation, recursoFailConditions: e.target.value }
                })}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TRANSIÇÃO */}
      {activeTab === 'transicao' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">Critérios de Transição de Ano / Nível</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Regras de transição condicionada, disciplinas em atraso e impedimentos em classes terminais
              </p>
            </div>
            <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
              Deficiências e Dependências
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isManager}
                  checked={criteria.transition.allowsConditionalTransition}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    transition: { ...criteria.transition, allowsConditionalTransition: e.target.checked }
                  })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Permitir Transição Condicionada (c/ Disciplinas em Atraso)
                </span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Permite ao aluno transitar para a classe seguinte devendo realizar a regularização curricular de disciplinas em deficiência.
              </p>

              {criteria.transition.allowsConditionalTransition && (
                <div className="pt-2 border-t border-neutral-200/60">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Número Máximo de Deficiências Permitidas:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      disabled={!isManager}
                      min="1"
                      max="3"
                      value={criteria.transition.maxDeficienciesForTransition}
                      onChange={(e) => setCriteria({
                        ...criteria,
                        transition: { ...criteria.transition, maxDeficienciesForTransition: Number(e.target.value) }
                      })}
                      className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                    />
                    <span className="text-xs text-neutral-500 font-bold">disciplinas</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                Classes Terminais (Proibida Transição c/ Deficiência)
              </label>
              <p className="text-[11px] text-neutral-500">
                Nas classes terminais de ciclo, a aprovação deve ser plena para obtenção do certificado ou diploma:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['6ª Classe', '9ª Classe', '12ª Classe', '13ª Classe'].map(cls => {
                  const isChecked = criteria.transition.terminalClassesNoTransition.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      disabled={!isManager}
                      onClick={() => {
                        if (!isManager) return;
                        const next = isChecked
                          ? criteria.transition.terminalClassesNoTransition.filter(c => c !== cls)
                          : [...criteria.transition.terminalClassesNoTransition, cls];
                        setCriteria({
                          ...criteria,
                          transition: { ...criteria.transition, terminalClassesNoTransition: next }
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isChecked
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-neutral-700 border border-neutral-300'
                      }`}
                    >
                      {cls} {isChecked && '🔒'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                Prazo Oficial para Regularização de Deficiências
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={criteria.transition.deficiencyResolutionDeadline}
                onChange={(e) => setCriteria({
                  ...criteria,
                  transition: { ...criteria.transition, deficiencyResolutionDeadline: e.target.value }
                })}
                placeholder="Ex: Até ao final do 1º Trimestre do ano lectivo subsequente"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider mb-2">
                Instruções Pedagógicas / Observações da Pauta
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={criteria.transition.notes}
                onChange={(e) => setCriteria({
                  ...criteria,
                  transition: { ...criteria.transition, notes: e.target.value }
                })}
                placeholder="Ex: O aluno frequenta a classe superior com obrigatoriedade de acompanhamento"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 outline-none focus:border-blue-500 font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: DESISTÊNCIA */}
      {activeTab === 'desistencia' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">Critérios de Acompanhamento e Desistência</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Monitorização contínua de alunos em risco de abandono escolar vs desistência administrativamente confirmada
              </p>
            </div>
            <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">
              Prevenção do Abandono Escolar
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-wider">
                <AlertTriangle size={18} />
                <span>Aluno em Risco de Abandono</span>
              </div>
              <label className="block text-xs font-bold text-neutral-700">
                Faltas Consecutivas a Avaliações Contínuas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="1"
                  max="5"
                  value={criteria.abandonment.riskAbsenceCount}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    abandonment: { ...criteria.abandonment, riskAbsenceCount: Number(e.target.value) }
                  })}
                  className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                />
                <span className="text-xs text-neutral-500 font-bold">avaliações (MAC/NPT)</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Dispara o alerta pedagógico preventivo para contacto imediato com o encarregado de educação.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-wider">
                <AlertTriangle size={18} />
                <span>Ausência Consecutiva em Dias</span>
              </div>
              <label className="block text-xs font-bold text-neutral-700">
                Dias Úteis sem Frequência
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="5"
                  max="60"
                  value={criteria.abandonment.riskConsecutiveDays}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    abandonment: { ...criteria.abandonment, riskConsecutiveDays: Number(e.target.value) }
                  })}
                  className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                />
                <span className="text-xs text-neutral-500 font-bold">dias seguidos</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Limite de faltas sem justificação prévia que coloca o aluno no radar de evasão.
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-wider">
                <UserX size={18} />
                <span>Aluno Desistente Confirmado</span>
              </div>
              <label className="block text-xs font-bold text-neutral-700">
                Total de Faltas Injustificadas Acumuladas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  disabled={!isManager}
                  min="15"
                  max="90"
                  value={criteria.abandonment.confirmedDropAbsenceCount}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    abandonment: { ...criteria.abandonment, confirmedDropAbsenceCount: Number(e.target.value) }
                  })}
                  className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                />
                <span className="text-xs text-neutral-500 font-bold">faltas anuais</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Alunos com ausência prolongada ou confirmação administrativa da família.
              </p>
            </div>
          </div>

          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-neutral-800 uppercase tracking-wider block">
                Exigência de Parecer Administrativo para Cancelamento de Matrícula
              </span>
              <p className="text-xs text-neutral-500">
                Garante que nenhum aluno é removido das listas oficiais sem despacho assinado da Direcção Municipal ou Pedagógica.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isManager}
                checked={criteria.abandonment.administrativeConfirmationRequired}
                onChange={(e) => setCriteria({
                  ...criteria,
                  abandonment: { ...criteria.abandonment, administrativeConfirmationRequired: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: EXAMES DE RECURSO */}
      {activeTab === 'recurso' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-neutral-900">Critérios Oficiais para Exames de Recurso</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Parametrização de notas de acesso, disciplinas elegíveis, fórmula de cálculo e calendário oficial
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                  Elegibilidade Automática
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                  Nota Mínima de Acesso ao Recurso
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    disabled={!isManager}
                    step="0.5"
                    min="0"
                    max="10"
                    value={criteria.recurso.minAccessGrade}
                    onChange={(e) => setCriteria({
                      ...criteria,
                      recurso: { ...criteria.recurso, minAccessGrade: Number(e.target.value) }
                    })}
                    className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                  />
                  <span className="text-xs text-neutral-500 font-bold">valores</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Notas inferiores a este limite (ex: &lt; 7.00) causam reprovação directa sem direito a recurso.
                </p>
              </div>

              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                  Nota Máxima de Acesso ao Recurso
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    disabled={!isManager}
                    step="0.1"
                    min="0"
                    max="10"
                    value={criteria.recurso.maxAccessGrade}
                    onChange={(e) => setCriteria({
                      ...criteria,
                      recurso: { ...criteria.recurso, maxAccessGrade: Number(e.target.value) }
                    })}
                    className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                  />
                  <span className="text-xs text-neutral-500 font-bold">valores</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Normalmente 9.4 valores (abaixo da média de aprovação de 10 valores).
                </p>
              </div>

              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                  Máximo de Disciplinas a Recurso
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    disabled={!isManager}
                    min="1"
                    max="4"
                    value={criteria.recurso.maxSubjectsAllowed}
                    onChange={(e) => setCriteria({
                      ...criteria,
                      recurso: { ...criteria.recurso, maxSubjectsAllowed: Number(e.target.value) }
                    })}
                    className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                  />
                  <span className="text-xs text-neutral-500 font-bold">disciplinas</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Alunos com mais de 2 negativas não são admitidos a exame de recurso.
                </p>
              </div>

              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                  Nota Mínima p/ Aprovação
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    disabled={!isManager}
                    step="0.5"
                    min="0"
                    max="20"
                    value={criteria.recurso.minPassingGrade}
                    onChange={(e) => setCriteria({
                      ...criteria,
                      recurso: { ...criteria.recurso, minPassingGrade: Number(e.target.value) }
                    })}
                    className="w-24 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm font-black text-neutral-900 outline-none"
                  />
                  <span className="text-xs text-neutral-500 font-bold">valores</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Classificação mínima na prova de recurso para transição de ano.
                </p>
              </div>
            </div>

            {/* Formula & Calendar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                  Fórmula de Cálculo da Nota Final de Recurso
                </label>
                <select
                  disabled={!isManager}
                  value={criteria.recurso.finalGradeFormula}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    recurso: { ...criteria.recurso, finalGradeFormula: e.target.value as any }
                  })}
                  className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 outline-none focus:border-blue-500"
                >
                  <option value="recurso_direct">Nota do Recurso Substitui a Nota Anual (se &gt;= 10)</option>
                  <option value="ponderada_40_60">Média Ponderada: (40% Anual + 60% Recurso)</option>
                  <option value="media_simples">Média Aritmética Simples: (Anual + Recurso) / 2</option>
                </select>
                <p className="text-[11px] text-neutral-500">
                  Define como a classificação final da disciplina é registada na pauta de recurso.
                </p>
              </div>

              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <label className="block text-xs font-black text-neutral-700 uppercase tracking-wider">
                  Calendário e Inscrição no Recurso
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Início:</span>
                    <input
                      type="date"
                      disabled={!isManager}
                      value={criteria.recurso.startDate}
                      onChange={(e) => setCriteria({
                        ...criteria,
                        recurso: { ...criteria.recurso, startDate: e.target.value }
                      })}
                      className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Término:</span>
                    <input
                      type="date"
                      disabled={!isManager}
                      value={criteria.recurso.endDate}
                      onChange={(e) => setCriteria({
                        ...criteria,
                        recurso: { ...criteria.recurso, endDate: e.target.value }
                      })}
                      className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Prazo Limite:</span>
                    <input
                      type="date"
                      disabled={!isManager}
                      value={criteria.recurso.registrationDeadline}
                      onChange={(e) => setCriteria({
                        ...criteria,
                        recurso: { ...criteria.recurso, registrationDeadline: e.target.value }
                      })}
                      className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC LIST OF ADMITTED STUDENTS TO RECURSO */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-neutral-900">
                    Alunos Identificados Automaticamente para Exame de Recurso
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-black">
                    {allRecursoAdmittedStudents.length} Alunos
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Com base no cruzamento das notas actuais com os critérios de recurso em vigor (Notas {criteria.recurso.minAccessGrade} a {criteria.recurso.maxAccessGrade})
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou turma..."
                    value={recursoSearchTerm}
                    onChange={(e) => setRecursoSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 outline-none w-56 focus:w-64 transition-all"
                  />
                </div>

                <button
                  onClick={exportRecursoExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Download size={14} />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {allRecursoAdmittedStudents.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200/80">
                <CheckCircle size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-neutral-700">Nenhum aluno em situação de recurso identificado</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Todos os alunos avaliados encontram-se ou aprovados ou ainda não possuem notas lançadas suficientes neste nível.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 text-white font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nº</th>
                      <th className="py-3 px-4">Nome do Aluno</th>
                      <th className="py-3 px-4">BI / Processo</th>
                      <th className="py-3 px-4">Turma & Nível</th>
                      <th className="py-3 px-4">Média Anual</th>
                      <th className="py-3 px-4">Disciplinas a Recurso</th>
                      <th className="py-3 px-4 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {allRecursoAdmittedStudents.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 text-neutral-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900">{item.student.name}</td>
                        <td className="py-3 px-4 text-neutral-600">{item.student.bi || item.student.id}</td>
                        <td className="py-3 px-4 text-neutral-700">
                          <span className="font-bold">{item.classItem.name}</span>
                          <span className="text-[10px] text-neutral-400 block">{item.classItem.level}</span>
                        </td>
                        <td className="py-3 px-4 font-black text-neutral-900">{item.average} v</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.negativeSubjects.map((ns, i) => (
                              <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold border border-amber-200">
                                {ns.subject} ({ns.grade}v)
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black">
                            <Repeat size={12} />
                            Admitido ao Recurso
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: SIMULADOR DE RESULTADOS POR TURMA */}
      {activeTab === 'simulador' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">Simulador de Resultados Académicos em Tempo Real</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Verifique como os critérios activos calculam a situação final de cada aluno na sua turma
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-neutral-600">Turma a Simular:</label>
              <select
                value={simulationClassId}
                onChange={(e) => setSimulationClassId(e.target.value)}
                className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-black text-neutral-800 outline-none"
              >
                {schoolClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Summary Cards */}
          {(() => {
            const evaluated = simulationStudents.map(st => evaluateStudentStatus(st, simulationClass));
            const aprovados = evaluated.filter(e => e.status === 'Aprovado Directo').length;
            const condicionados = evaluated.filter(e => e.status === 'Transita c/ Deficiência').length;
            const recursos = evaluated.filter(e => e.status === 'Admitido a Recurso').length;
            const reprovados = evaluated.filter(e => e.status === 'Reprovado').length;
            const desistentes = evaluated.filter(e => e.status === 'Desistente Confirmado').length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Aprovados Directos</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{aprovados}</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Transita c/ Deficiência</span>
                  <p className="text-2xl font-black text-blue-700 mt-1">{condicionados}</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Admitidos a Recurso</span>
                  <p className="text-2xl font-black text-amber-700 mt-1">{recursos}</p>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Reprovados</span>
                  <p className="text-2xl font-black text-rose-700 mt-1">{reprovados}</p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Desistentes</span>
                  <p className="text-2xl font-black text-purple-700 mt-1">{desistentes}</p>
                </div>
              </div>
            );
          })()}

          {/* Table of Simulated Students */}
          <div className="overflow-x-auto rounded-2xl border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-white font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nº</th>
                  <th className="py-3 px-4">Nome do Aluno</th>
                  <th className="py-3 px-4">Média Calculada</th>
                  <th className="py-3 px-4">Negativas Detectadas</th>
                  <th className="py-3 px-4 text-center">Situação Académica Calculada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {simulationStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-400 font-bold">
                      Nenhum aluno matriculado nesta turma.
                    </td>
                  </tr>
                ) : (
                  simulationStudents.map((st, idx) => {
                    const result = evaluateStudentStatus(st, simulationClass);
                    let badgeClass = 'bg-neutral-100 text-neutral-700';
                    if (result.status === 'Aprovado Directo') badgeClass = 'bg-emerald-100 text-emerald-800 font-black';
                    if (result.status === 'Transita c/ Deficiência') badgeClass = 'bg-blue-100 text-blue-800 font-black';
                    if (result.status === 'Admitido a Recurso') badgeClass = 'bg-amber-100 text-amber-800 font-black';
                    if (result.status === 'Reprovado') badgeClass = 'bg-rose-100 text-rose-800 font-black';
                    if (result.status === 'Desistente Confirmado') badgeClass = 'bg-purple-100 text-purple-800 font-black';

                    return (
                      <tr key={st.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4 text-neutral-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900">{st.name}</td>
                        <td className="py-3 px-4 font-black text-neutral-900">{result.average} v</td>
                        <td className="py-3 px-4">
                          {result.negativeSubjects.length === 0 ? (
                            <span className="text-emerald-600 font-bold text-[11px]">Nenhuma negativa</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {result.negativeSubjects.map((ns, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-bold">
                                  {ns.subject}: {ns.grade}v
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] ${badgeClass}`}>
                            {result.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: HISTÓRICO DE CONFIGURAÇÕES */}
      {activeTab === 'historico' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-neutral-900">Histórico de Alterações Pedagógicas</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Rastreabilidade de versões anteriores, autoria das modificações e opção de restauro
              </p>
            </div>
            <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold">
              {historyLogs.length} Registos
            </span>
          </div>

          <div className="space-y-4">
            {historyLogs.map((log) => (
              <div
                key={log.id}
                className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-neutral-900">{log.summary}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold">
                      {log.userRole}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">{log.details}</p>
                  <p className="text-[11px] text-neutral-400">
                    Modificado em {new Date(log.timestamp).toLocaleString('pt-AO')} por <span className="font-bold text-neutral-600">{log.userName}</span> ({log.userEmail})
                  </p>
                </div>

                {isManager && (
                  <button
                    onClick={() => handleRestoreFromHistory(log)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap self-start md:self-center"
                  >
                    <RotateCcw size={14} />
                    <span>Restaurar Esta Versão</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
