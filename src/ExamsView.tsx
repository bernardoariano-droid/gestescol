import React, { useState, useEffect } from 'react';
import { BookOpen, FileSpreadsheet, Printer, Save, CheckCircle, AlertCircle, Award } from 'lucide-react';
import { Class, Student, Grade, SchoolSettings } from './types';
import { isExamClass, calculateMT, calculateAnnual } from './App';
import * as XLSX from 'xlsx';

interface ExamsViewProps {
  classes: Class[];
  students: Student[];
  grades?: Grade[];
  onUpdateGrades?: (newGrades: Grade[]) => void;
  schoolSettings?: SchoolSettings;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser?: any;
}

export function ExamsView({
  classes,
  students,
  grades = [],
  onUpdateGrades,
  schoolSettings,
  showToast,
  currentUser
}: ExamsViewProps) {
  const notify = showToast || ((msg: string) => alert(msg));

  // Filter available classes
  const availableClasses = currentUser?.role === 'Professor'
    ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
    : classes;

  // Filter exam classes by default (6ª, 9ª, 12ª) or show all with indicator
  const examClasses = availableClasses.filter(c => isExamClass(c.level));
  const defaultClassId = examClasses[0]?.id || availableClasses[0]?.id || '';

  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId);
  const selectedClass = availableClasses.find(c => c.id === selectedClassId);
  const subjects = selectedClass?.subjects && selectedClass.subjects.length > 0 
    ? selectedClass.subjects 
    : ['Língua Portuguesa', 'Matemática', 'Ciências'];

  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || '');
  const [localExamNotes, setLocalExamNotes] = useState<Record<string, number>>({});
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Sync subject when class changes
  useEffect(() => {
    if (subjects.length > 0 && (!selectedSubject || !subjects.includes(selectedSubject))) {
      setSelectedSubject(subjects[0]);
    }
  }, [selectedClassId, subjects, selectedSubject]);

  const classStudents = students
    .filter(s => s.classId === selectedClassId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const isExamLevel = isExamClass(selectedClass?.level);
  const isPrimary = (selectedClass?.level || '').match(/^[1-6]ª Classe/);
  const maxScale = isPrimary ? 10 : 20;
  const threshold = isPrimary ? 5 : 10;

  // Helper to fetch grade from props
  const getGradeValue = (studentId: string, sub: string, period: string, type: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3' | 'Exame') => {
    if (type === 'Exame' || period === 'Exame') {
      const g = grades.find(x => x.studentId === studentId && x.subjectId === sub && (x.type === 'Exame' || x.period === 'Exame'));
      if (g) return g.value;
      const gWithNota = grades.find(x => x.studentId === studentId && x.subjectId === sub && x.notaExame !== undefined);
      if (gWithNota && gWithNota.notaExame !== undefined) return gWithNota.notaExame;
    }
    const found = grades.find(x => x.studentId === studentId && x.subjectId === sub && x.period === period && x.type === type);
    return found ? found.value : 0;
  };

  // Populate localExamNotes when selection or grades change
  useEffect(() => {
    const initialNotes: Record<string, number> = {};
    classStudents.forEach(st => {
      const g = getGradeValue(st.id, selectedSubject, 'Exame', 'Exame');
      initialNotes[st.id] = g || 0;
    });
    setLocalExamNotes(initialNotes);
    setIsSaved(true);
  }, [selectedClassId, selectedSubject, grades]);

  const handleNoteChange = (studentId: string, val: number) => {
    const clamped = Math.min(maxScale, Math.max(0, val));
    setLocalExamNotes(prev => ({
      ...prev,
      [studentId]: clamped
    }));
    setIsSaved(false);
  };

  const handleSaveAll = () => {
    if (!onUpdateGrades) {
      notify('Função de guardar indisponível.', 'error');
      return;
    }

    const newGradeEntries: Grade[] = [];
    classStudents.forEach(st => {
      const note = localExamNotes[st.id] ?? 0;
      newGradeEntries.push({
        studentId: st.id,
        subjectId: selectedSubject,
        period: 'Exame',
        type: 'Exame',
        value: note,
        notaExame: note,
        schoolId: selectedClass?.schoolId
      });
      // Also provide compatibility with NPT under Exame period
      newGradeEntries.push({
        studentId: st.id,
        subjectId: selectedSubject,
        period: 'Exame',
        type: 'NPT',
        value: note,
        notaExame: note,
        schoolId: selectedClass?.schoolId
      });
    });

    onUpdateGrades(newGradeEntries);
    setIsSaved(true);
    notify('Notas de exame guardadas e sincronizadas com sucesso!', 'success');
  };

  const handleExportExcel = () => {
    if (!selectedClass) return;

    const data = classStudents.map((st, idx) => {
      const mt1 = calculateMT(st.id, selectedSubject, '1º Trimestre', getGradeValue, selectedClass.level);
      const mt2 = calculateMT(st.id, selectedSubject, '2º Trimestre', getGradeValue, selectedClass.level);
      const mt3 = calculateMT(st.id, selectedSubject, '3º Trimestre', getGradeValue, selectedClass.level);
      const examGrade = localExamNotes[st.id] ?? 0;
      const getLocalOrCurrent = (sId: string, sub: string, p: string, t?: any) => {
        if (sId === st.id && sub === selectedSubject && (p === 'Exame' || t === 'Exame')) {
          return examGrade;
        }
        return getGradeValue(sId, sub, p, t || 'MAC');
      };
      const mfd = calculateAnnual(st.id, selectedSubject, getLocalOrCurrent, selectedClass.level);
      const isApproved = mfd >= threshold;

      return {
        'Nº': idx + 1,
        'Processo': st.bi || st.id.substring(0, 8).toUpperCase(),
        'Nome Completo': st.name,
        'Turma': selectedClass.name,
        'Disciplina': selectedSubject,
        'MT1': mt1.toFixed(1),
        'MT2': mt2.toFixed(1),
        'MT3 (CAP)': mt3.toFixed(1),
        'Nota de Exame': examGrade > 0 ? examGrade.toFixed(1) : '-',
        'Média Final (MFD)': mfd.toFixed(1),
        'Resultado': isApproved ? 'Aprovado' : 'Reprovado'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exames");
    XLSX.writeFile(wb, `Exames_${selectedClass.name.replace(/ /g, '_')}_${selectedSubject}.xlsx`);
  };

  // KPIs
  const evaluatedCount = classStudents.filter(st => (localExamNotes[st.id] ?? 0) > 0).length;
  const examSum = classStudents.reduce((acc, st) => acc + (localExamNotes[st.id] ?? 0), 0);
  const examAvg = evaluatedCount > 0 ? (examSum / evaluatedCount).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Turma (Classes de Exame)</p>
            <select 
              value={selectedClassId} 
              onChange={e => setSelectedClassId(e.target.value)} 
              className="bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer text-base"
            >
              {availableClasses.map((c, i) => (
                <option key={`${c.id}-${i}`} value={c.id}>
                  {c.name} {isExamClass(c.level) ? '⭐ (Exame)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-8 bg-neutral-100 hidden lg:block" />

          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disciplina</p>
            <select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)} 
              className="bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer text-base"
            >
              {subjects.map((s, i) => (
                <option key={`${s}-${i}`} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-8 bg-neutral-100 hidden lg:block" />

          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Escala Oficial</p>
            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 rounded-xl text-xs font-black uppercase tracking-wider border border-amber-200">
              0 a {maxScale} valores (Aprovação: ≥ {threshold})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-50 text-emerald-700 px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-100 transition-all active:scale-95 text-sm"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-neutral-100 text-neutral-700 px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 text-sm"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button 
            onClick={handleSaveAll}
            className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
              isSaved 
                ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 animate-pulse'
            }`}
          >
            <Save size={18} />
            {isSaved ? 'Notas Guardadas' : 'Guardar Notas de Exame'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Alunos Inscritos</p>
            <h4 className="text-2xl font-black text-neutral-900">{classStudents.length}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Exames Lançados</p>
            <h4 className="text-2xl font-black text-neutral-900">{evaluatedCount} de {classStudents.length}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Média dos Exames</p>
            <h4 className="text-2xl font-black text-neutral-900">{examAvg} / {maxScale}</h4>
          </div>
        </div>
      </div>

      {/* Warning for non-exam class */}
      {!isExamLevel && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-sm font-bold">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <span>
            Atenção: A turma selecionada ({selectedClass?.name} - {selectedClass?.level}) não é uma classe terminal de exame oficial (6ª, 9ª ou 12ª Classe). A fórmula de exame (0.6 × CAP + 0.4 × Exame) aplica-se primordialmente às 6ª, 9ª e 12ª Classes.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden p-6 sm:p-10">
        <div className="border-b border-neutral-100 bg-neutral-50/40 rounded-3xl p-6 mb-8 text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 uppercase tracking-tight">
            Pauta de Exames Nacionais: {selectedSubject}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-neutral-500 uppercase tracking-widest">
            <span>Turma: {selectedClass?.name}</span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full" />
            <span>Nível: {selectedClass?.level}</span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full" />
            <span>Fórmula: MFD = (0.6 × MT3/CAP) + (0.4 × Exame)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-4 py-4 text-center text-xs font-black text-neutral-500 uppercase">Nº</th>
                <th className="px-6 py-4 text-xs font-black text-neutral-700 uppercase">Nome do Aluno</th>
                <th className="px-3 py-4 text-center text-xs font-bold text-neutral-400 uppercase">MT1</th>
                <th className="px-3 py-4 text-center text-xs font-bold text-neutral-400 uppercase">MT2</th>
                <th className="px-3 py-4 text-center text-xs font-black text-neutral-600 uppercase bg-neutral-100/50">MT3 (CAP)</th>
                <th className="px-4 py-4 text-center text-xs font-black text-amber-800 uppercase bg-amber-100/50">Nota de Exame</th>
                <th className="px-4 py-4 text-center text-xs font-black text-emerald-800 uppercase bg-emerald-100/50">Média Final (MFD)</th>
                <th className="px-4 py-4 text-center text-xs font-black text-neutral-600 uppercase">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {classStudents.map((student, idx) => {
                const mt1 = calculateMT(student.id, selectedSubject, '1º Trimestre', getGradeValue, selectedClass?.level);
                const mt2 = calculateMT(student.id, selectedSubject, '2º Trimestre', getGradeValue, selectedClass?.level);
                const mt3 = calculateMT(student.id, selectedSubject, '3º Trimestre', getGradeValue, selectedClass?.level);
                const examVal = localExamNotes[student.id] ?? 0;

                const getLocalOrCurrent = (sId: string, sub: string, p: string, t?: any) => {
                  if (sId === student.id && sub === selectedSubject && (p === 'Exame' || t === 'Exame')) {
                    return examVal;
                  }
                  return getGradeValue(sId, sub, p, t || 'MAC');
                };

                const mfd = calculateAnnual(student.id, selectedSubject, getLocalOrCurrent, selectedClass?.level);
                const isApproved = mfd >= threshold;

                return (
                  <tr key={student.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-4 py-4 text-center font-bold text-neutral-400 text-sm">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-black text-neutral-900 text-sm">{student.name}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{student.bi}</p>
                    </td>
                    <td className="px-3 py-4 text-center font-bold text-neutral-600 text-sm">
                      {mt1.toFixed(1)}
                    </td>
                    <td className="px-3 py-4 text-center font-bold text-neutral-600 text-sm">
                      {mt2.toFixed(1)}
                    </td>
                    <td className="px-3 py-4 text-center font-black text-neutral-800 text-sm bg-neutral-50">
                      {mt3.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-center bg-amber-50/30">
                      <input 
                        type="number"
                        min="0"
                        max={maxScale}
                        step="0.1"
                        value={examVal === 0 ? '' : examVal}
                        placeholder="0.0"
                        onChange={e => handleNoteChange(student.id, Number(e.target.value))}
                        className={`w-20 p-2 text-center font-black text-base rounded-xl border outline-none transition-all shadow-sm ${
                          examVal >= threshold 
                            ? 'bg-white border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500' 
                            : 'bg-rose-50/50 border-rose-300 text-rose-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-4 text-center bg-emerald-50/30">
                      <span className={`text-base font-black ${isApproved ? 'text-emerald-950 font-black' : 'text-rose-600 font-black'}`}>
                        {mfd.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isApproved ? 'Aprovado' : 'Reprovado'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
