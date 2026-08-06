import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  UserRound, 
  Settings, 
  Menu, 
  X,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarDays,
  FileDown,
  FileSpreadsheet,
  Pencil,
  Printer,
  Check,
  Layers,
  Trash2,
  Phone,
  MapPin,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  LogOut,
  Eye,
  EyeOff,
  Edit,
  Award,
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  UserCog,
  Database,
  Download,
  School as SchoolIcon,
  Megaphone,
  ShieldAlert,
  Archive,
  Bot,
  Sparkles,
  History,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy
} from 'lucide-react';
import { SchoolsView } from './SchoolsView';
import { ProfileView } from './ProfileView';
import { ImportStudentsModal } from './ImportStudentsModal';
import { AnnouncementsView } from './AnnouncementsView';
import { ExamsView } from './ExamsView';
import { TransfersView } from './TransfersView';
import { CalendarView } from './CalendarView';
import { ArchiveView } from './ArchiveView';
import { AiAssistantView } from './AiAssistantView';
import { PaymentModal } from './PaymentModal';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Student, Class, Teacher, Payment, Grade, CertificateTemplate, TeacherAssignment, SystemUser, Expense, School, Announcement, AuditLog } from './types';
import { authService } from './auth';
import { pushItemToSupabase, pushItemToSupabaseWithRetry, validateAndCleanSyncQueue, pullFromSupabase, SUPABASE_SQL_SCHEMA, testConnection, clearAllSupabaseData, performFullBackup, SUPABASE_URL, supabase } from './supabase';
import { INITIAL_STUDENTS, INITIAL_CLASSES, INITIAL_TEACHERS, INITIAL_PAYMENTS, MONTHS, INITIAL_USERS, INITIAL_EXPENSES, INITIAL_SCHOOLS } from './constants';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'dashboard' | 'ai-assistant' | 'students' | 'academic' | 'finance' | 'teachers' | 'classes' | 'lists' | 'mini-pautas' | 'pauta-final' | 'boletim' | 'certificates' | 'settings' | 'users' | 'backup' | 'schools' | 'profile' | 'announcements' | 'calendar' | 'archive' | 'exams' | 'transfers' | 'audit';

const LEVELS = ['Todos', '1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe', '6ª Classe', '7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe', '11ª Classe', '12ª Classe', 'EJA'];

const getSubjectsByLevel = (level: string, course?: string) => {
  if (level.match(/^[1-4]ª Classe/)) {
    return [
      'Língua Portuguesa', 
      'Matemática', 
      'Estudo do Meio', 
      'Educação Física', 
      'Educação Moral e Cívica', 
      'Educação Manual e Plástica'
    ];
  }
  if (level.match(/^[5-6]ª Classe/)) {
    return [
      'Língua Portuguesa', 
      'Matemática', 
      'Ciências da Natureza', 
      'História', 
      'Geografia', 
      'Educação Física', 
      'Educação Moral e Cívica', 
      'Educação Visual e Plástica', 
      'Educação Musical'
    ];
  }
  if (level.match(/^[7-9]ª Classe/)) {
    return [
      'Língua Portuguesa', 
      'Inglês', 
      'Matemática', 
      'Biologia', 
      'Física', 
      'Química', 
      'Geografia', 
      'História', 
      'Educação Moral e Cívica', 
      'Educação Física', 
      'Educação Visual e Plástica', 
      'Educação Laboral'
    ];
  }
  if (level.match(/^(10ª|11ª|12ª) Classe/)) {
    const commonCore = [
      'Língua Portuguesa', 
      'Língua Estrangeira (Inglês)', 
      'Informática', 
      'Educação Física', 
      'Filosofia', 
      'Matemática'
    ];

    if (course === 'Ciências Físicas e Biológicas') {
      return [...commonCore, 'Física', 'Química', 'Biologia', 'Geologia'];
    }
    if (course === 'Ciências Jurídicas e Económicas') {
      return [...commonCore, 'Introdução ao Direito', 'Economia', 'Geografia', 'História'];
    }
    if (course === 'Ciências Sociais') {
      return [...commonCore, 'Psicologia', 'Sociologia', 'Geografia', 'História'];
    }
    
    // Default or Geral
    return [
      ...commonCore,
      'Física', 'Química', 'Biologia', 'Geologia', 'História', 'Geografia', 'Psicologia', 'Economia', 'Introdução ao Direito'
    ];
  }
  if (level === 'EJA') {
    return [
      'Língua Portuguesa', 
      'Matemática', 
      'Ciências da Natureza', 
      'História', 
      'Geografia', 
      'Educação Moral e Cívica'
    ];
  }
  return ['Língua Portuguesa', 'Matemática', 'Ciências'];
};

const getSubjectsForClass = (cls?: Class) => {
  if (!cls) return [];
  if (cls.subjects && cls.subjects.length > 0) return cls.subjects;
  return getSubjectsByLevel(cls.level, cls.course);
};

const isExamClass = (level: string = '') => {
  return !!level.match(/6ª Classe|9ª Classe|12ª Classe/i);
};

export const calculateMT = (studentId: string, subjectId: string, period: string, getGradeFunc: (s: string, sub: string, p: string, t: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number, level: string = '') => {
  if (isExamClass(level) && period === '3º Trimestre') {
    const mt1 = calculateMT(studentId, subjectId, '1º Trimestre', getGradeFunc, level);
    const mt2 = calculateMT(studentId, subjectId, '2º Trimestre', getGradeFunc, level);
    const mac3 = getGradeFunc(studentId, subjectId, '3º Trimestre', 'MAC');
    return (mt1 + mt2 + mac3) / 3;
  }
  
  const mac = getGradeFunc(studentId, subjectId, period, 'MAC');
  const npt = getGradeFunc(studentId, subjectId, period, 'NPT');
  return (mac + npt) / 2;
};

export const calculateAnnual = (studentId: string, subjectId: string, getGradeFunc: (s: string, sub: string, p: string, t: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number, level: string = '') => {
  const mt1 = calculateMT(studentId, subjectId, '1º Trimestre', getGradeFunc, level);
  const mt2 = calculateMT(studentId, subjectId, '2º Trimestre', getGradeFunc, level);
  const mt3 = calculateMT(studentId, subjectId, '3º Trimestre', getGradeFunc, level);
  
  if (isExamClass(level)) {
    const en = getGradeFunc(studentId, subjectId, 'Exame', 'NPT');
    return (0.6 * mt3) + (0.4 * en);
  }
  
  return (mt1 + mt2 + mt3) / 3;
};

const getGradeScale = (level: string) => {
  if (level.match(/^[1-6]ª Classe/) || level.includes('EJA') || level.includes('Ensino Primário')) {
    return { max: 10, threshold: 5 };
  }
  return { max: 20, threshold: 10 };
};

export const generateUnifiedClassPautasPDF = (
  selectedClass: Class,
  classStudents: Student[],
  getGradeFunc: (sId: string, subId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  schoolSettings: SchoolSettings,
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void
) => {
  const notify = showToast || ((msg: string) => alert(msg));
  if (!selectedClass) {
    notify('Nenhuma turma selecionada.', 'error');
    return;
  }
  if (!classStudents || classStudents.length === 0) {
    notify('A turma selecionada não possui estudantes registados.', 'warning');
    return;
  }

  const subjects = getSubjectsForClass(selectedClass);
  if (subjects.length === 0) {
    notify('Nenhuma disciplina encontrada para esta turma.', 'warning');
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const { threshold, max: maxScale } = getGradeScale(selectedClass.level || '');

    // Helper for Angolan Official Document Header
    const drawOfficialHeader = (pdf: jsPDF, title: string, subtitle?: string) => {
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      pdf.text("REPÚBLICA DE ANGOLA", pageWidth / 2, 11, { align: "center" });
      pdf.text("GOVERNO PROVINCIAL - MINISTÉRIO DA EDUCAÇÃO", pageWidth / 2, 15, { align: "center" });
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text((schoolSettings.nomeEscola || "INSTITUIÇÃO DE ENSINO").toUpperCase(), pageWidth / 2, 20, { align: "center" });

      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.4);
      pdf.line(14, 23, pageWidth - 14, 23);

      pdf.setFontSize(12);
      pdf.setFont("Helvetica", "bold");
      pdf.setTextColor(30, 58, 138);
      pdf.text(title.toUpperCase(), pageWidth / 2, 29, { align: "center" });

      if (subtitle) {
        pdf.setFontSize(8.5);
        pdf.setFont("Helvetica", "normal");
        pdf.setTextColor(71, 85, 105);
        pdf.text(subtitle, pageWidth / 2, 33.5, { align: "center" });
      }

      pdf.setFontSize(8);
      pdf.setFont("Helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text(`TURMA: ${selectedClass.name}   |   NÍVEL: ${selectedClass.level}   |   CURSO: ${selectedClass.course || 'Geral'}   |   ANO LECTIVO: ${schoolSettings.anoLectivo}`, 14, 39);
      pdf.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-PT')}`, pageWidth - 14, 39, { align: "right" });

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(14, 41, pageWidth - 14, 41);
    };

    // --- PAGE 1: ARQUIVO UNIFICADO / CAPA RESUMO ---
    drawOfficialHeader(doc, "ARQUIVO UNIFICADO DE PAUTAS DE DISCIPLINAS", "Documento Consolidado para Arquivo Físico e Impresso");

    // Executive summary box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 45, pageWidth - 28, 24, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 45, pageWidth - 28, 24, 'S');

    doc.setFontSize(9.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("INFORMAÇÃO GERAL DA TURMA", 18, 51);

    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Total de Alunos na Turma: ${classStudents.length}`, 18, 57);
    doc.text(`Total de Disciplinas: ${subjects.length}`, 18, 62);
    doc.text(`Escala de Avaliação: 0 a ${maxScale} valores (Mínimo de Aprovação: ${threshold}v)`, 18, 67);

    doc.text(`Sala / Turno: ${selectedClass.room || 'N/D'} / ${selectedClass.shift || 'Manhã'}`, 140, 57);
    doc.text(`Capacidade: ${selectedClass.capacity || 0} alunos`, 140, 62);
    doc.text(`Estado do Ano Lectivo: Em curso`, 140, 67);

    // Summary table of subjects
    const subjectSummaryRows = subjects.map((sub, idx) => {
      let appCount = 0;
      let repCount = 0;
      let desCount = 0;
      classStudents.forEach(s => {
        if (s.enrollmentStatus === 'Desistente') {
          desCount++;
        } else {
          const mfd = calculateAnnual(s.id, sub, getGradeFunc, selectedClass.level);
          if (mfd >= threshold) appCount++;
          else repCount++;
        }
      });
      const totalAvaliados = appCount + repCount;
      const taxa = totalAvaliados > 0 ? ((appCount / totalAvaliados) * 100).toFixed(1) + '%' : '0%';
      return [
        (idx + 1).toString(),
        sub,
        totalAvaliados.toString(),
        appCount.toString(),
        repCount.toString(),
        desCount.toString(),
        taxa
      ];
    });

    autoTable(doc, {
      startY: 73,
      head: [['Nº', 'Disciplina', 'Avaliados', 'Aprovados', 'Reprovados', 'Desistentes', 'Taxa de Sucesso']],
      body: subjectSummaryRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 28 },
        3: { halign: 'center', cellWidth: 28 },
        4: { halign: 'center', cellWidth: 28 },
        5: { halign: 'center', cellWidth: 28 },
        6: { halign: 'center', cellWidth: 32, fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    // Signature Block on Cover
    let coverFinalY = (doc as any).lastAutoTable?.finalY || 130;
    coverFinalY = Math.max(coverFinalY + 12, pageHeight - 35);
    const sigWidth = (pageWidth - 28) / 3;

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    
    doc.text("O Director de Turma", 14 + sigWidth / 2, coverFinalY, { align: "center" });
    doc.setDrawColor(148, 163, 184);
    doc.line(14 + 10, coverFinalY + 10, 14 + sigWidth - 10, coverFinalY + 10);

    doc.text("O Subdirector Pedagógico", 14 + sigWidth + sigWidth / 2, coverFinalY, { align: "center" });
    doc.line(14 + sigWidth + 10, coverFinalY + 10, 14 + sigWidth * 2 - 10, coverFinalY + 10);

    doc.text("O Director Geral", 14 + sigWidth * 2 + sigWidth / 2, coverFinalY, { align: "center" });
    doc.line(14 + sigWidth * 2 + 10, coverFinalY + 10, pageWidth - 14 - 10, coverFinalY + 10);


    // --- PAGES FOR EACH SUBJECT ---
    subjects.forEach((subject) => {
      doc.addPage();
      drawOfficialHeader(doc, `PAUTA DA DISCIPLINA: ${subject.toUpperCase()}`, `Pauta de Classificações Contínuas e Finais`);

      let appCount = 0;
      let repCount = 0;
      let desCount = 0;

      const rows = classStudents.map((student, idx) => {
        const mt1 = calculateMT(student.id, subject, '1º Trimestre', getGradeFunc, selectedClass.level);
        const mt2 = calculateMT(student.id, subject, '2º Trimestre', getGradeFunc, selectedClass.level);
        const mt3 = calculateMT(student.id, subject, '3º Trimestre', getGradeFunc, selectedClass.level);
        const mfd = calculateAnnual(student.id, subject, getGradeFunc, selectedClass.level);

        let res = 'Aprovado';
        if (student.enrollmentStatus === 'Desistente') {
          res = 'Desistente';
          desCount++;
        } else if (mfd >= threshold) {
          res = 'Aprovado';
          appCount++;
        } else {
          res = 'Reprovado';
          repCount++;
        }

        return [
          (idx + 1).toString(),
          student.bi || student.id.substring(0, 8).toUpperCase(),
          student.name,
          mt1.toFixed(1),
          mt2.toFixed(1),
          mt3.toFixed(1),
          mfd.toFixed(1),
          res
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [['Nº', 'Processo', 'Nome Completo do Estudante', '1º Trim (MT1)', '2º Trim (MT2)', '3º Trim (MT3)', 'Média Final (MFD)', 'Resultado']],
        body: rows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 26 },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 28 },
          4: { halign: 'center', cellWidth: 28 },
          5: { halign: 'center', cellWidth: 28 },
          6: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
          7: { halign: 'center', cellWidth: 28, fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index >= 3 && data.column.index <= 6) {
              const val = parseFloat(data.cell.text[0]);
              if (!isNaN(val)) {
                if (val < threshold) {
                  data.cell.styles.textColor = [225, 29, 72];
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
            if (data.column.index === 7) {
              const text = data.cell.text[0];
              if (text === 'Aprovado') data.cell.styles.textColor = [22, 101, 52];
              else if (text === 'Reprovado') data.cell.styles.textColor = [225, 29, 72];
              else data.cell.styles.textColor = [100, 116, 139];
            }
          }
        },
        margin: { left: 14, right: 14 }
      });

      let sFinalY = (doc as any).lastAutoTable?.finalY || 130;
      if (sFinalY > pageHeight - 40) {
        doc.addPage();
        sFinalY = 20;
      } else {
        sFinalY += 5;
      }

      // Subject Summary bar
      doc.setFillColor(241, 245, 249);
      doc.rect(14, sFinalY, pageWidth - 28, 10, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, sFinalY, pageWidth - 28, 10, 'S');

      const totalAvaliados = appCount + repCount;
      const taxaAprov = totalAvaliados > 0 ? ((appCount / totalAvaliados) * 100).toFixed(1) + '%' : '0%';

      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`Estatística da Disciplina [${subject}]:   Avaliados: ${totalAvaliados}   |   Aprovados: ${appCount}   |   Reprovados: ${repCount}   |   Desistentes: ${desCount}   |   Sucesso: ${taxaAprov}`, 18, sFinalY + 6.5);

      // Signatures
      const sigY = Math.max(sFinalY + 18, pageHeight - 32);
      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text(`O Professor da Disciplina (${subject})`, 14 + sigWidth / 2, sigY, { align: "center" });
      doc.line(14 + 10, sigY + 10, 14 + sigWidth - 10, sigY + 10);

      doc.text("O Subdirector Pedagógico", 14 + sigWidth * 2 + sigWidth / 2, sigY, { align: "center" });
      doc.line(14 + sigWidth * 2 + 10, sigY + 10, pageWidth - 14 - 10, sigY + 10);
    });

    // --- FINAL CONSOLIDATED PAUTA ---
    doc.addPage();
    drawOfficialHeader(doc, "PAUTA GERAL CONSOLIDADA DA TURMA", "Matriz Global de Aproveitamento de Todas as Disciplinas");

    const getTrimesterAvg = (studentId: string, period: string) => {
      if (subjects.length === 0) return 0;
      const sum = subjects.reduce((acc, sub) => acc + calculateMT(studentId, sub, period, getGradeFunc, selectedClass.level), 0);
      return sum / subjects.length;
    };

    const headers = ['Nº', 'Nome do Aluno', ...subjects.map(s => s.length > 12 ? s.substring(0, 10) + '.' : s), 'Média Geral', 'Estado'];

    const consolidatedRows = classStudents.map((student, idx) => {
      const subjectMFDs = subjects.map(sub => calculateAnnual(student.id, sub, getGradeFunc, selectedClass.level));
      const mt1 = getTrimesterAvg(student.id, '1º Trimestre');
      const mt2 = getTrimesterAvg(student.id, '2º Trimestre');
      const mt3 = getTrimesterAvg(student.id, '3º Trimestre');
      const mfdGlobal = (mt1 + mt2 + mt3) / 3;

      let estadoStr = 'Apto';
      if (student.enrollmentStatus === 'Desistente') estadoStr = 'Desistente';
      else if (mfdGlobal < threshold) estadoStr = 'N/Apto';

      return [
        (idx + 1).toString(),
        student.name,
        ...subjectMFDs.map(m => m.toFixed(1)),
        mfdGlobal.toFixed(1),
        estadoStr
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: consolidatedRows,
      theme: 'grid',
      headStyles: {
        fillColor: [6, 78, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 42 },
        [headers.length - 2]: { halign: 'center', fontStyle: 'bold' },
        [headers.length - 1]: { halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index >= 2 && data.column.index < headers.length - 1) {
            const val = parseFloat(data.cell.text[0]);
            if (!isNaN(val) && val < threshold) {
              data.cell.styles.textColor = [225, 29, 72];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.column.index === headers.length - 1) {
            const st = data.cell.text[0];
            if (st === 'Apto') data.cell.styles.textColor = [22, 101, 52];
            else if (st === 'N/Apto') data.cell.styles.textColor = [225, 29, 72];
            else data.cell.styles.textColor = [100, 116, 139];
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    let cFinalY = (doc as any).lastAutoTable?.finalY || 130;
    cFinalY = Math.max(cFinalY + 12, pageHeight - 35);

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    
    doc.text("O Director de Turma", 14 + sigWidth / 2, cFinalY, { align: "center" });
    doc.line(14 + 10, cFinalY + 10, 14 + sigWidth - 10, cFinalY + 10);

    doc.text("O Subdirector Pedagógico", 14 + sigWidth + sigWidth / 2, cFinalY, { align: "center" });
    doc.line(14 + sigWidth + 10, cFinalY + 10, 14 + sigWidth * 2 - 10, cFinalY + 10);

    doc.text("O Director Geral da Escola", 14 + sigWidth * 2 + sigWidth / 2, cFinalY, { align: "center" });
    doc.line(14 + sigWidth * 2 + 10, cFinalY + 10, pageWidth - 14 - 10, cFinalY + 10);

    // Page numbering footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${totalPages}   |   Arquivo Oficial de Pautas Unificadas   |   ${schoolSettings.nomeEscola || 'EduGest Angola'}`, pageWidth / 2, pageHeight - 5, { align: "center" });
    }

    doc.save(`Pautas_Unificadas_Turma_${selectedClass.name.replace(/ /g, '_')}_${schoolSettings.anoLectivo}.pdf`);
    notify('PDF Unificado de pautas gerado com sucesso!', 'success');
  } catch (err) {
    console.error("Erro ao gerar PDF unificado:", err);
    notify('Erro ao gerar o ficheiro PDF das pautas.', 'error');
  }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedListClassId, setSelectedListClassId] = useState<string>('');
  const [certInitData, setCertInitData] = useState<{ studentId?: string, tab?: 'list' | 'editor' | 'issue', bulkIds?: string[] }>({});
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('edugest_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const logAuditEvent = (action: string, details?: string, userOverride?: SystemUser | null) => {
    const user = userOverride || currentUser;
    if (!user) return;
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      timestamp: new Date().toLocaleString('pt-PT'),
      details
    };
    setAuditLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 500);
      localStorage.setItem('edugest_audit_logs', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('edugest_theme') || 'light';
    document.documentElement.className = savedTheme;
    if (authService.isAuthenticated()) {
      setIsAuthenticated(true);
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        // Debounce or only log system access once per session-load
        logAuditEvent('Acesso ao Sistema', 'Sessão activa recuperada', user);
        // Direct Sync with Backend on mount!
        triggerSilentSupabasePull();
      }
    }
  }, []);

  const handleLogout = () => {
    if (currentUser) {
      logAuditEvent('Logout', 'Encerrou sessão com sucesso', currentUser);
    }
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    setIsEditingHeader(false);
  }, [activeView]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navFilter, setNavFilter] = useState<string>('Todas');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    });
  };
  const [isMobile, setIsMobile] = useState(false);

  // States for offline storage and automatic cloud synchronization (e.g. Supabase compatibility)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncModalTab, setSyncModalTab] = useState<'status' | 'data' | 'sql'>('status');
  const [syncRetryCount, setSyncRetryCount] = useState<number>(0);
  const [syncQueue, setSyncQueue] = useState<{ id: string; type: string; description: string; timestamp: string; data: any }[]>(() => {
    const saved = localStorage.getItem('edugest_sync_queue');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return validateAndCleanSyncQueue(parsed);
    } catch {
      return [];
    }
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSilentSupabasePull = async () => {
    const actuallyOnline = navigator.onLine && !isSimulatedOffline;
    if (!actuallyOnline) return;
    
    setIsSyncing(true);
    try {
      const cloudData = await pullFromSupabase();
      if (cloudData) {
        if (cloudData.schools && cloudData.schools.length > 0) setSchools(cloudData.schools);
        if (cloudData.classes && cloudData.classes.length > 0) setClasses(cloudData.classes);
        if (cloudData.students && cloudData.students.length > 0) setStudents(cloudData.students);
        if (cloudData.teachers && cloudData.teachers.length > 0) setTeachers(cloudData.teachers);
        if (cloudData.grades && cloudData.grades.length > 0) setGrades(cloudData.grades);
        if (cloudData.payments && cloudData.payments.length > 0) setPayments(cloudData.payments);
        if (cloudData.expenses && cloudData.expenses.length > 0) setExpenses(cloudData.expenses);
        if (cloudData.users && cloudData.users.length > 0) setUsers(cloudData.users);
        if (cloudData.announcements && cloudData.announcements.length > 0) setAnnouncements(cloudData.announcements);
        if (cloudData.auditLogs && cloudData.auditLogs.length > 0) setAuditLogs(cloudData.auditLogs);
        
        console.log('Sincronização directa com o backend (Supabase) concluída com sucesso.');
      }
    } catch (err) {
      console.error('Erro na sincronização directa inicial:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync Action helper with exponential backoff & integrity validation
  const queueSyncAction = async (type: string, description: string, data: any = null) => {
    const actuallyOnline = isOnline && !isSimulatedOffline;
    if (!actuallyOnline) {
      const newItem = {
        id: Math.random().toString(36).substring(2, 11),
        type,
        description,
        timestamp: new Date().toLocaleTimeString('pt-PT') + ' ' + new Date().toLocaleDateString('pt-PT'),
        data
      };
      setSyncQueue(prev => {
        const cleaned = validateAndCleanSyncQueue([...prev, newItem]);
        localStorage.setItem('edugest_sync_queue', JSON.stringify(cleaned));
        return cleaned;
      });
      showToast(`Guardado localmente (Modo Offline): ${description}`, 'info');
    } else {
      try {
        await pushItemToSupabaseWithRetry({ type, data }, 3, 1000, 6000);
        showToast(`Sincronizado na Nuvem (Supabase): ${description}`, 'success');
        setSyncRetryCount(0);
      } catch (err) {
        console.warn('Erro ao enviar para o Supabase após retentativas. Adicionando à fila local...', err);
        const newItem = {
          id: Math.random().toString(36).substring(2, 11),
          type,
          description,
          timestamp: new Date().toLocaleTimeString('pt-PT') + ' ' + new Date().toLocaleDateString('pt-PT'),
          data
        };
        setSyncQueue(prev => {
          const cleaned = validateAndCleanSyncQueue([...prev, newItem]);
          localStorage.setItem('edugest_sync_queue', JSON.stringify(cleaned));
          return cleaned;
        });
        showToast(`Fila de sincronização (Guardado local devido a erro): ${description}`, 'warning');
      }
    }
  };

  // Periodic automatic sync background timer with exponential backoff on failure
  useEffect(() => {
    // Standard interval is 60s. If retry errors occur, back off exponentially: 15s, 30s, 60s, 120s, max 300s (5min)
    const currentInterval = syncRetryCount > 0 
      ? Math.min(300000, 15000 * Math.pow(2, syncRetryCount - 1))
      : 60000;

    const interval = setInterval(async () => {
      const actuallyOnline = navigator.onLine && !isSimulatedOffline;
      if (actuallyOnline && !isSyncing) {
        try {
          await triggerSilentSupabasePull();
          setSyncRetryCount(0);
        } catch (e) {
          console.warn(`Falha no poll em segundo plano. Aplicando backoff exponencial (tentativa ${syncRetryCount + 1})...`, e);
          setSyncRetryCount(prev => prev + 1);
        }
      }
    }, currentInterval);

    return () => clearInterval(interval);
  }, [isSimulatedOffline, isSyncing, syncRetryCount]);

  // Automatic synchronization effect with queue integrity verification and exponential retry
  useEffect(() => {
    const actuallyOnline = isOnline && !isSimulatedOffline;
    if (actuallyOnline && syncQueue.length > 0 && !isSyncing) {
      setIsSyncing(true);
      
      // 1. Verify queue integrity before processing to eliminate redundant/conflicting actions
      const cleanQueue = validateAndCleanSyncQueue(syncQueue);
      if (cleanQueue.length !== syncQueue.length) {
        console.log(`[Sync Integrity] Fila de sincronização otimizada: de ${syncQueue.length} para ${cleanQueue.length} itens.`);
        setSyncQueue(cleanQueue);
        localStorage.setItem('edugest_sync_queue', JSON.stringify(cleanQueue));
      }

      if (cleanQueue.length === 0) {
        setIsSyncing(false);
        localStorage.removeItem('edugest_sync_queue');
        return;
      }

      showToast(`A sincronizar dados com o Supabase (${cleanQueue.length} pendentes)...`, 'info');
      
      const syncAll = async () => {
        let successCount = 0;
        const failedItems = [];
        
        for (const item of cleanQueue) {
          try {
            await pushItemToSupabaseWithRetry({ type: item.type, data: item.data }, 3, 1000, 8000);
            successCount++;
          } catch (e) {
            console.error(`Falha ao sincronizar item ${item.id} (${item.type}) após retentativas:`, e);
            failedItems.push(item);
          }
        }
        
        if (successCount > 0) {
          logAuditEvent('Sincronização Nuvem', `Sincronizou ${successCount} de ${cleanQueue.length} alterações pendentes de forma automática com o Supabase.`);
        }
        
        setSyncQueue(failedItems);
        if (failedItems.length > 0) {
          localStorage.setItem('edugest_sync_queue', JSON.stringify(failedItems));
          showToast(`Sincronização parcial: ${failedItems.length} alterações ainda pendentes. Agendada retentativa com backoff...`, 'warning');
          setSyncRetryCount(prev => prev + 1);
        } else {
          localStorage.removeItem('edugest_sync_queue');
          showToast('Sincronização concluída! Todos os dados integrados com o Supabase com sucesso.', 'success');
          setSyncRetryCount(0);
        }
        setIsSyncing(false);
      };

      const timer = setTimeout(() => {
        syncAll();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSimulatedOffline, syncQueue.length, isSyncing]);

  const handleExportAllToSupabase = async () => {
    if (!isOnline || isSimulatedOffline) {
      showToast('Tem que estar Online para exportar para o Supabase!', 'error');
      return;
    }
    setIsSyncing(true);
    showToast('A preparar envio em massa para o Supabase...', 'info');
    
    try {
      await performFullBackup({
        schools,
        classes,
        students,
        teachers,
        grades,
        payments,
        expenses,
        users,
        announcements,
        auditLogs
      });
      const totalExported = schools.length + classes.length + students.length + teachers.length + grades.length + payments.length + expenses.length + users.length + announcements.length + auditLogs.length;
      logAuditEvent('Sincronização Nuvem', `Exportação em massa concluída. ${totalExported} registos exportados para o Supabase.`);
      showToast(`Sucesso! ${totalExported} registos locais foram exportados (semeados) para o Supabase.`, 'success');
    } catch (err: any) {
      console.error('Falha na exportação em massa:', err);
      showToast(`Falha ao exportar dados: ${err.message || err}`, 'error');
    } finally {
      setIsSyncing(false);
    }
    return;
    /*
    try {
      let totalExported = 0;
      
      // 1. Export Schools
      for (const s of schools) {
        await supabase.from('escolas').upsert({
          id: s.id,
          name: s.name,
          nif: s.nif || null,
          address: s.address || null,
          phone: s.phone || null,
          email: s.email || null,
          director_name: s.directorName || null,
          subdirector_name: s.subdirectorName || null,
          status: s.status,
          republica: s.republica || null,
          governo_provincia: s.governoProvincia || null,
          administracao_municipal: s.administracaoMunicipal || null,
          direccao_municipal: s.direccaoMunicipal || null,
          ano_lectivo: s.anoLectivo || null,
          subscription: s.subscription || null
        });
        totalExported++;
      }
      
      // 2. Export Classes
      for (const c of classes) {
        await supabase.from('turmas').upsert({
          id: c.id,
          name: c.name,
          level: c.level,
          course: c.course || null,
          shift: c.shift,
          room: c.room,
          capacity: c.capacity,
          subjects: c.subjects || [],
          school_id: c.schoolId || 's1'
        });
        totalExported++;
      }
      
      // 3. Export Students
      for (const st of students) {
        await supabase.from('alunos').upsert({
          id: st.id,
          name: st.name,
          bi: st.bi,
          birth_date: st.birthDate || null,
          gender: st.gender,
          guardian_name: st.guardianName || null,
          guardian_phone: st.guardianPhone || null,
          class_id: st.classId || null,
          enrollment_status: st.enrollmentStatus,
          enrollment_date: st.enrollmentDate || null,
          school_id: st.schoolId || 's1',
          residential_zone: st.residentialZone || null
        });
        totalExported++;
      }
      
      // 4. Export Teachers
      for (const t of teachers) {
        await supabase.from('professores').upsert({
          id: t.id,
          name: t.name,
          specialization: t.specialization || null,
          phone: t.phone || null,
          assignments: t.assignments || [],
          portal_token: t.portalToken || null,
          school_id: t.schoolId || 's1'
        });
        totalExported++;
      }

      // 5. Export Grades
      if (grades.length > 0) {
        const payloads = grades.map(g => ({
          student_id: g.studentId,
          subject_id: g.subjectId,
          period: g.period,
          type: g.type,
          value: g.value,
          school_id: g.schoolId || 's1'
        }));
        await supabase.from('pautas').upsert(payloads, { onConflict: 'student_id,subject_id,period,type' });
        totalExported += grades.length;
      }

      // 6. Export Payments
      for (const p of payments) {
        await supabase.from('pagamentos').upsert({
          id: p.id,
          student_id: p.studentId,
          month: p.month || null,
          service: p.service,
          amount: p.amount,
          fine: p.fine || 0,
          discount: p.discount || 0,
          date: p.date,
          status: p.status,
          receipt_number: p.receiptNumber,
          school_id: p.schoolId || 's1'
        });
        totalExported++;
      }

      // 7. Export Expenses
      for (const exp of expenses) {
        await supabase.from('despesas').upsert({
          id: exp.id,
          description: exp.description,
          category: exp.category || null,
          amount: exp.amount,
          date: exp.date,
          receipt_number: exp.receiptNumber || null,
          school_id: exp.schoolId || 's1'
        });
        totalExported++;
      }

      // 8. Export Users
      for (const u of users) {
        await supabase.from('utilizadores').upsert({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password || null,
          role: u.role,
          status: u.status,
          last_login: u.lastLogin || null,
          school_id: u.schoolId || 's1',
          assigned_class_ids: u.assignedClassIds || [],
          avatar_url: u.avatarUrl || null,
          student_id: u.studentId || null
        });
        totalExported++;
      }

      // 9. Export Announcements
      for (const a of announcements) {
        await supabase.from('comunicados').upsert({
          id: a.id,
          title: a.title,
          content: a.content,
          date: a.date,
          sender_id: a.senderId,
          sender_name: a.senderName,
          sender_role: a.senderRole,
          target_audience: (a.targetAudience === 'specific_users' || a.targetAudience === 'specific_role' || (a.targetUserIds && a.targetUserIds.length > 0) || a.targetRole)
            ? JSON.stringify({ audience: a.targetAudience, userIds: a.targetUserIds || [], role: a.targetRole || null })
            : a.targetAudience,
          school_id: a.schoolId || 's1'
        });
        totalExported++;
      }

      // 10. Export Audit Logs
      for (const al of auditLogs) {
        await supabase.from('audit_logs').upsert({
          id: al.id,
          user_id: al.userId,
          user_name: al.userName,
          user_email: al.userEmail,
          user_role: al.userRole,
          action: al.action,
          timestamp: al.timestamp,
          details: al.details || null
        });
        totalExported++;
      }
      
      logAuditEvent('Sincronização Nuvem', `Exportação em massa concluída. ${totalExported} registos exportados para o Supabase.`);
      showToast(`Sucesso! ${totalExported} registos locais foram exportados (semeados) para o Supabase.`, 'success');
    } catch (err: any) {
      console.error('Falha na exportação em massa:', err);
      showToast(`Falha ao exportar dados: ${err.message || err}`, 'error');
    } finally {
      setIsSyncing(false);
    }
    */
  };

  const handleImportAllFromSupabase = async () => {
    if (!isOnline || isSimulatedOffline) {
      showToast('Tem que estar Online para importar do Supabase!', 'error');
      return;
    }
    setIsSyncing(true);
    showToast('A importar todos os dados do Supabase...', 'info');
    
    try {
      const cloudData = await pullFromSupabase();
      if (!cloudData) {
        showToast('Nenhum dado encontrado no Supabase. Verifique se criou as tabelas utilizando o Script SQL!', 'warning');
        return;
      }
      
      if (cloudData.schools.length > 0) setSchools(cloudData.schools);
      if (cloudData.classes.length > 0) setClasses(cloudData.classes);
      if (cloudData.students.length > 0) setStudents(cloudData.students);
      if (cloudData.teachers.length > 0) setTeachers(cloudData.teachers);
      if (cloudData.grades.length > 0) setGrades(cloudData.grades);
      if (cloudData.payments.length > 0) setPayments(cloudData.payments);
      if (cloudData.expenses.length > 0) setExpenses(cloudData.expenses);
      if (cloudData.users.length > 0) setUsers(cloudData.users);
      if (cloudData.announcements.length > 0) setAnnouncements(cloudData.announcements);
      if (cloudData.auditLogs.length > 0) setAuditLogs(cloudData.auditLogs);
      
      const count = cloudData.schools.length + cloudData.classes.length + cloudData.students.length + cloudData.teachers.length + cloudData.grades.length + cloudData.payments.length + cloudData.expenses.length + cloudData.users.length;
      
      logAuditEvent('Sincronização Nuvem', `Importação completa realizada com sucesso. ${count} registos carregados.`);
      showToast(`Sucesso! ${count} registos carregados com sucesso do Supabase para o armazenamento local.`, 'success');
    } catch (err: any) {
      console.error('Falha na importação em massa:', err);
      showToast(`Falha ao importar dados: ${err.message || err}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllSupabaseData = async () => {
    if (!isOnline || isSimulatedOffline) {
      showToast('Tem que estar Online para limpar o Supabase!', 'error');
      return;
    }
    setIsSyncing(true);
    showToast('A limpar dados do Supabase e armazenamento local...', 'info');

    try {
      // 1. Limpar as tabelas no Supabase via backend proxy
      await clearAllSupabaseData();

      // 2. Limpar o estado local da aplicação para sincronizar o reset completo
      setSchools([]);
      setClasses([]);
      setStudents([]);
      setTeachers([]);
      setGrades([]);
      setPayments([]);
      setExpenses([]);
      setAnnouncements([]);
      setAuditLogs([]);

      // 3. Limpar localStorage para garantir persistência local nula
      localStorage.setItem('edugest_schools', JSON.stringify([]));
      localStorage.setItem('edugest_classes', JSON.stringify([]));
      localStorage.setItem('edugest_students', JSON.stringify([]));
      localStorage.setItem('edugest_teachers', JSON.stringify([]));
      localStorage.setItem('edugest_grades', JSON.stringify([]));
      localStorage.setItem('edugest_payments', JSON.stringify([]));
      localStorage.setItem('edugest_expenses', JSON.stringify([]));
      localStorage.setItem('edugest_announcements', JSON.stringify([]));
      localStorage.setItem('edugest_audit_logs', JSON.stringify([]));

      // 4. Se houver um utilizador actual logado no navegador, vamos reinserir apenas o seu perfil
      // na tabela remota para ele não perder o acesso ao painel de administração remota
      if (currentUser) {
        await pushItemToSupabaseWithRetry({
          type: 'CADASTRAR_UTILIZADOR',
          data: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            password: currentUser.password || null,
            role: currentUser.role,
            status: currentUser.status,
            schoolId: currentUser.schoolId || 's1',
            assignedClassIds: currentUser.assignedClassIds || []
          }
        });
        setUsers([currentUser]);
        localStorage.setItem('edugest_users', JSON.stringify([currentUser]));
      } else {
        setUsers([]);
        localStorage.setItem('edugest_users', JSON.stringify([]));
      }

      logAuditEvent('Limpeza Total', 'Todas as escolas, turmas, alunos e demais dados foram totalmente limpos do Supabase e do armazenamento local.');
      showToast('Sucesso! Toda a base de dados remota e local foi limpa. Pode iniciar os cadastros do zero.', 'success');
    } catch (err: any) {
      console.error('Falha ao limpar base de dados:', err);
      showToast(`Falha ao limpar dados: ${err.message || err}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // State for data
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('edugest_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });
  const [classes, setClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('edugest_classes');
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('edugest_teachers');
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('edugest_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('edugest_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });
  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem('edugest_grades');
    return saved ? JSON.parse(saved) : [];
  });
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem('edugest_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [templates, setTemplates] = useState<CertificateTemplate[]>(() => {
    const saved = localStorage.getItem('edugest_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('edugest_announcements');
    return saved ? JSON.parse(saved) : [];
  });
  const [schools, setSchools] = useState<School[]>(() => {
    const saved = localStorage.getItem('edugest_schools');
    return saved ? JSON.parse(saved) : INITIAL_SCHOOLS;
  });
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() => {
    return localStorage.getItem('edugest_selected_school_id') || 's1';
  });

  const [viewConfigs, setViewConfigs] = useState<Record<View, { title: string, subtitle: string }>>(() => {
    const defaultConfigs = {
      dashboard: { title: 'Estatística (Painel)', subtitle: 'Bem-vindo ao sistema de gestão escolar' },
      students: { title: 'Alunos & Matrículas', subtitle: 'Gestão de matrículas e listagens' },
      academic: { title: 'Relatório Académico', subtitle: 'Controlo de pautas e aproveitamento' },
      finance: { title: 'Finanças', subtitle: 'Gestão de propinas e pagamentos' },
      teachers: { title: 'Professores', subtitle: 'Gestão do corpo docente' },
      classes: { title: 'Classes & Turmas', subtitle: 'Gestão de turmas e salas' },
      lists: { title: 'Lançamento de Notas', subtitle: 'Listas de alunos por turma' },
      'mini-pautas': { title: 'Mini Pautas', subtitle: 'Gestão de notas por disciplina' },
      'pauta-final': { title: 'Pautas Finais', subtitle: 'Aproveitamento anual dos alunos' },
      boletim: { title: 'Boletim de Notas', subtitle: 'Relatório individual do aluno' },
      certificates: { title: 'Certificados & Declarações', subtitle: 'Emissão de certificados e diplomas' },
      settings: { title: 'Dados da Escola & Anos', subtitle: 'Ajustes e informações do sistema' },
      users: { title: 'Utilizadores & Funcionários', subtitle: 'Gestão de acessos e utilizadores do sistema' },
      backup: { title: 'Backup do Sistema', subtitle: 'Importar e exportar dados do sistema' },
      schools: { title: 'Gestão de Escolas', subtitle: 'Administração de instituições e filiais' },
      profile: { title: 'Perfil e Preferências', subtitle: 'Gestão de perfil e preferências do utilizador' },
      announcements: { title: 'Comunicados', subtitle: 'Envio e leitura de comunicados' },
      exams: { title: 'Exames', subtitle: 'Lançamento de notas de exames' },
      transfers: { title: 'Transferências de Alunos', subtitle: 'Gestão de transferências' },
      calendar: { title: 'Calendário Escolar', subtitle: 'Planeamento de atividades e avaliações' },
      archive: { title: 'Arquivo Digital', subtitle: 'Armazenamento seguro de documentos' },
      audit: { title: 'Auditoria de Acesso', subtitle: 'Histórico de acções e registo de acessos' }
    } as Record<View, { title: string, subtitle: string }>;

    const saved = localStorage.getItem('edugest_view_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultConfigs, ...parsed };
      } catch (e) {
        // Fallback to default
      }
    }
    return defaultConfigs;
  });
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [tempHeader, setTempHeader] = useState({ title: '', subtitle: '' });

  const getGrade = (studentId: string, subjectId: string, period: string, type: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3' = 'MAC') => {
    const existing = grades.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === type);
    if (existing) return existing.value;

    if (type === 'MAC') {
      const ac1 = grades.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === 'AC1');
      const ac2 = grades.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === 'AC2');
      const ac3 = grades.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === 'AC3');
      if (ac1 || ac2 || ac3) {
        const v1 = ac1?.value ?? 0;
        const v2 = ac2?.value ?? 0;
        const v3 = ac3?.value ?? 0;
        return Number(((v1 + v2 + v3) / 3).toFixed(1));
      }
    }

    return 0;
  };

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem('edugest_school_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      republica: 'República de Angola',
      governoProvincia: 'Governo da Província do Cuanza-Sul',
      administracaoMunicipal: 'Administração Municipal do Waku-Kungo',
      direccaoMunicipal: 'Direcção Municipal da Educação',
      nomeEscola: 'Escola Primária',
      anoLectivo: '2023/2024'
    };
  });

  const currentSchoolId = currentUser?.role === 'Super-Administrador'
    ? (selectedSchoolId || 's1')
    : currentUser?.schoolId;

  const currentSchool = schools.find(s => s.id === currentSchoolId);
  
  const hasActiveSubscription = currentUser?.role === 'Super-Administrador' || (
    !currentSchool?.subscription || currentSchool.subscription.status === 'Activa'
  );
  
  const showSubscriptionAlert = currentUser?.role !== 'Super-Administrador' && currentSchool && !hasActiveSubscription;

  // Sync schoolSettings with the active school when it changes
  useEffect(() => {
    if (currentSchool) {
      setSchoolSettings(prev => ({
        ...prev,
        republica: currentSchool.republica || 'República de Angola',
        governoProvincia: currentSchool.governoProvincia || 'Governo da Província do Cuanza-Sul',
        administracaoMunicipal: currentSchool.administracaoMunicipal || 'Administração Municipal',
        direccaoMunicipal: currentSchool.direccaoMunicipal || 'Direcção Municipal da Educação',
        nomeEscola: currentSchool.name,
        anoLectivo: currentSchool.anoLectivo || '2023/2024',
        logoBase64: currentSchool.logoBase64 || prev.logoBase64
      }));
    }
  }, [currentSchoolId, schools]);

  const filteredStudents = authService.filterBySchool<Student>(students).filter(s => !currentSchoolId || s.schoolId === currentSchoolId);
  const filteredClasses = authService.filterBySchool<Class>(classes).filter(c => 
    (!currentSchoolId || c.schoolId === currentSchoolId) &&
    (currentUser?.role !== 'Professor' || currentUser.assignedClassIds?.includes(c.id))
  );
  const filteredTeachers = authService.filterBySchool<Teacher>(teachers).filter(t => !currentSchoolId || t.schoolId === currentSchoolId);
  const filteredPayments = authService.filterBySchool<Payment>(payments).filter(p => !currentSchoolId || p.schoolId === currentSchoolId);
  const filteredExpenses = authService.filterBySchool<Expense>(expenses).filter(e => !currentSchoolId || e.schoolId === currentSchoolId);
  const filteredGrades = authService.filterBySchool<Grade>(grades).filter(g => !currentSchoolId || g.schoolId === currentSchoolId);
  const filteredTemplates = authService.filterBySchool<CertificateTemplate>(templates).filter(t => !currentSchoolId || t.schoolId === currentSchoolId);
  const filteredUsers = authService.filterBySchool<SystemUser>(users).filter(u => 
    currentUser?.role === 'Super-Administrador'
      ? (!currentSchoolId || u.schoolId === currentSchoolId || u.role === 'Super-Administrador')
      : (u.schoolId === currentUser?.schoolId)
  );

  async function exportClassStudentListPDF(cls: Class, paperSize: 'A4' | 'A3' | 'A5' = 'A4') {
    const classStudents = students
      .filter(s => s.classId === cls.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const doc = new jsPDF('p', 'mm', paperSize.toLowerCase());
    const insignia = await loadAngolaInsignia();
    
    const paperWidth = paperSize === 'A3' ? 297 : paperSize === 'A5' ? 148 : 210;
    const centerX = paperWidth / 2;
    const margin = paperSize === 'A5' ? 10 : 15;
    
    let startY = 56;
    
    if (insignia) {
      if (paperSize === 'A3') {
        doc.addImage(insignia, getImageFormat(insignia), centerX - 12.5, 10, 25, 25);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolSettings.republica || 'REPÚBLICA DE ANGOLA', centerX, 38, { align: 'center' });
        doc.setFontSize(11);
        doc.text(schoolSettings.nomeEscola || 'Sistema de Gestão Escolar', centerX, 44, { align: 'center' });
        doc.setFontSize(16);
        doc.text('LISTA NOMINAL DE ALUNOS', centerX, 52, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Turma: ${cls.name}`, 15, 60);
        doc.text(`Classe: ${cls.level}`, 90, 60);
        doc.text(`Ano Lectivo: ${schoolSettings.anoLectivo}`, 165, 60);
        doc.text(`Sala: ${cls.room || 'N/A'}`, 240, 60);
        
        startY = 65;
      } else if (paperSize === 'A5') {
        doc.addImage(insignia, getImageFormat(insignia), centerX - 7, 8, 14, 14);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolSettings.republica || 'REPÚBLICA DE ANGOLA', centerX, 25, { align: 'center' });
        doc.setFontSize(7);
        doc.text(schoolSettings.nomeEscola || 'Sistema de Gestão Escolar', centerX, 29, { align: 'center' });
        doc.setFontSize(9.5);
        doc.text('LISTA NOMINAL DE ALUNOS', centerX, 34, { align: 'center' });
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Turma: ${cls.name}`, 10, 40);
        doc.text(`Classe: ${cls.level}`, 44, 40);
        doc.text(`Ano Lectivo: ${schoolSettings.anoLectivo}`, 78, 40);
        doc.text(`Sala: ${cls.room || 'N/A'}`, 112, 40);
        
        startY = 44;
      } else {
        // A4
        doc.addImage(insignia, getImageFormat(insignia), centerX - 10, 10, 20, 20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolSettings.republica || 'REPÚBLICA DE ANGOLA', centerX, 33, { align: 'center' });
        doc.setFontSize(9);
        doc.text(schoolSettings.nomeEscola || 'Sistema de Gestão Escolar', centerX, 38, { align: 'center' });
        doc.setFontSize(12);
        doc.text('LISTA NOMINAL DE ALUNOS', centerX, 45, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Turma: ${cls.name}`, 15, 51);
        doc.text(`Classe: ${cls.level}`, 65, 51);
        doc.text(`Ano Lectivo: ${schoolSettings.anoLectivo}`, 115, 51);
        doc.text(`Sala: ${cls.room || 'N/A'}`, 165, 51);
        
        startY = 55;
      }
    } else {
      if (paperSize === 'A3') {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTA NOMINAL DE ALUNOS', centerX, 20, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Turma: ${cls.name}`, 15, 30);
        doc.text(`Classe: ${cls.level}`, 90, 30);
        doc.text(`Ano Lectivo: ${schoolSettings.anoLectivo}`, 165, 30);
        doc.text(`Sala: ${cls.room || 'N/A'}`, 240, 30);
        
        startY = 35;
      } else if (paperSize === 'A5') {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTA NOMINAL DE ALUNOS', centerX, 15, { align: 'center' });
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Turma: ${cls.name}`, 10, 22);
        doc.text(`Classe: ${cls.level}`, 44, 22);
        doc.text(`Ano Lectivo: ${schoolSettings.anoLectivo}`, 78, 22);
        doc.text(`Sala: ${cls.room || 'N/A'}`, 112, 22);
        
        startY = 26;
      } else {
        // A4
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTA NOMINAL DE ALUNOS', centerX, 15, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Turma: ${cls.name}`, 15, 23);
        doc.text(`Classe: ${cls.level}`, 65, 23);
        doc.text(`Ano Lectivo: ${schoolSettings.anoLectivo}`, 115, 23);
        doc.text(`Sala: ${cls.room || 'N/A'}`, 165, 23);
        
        startY = 27;
      }
    }

    const tableHeaders = [['Nº', 'Nome Completo', 'Documento BI', 'Gênero', 'Estado']];
    
    const maxListStudents = classStudents.slice(0, 45);
    const tableData = Array.from({ length: 45 }, (_, index) => {
      const student = maxListStudents[index];
      if (student) {
        return [
          index + 1,
          student.name,
          student.bi,
          student.gender,
          student.enrollmentStatus
        ];
      } else {
        return [
          index + 1,
          '-',
          '-',
          '-',
          '-'
        ];
      }
    });

    let headSize = 8.5;
    let bodySize = 8.5;
    let cellPadding = 1.5;
    let columnStyles = {};

    if (paperSize === 'A3') {
      headSize = 12;
      bodySize = 11;
      cellPadding = 3;
      columnStyles = {
        0: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 20 },
        4: { cellWidth: 40 }
      };
    } else if (paperSize === 'A5') {
      headSize = 6.5;
      bodySize = 6.5;
      cellPadding = 1;
      columnStyles = {
        0: { cellWidth: 10 },
        2: { cellWidth: 22 },
        3: { cellWidth: 12 },
        4: { cellWidth: 18 }
      };
    } else {
      // A4
      headSize = 8.5;
      bodySize = 8.5;
      cellPadding = 1.5;
      columnStyles = {
        0: { cellWidth: 12 },
        2: { cellWidth: 35 },
        3: { cellWidth: 15 },
        4: { cellWidth: 25 }
      };
    }

    autoTable(doc, {
      startY: startY,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }, // dark slate color matching the theme
      styles: { fontSize: bodySize, cellPadding: cellPadding },
      columnStyles: columnStyles,
      margin: { left: margin, right: margin }
    });

    // Add space for signatures and date
    const finalY = (doc as any).lastAutoTable?.finalY || (startY + 150);
    const pageHeight = paperSize === 'A3' ? 420 : paperSize === 'A5' ? 210 : 297;
    
    let sigY = finalY + 10;
    const requiredHeight = paperSize === 'A3' ? 45 : paperSize === 'A5' ? 25 : 35;
    
    if (sigY + requiredHeight > pageHeight - margin) {
      doc.addPage();
      sigY = margin + (paperSize === 'A5' ? 8 : 15);
    }
    
    // Date line
    doc.setFont('helvetica', 'bold');
    const dateFontSize = paperSize === 'A3' ? 11 : paperSize === 'A5' ? 7 : 9;
    doc.setFontSize(dateFontSize);
    const dateText = "Em _________________________, aos _____ de _________________ de 20____";
    doc.text(dateText, paperWidth - margin, sigY, { align: 'right' });
    
    // Signatures columns
    const colWidth = (paperWidth - (margin * 2)) / 3;
    const sigLabelY = sigY + (paperSize === 'A3' ? 12 : paperSize === 'A5' ? 8 : 10);
    const lineY = sigLabelY + (paperSize === 'A3' ? 18 : paperSize === 'A5' ? 10 : 14);
    const descY = lineY + (paperSize === 'A3' ? 5 : paperSize === 'A5' ? 3 : 4);
    
    const sigLabelFontSize = paperSize === 'A3' ? 11 : paperSize === 'A5' ? 7 : 9;
    const sigDescFontSize = paperSize === 'A3' ? 9 : paperSize === 'A5' ? 5.5 : 7.5;
    
    const sigs = [
      { label: "O Professor", desc: "(Assinatura legível)" },
      { label: "O Subdirector Pedagógico", desc: "(Assinatura legível)" },
      { label: "O Director da Escola", desc: "(Assinatura legível)" }
    ];
    
    sigs.forEach((sig, index) => {
      const colCenterX = margin + (index * colWidth) + (colWidth / 2);
      
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sigLabelFontSize);
      doc.text(sig.label, colCenterX, sigLabelY, { align: 'center' });
      
      // Line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sigLabelFontSize);
      const lineText = paperSize === 'A3' ? "________________________________" : paperSize === 'A5' ? "____________________" : "__________________________";
      doc.text(lineText, colCenterX, lineY, { align: 'center' });
      
      // Description
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(sigDescFontSize);
      doc.text(sig.desc, colCenterX, descY, { align: 'center' });
    });

    doc.save(`Lista_Alunos_${cls.name.replace(/ /g, '_')}_${paperSize}.pdf`);
  }

  const handleLogin = (user: { email: string, name: string, role: string, schoolId?: string }) => {
    const savedUsers = JSON.parse(localStorage.getItem('edugest_users') || '[]');
    setUsers(savedUsers);
    
    const fullUser = savedUsers.find((u: any) => u.email === user.email);
    if (!fullUser) return;
    
    setIsAuthenticated(true);
    setCurrentUser(fullUser);
    authService.login(fullUser);
    logAuditEvent('Login', 'Iniciou sessão com sucesso', fullUser);
    
    // Check if new school settings were registered
    const newSettings = localStorage.getItem('edugest_school_settings');
    if (newSettings) {
      setSchoolSettings(JSON.parse(newSettings));
    }

    // Direct Sync with Backend on login!
    triggerSilentSupabasePull();
  };

  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [portalTeacher, setPortalTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const portal = params.get('portal');
    if (portal === 'teacher' && token && teachers.length > 0) {
      const teacher = teachers.find(t => t.portalToken === token);
      if (teacher) {
        setPortalTeacher(teacher);
      }
    }
  }, [teachers]);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('edugest_students', JSON.stringify(students));
    localStorage.setItem('edugest_classes', JSON.stringify(classes));
    localStorage.setItem('edugest_teachers', JSON.stringify(teachers));
    localStorage.setItem('edugest_payments', JSON.stringify(payments));
    localStorage.setItem('edugest_expenses', JSON.stringify(expenses));
    localStorage.setItem('edugest_grades', JSON.stringify(grades));
    localStorage.setItem('edugest_users', JSON.stringify(users));
    localStorage.setItem('edugest_templates', JSON.stringify(templates));
    localStorage.setItem('edugest_view_configs', JSON.stringify(viewConfigs));
    localStorage.setItem('edugest_school_settings', JSON.stringify(schoolSettings));
    localStorage.setItem('edugest_schools', JSON.stringify(schools));
    localStorage.setItem('edugest_announcements', JSON.stringify(announcements));
    if (selectedSchoolId) {
      localStorage.setItem('edugest_selected_school_id', selectedSchoolId);
    }
  }, [students, classes, teachers, payments, expenses, grades, viewConfigs, schoolSettings, schools, selectedSchoolId, users, announcements]);

  const onUpdateStudents = (newStudents: Student[]) => {
    const invalid = newStudents.some(s => s.schoolId && !authService.canAccessSchool(s.schoolId));
    if (invalid) {
      showToast('Erro de Permissão: Não tem autorização para modificar alunos fora da sua escola.', 'error');
      return;
    }
    setStudents(newStudents);
    showToast('Lista de alunos actualizada');
  };
  const onUpdateTeachers = (newTeachers: Teacher[]) => {
    const invalid = newTeachers.some(t => t.schoolId && !authService.canAccessSchool(t.schoolId));
    if (invalid) {
      showToast('Erro de Permissão: Não tem autorização para modificar professores fora da sua escola.', 'error');
      return;
    }
    setTeachers(newTeachers);
    showToast('Lista de professores actualizada');
  };
  const onUpdateClasses = (newClasses: Class[]) => {
    const invalid = newClasses.some(c => c.schoolId && !authService.canAccessSchool(c.schoolId));
    if (invalid) {
      showToast('Erro de Permissão: Não tem autorização para modificar turmas fora da sua escola.', 'error');
      return;
    }
    setClasses(newClasses);
    showToast('Lista de turmas actualizada');
  };
  const onUpdateGrades = (newGrades: Grade[]) => {
    if (!authService.canAccessSchool(currentSchoolId)) {
      showToast('Erro de Permissão: Não tem autorização para gerir notas nesta escola.', 'error');
      return;
    }
    const otherSchoolsGrades = grades.filter(g => g.schoolId !== currentSchoolId);
    const withSchoolId = newGrades.map(g => ({ ...g, schoolId: currentSchoolId || g.schoolId || 's1' }));
    setGrades([...otherSchoolsGrades, ...withSchoolId]);
    showToast('Notas actualizadas');
    queueSyncAction('ACTUALIZAR_NOTAS', 'Actualização de pauta de notas', withSchoolId);
  };

  const onAddUser = (user: SystemUser) => {
    const targetSchoolId = user.schoolId || currentSchoolId || '';
    if (!authService.canManageSchoolUsers(targetSchoolId)) {
      showToast('Erro de Permissão: Não tem autorização para registar utilizadores nesta escola.', 'error');
      return;
    }
    const newUserObj = { ...user, schoolId: targetSchoolId };
    setUsers([...users, newUserObj]);
    showToast('Utilizador criado com sucesso', 'success');
    logAuditEvent('Criar Utilizador', `Criou o utilizador ${user.name} (${user.role})`);
    queueSyncAction('CADASTRAR_UTILIZADOR', `Cadastro do utilizador "${user.name}"`, newUserObj);
  };
  const onUpdateUser = (user: SystemUser) => {
    const targetSchoolId = user.schoolId || currentSchoolId || '';
    if (!authService.canManageSchoolUsers(targetSchoolId)) {
      showToast('Erro de Permissão: Não tem autorização para modificar utilizadores nesta escola.', 'error');
      return;
    }
    const updatedUserObj = { ...user, schoolId: targetSchoolId };
    setUsers(users.map(u => u.id === user.id ? updatedUserObj : u));
    showToast('Dados do utilizador actualizados', 'success');
    logAuditEvent('Actualizar Utilizador', `Actualizou o utilizador ${user.name} (${user.role})`);
    queueSyncAction('ACTUALIZAR_UTILIZADOR', `Atualização do utilizador "${user.name}"`, updatedUserObj);
  };
  const onDeleteUser = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user && !authService.canManageSchoolUsers(user.schoolId)) {
      showToast('Erro de Permissão: Não tem autorização para eliminar utilizadores desta escola.', 'error');
      return;
    }
    confirmAction(
      'Eliminar Utilizador',
      `Tem a certeza que deseja eliminar o utilizador ${user?.name}? Esta acção não pode ser desfeita.`,
      () => {
        setUsers(users.filter(u => u.id !== id));
        showToast('Utilizador eliminado', 'success');
        if (user) {
          logAuditEvent('Eliminar Utilizador', `Eliminou o utilizador ${user.name} (${user.role})`);
          queueSyncAction('ELIMINAR_UTILIZADOR', `Eliminação do utilizador "${user.name}"`, { id });
        }
      }
    );
  };

  const handleAddSchool = (newSchool: School, admin: SystemUser) => {
    if (!authService.canManageSchools()) {
      showToast('Erro de Permissão: Apenas o Super-Administrador pode cadastrar escolas.', 'error');
      return;
    }
    setSchools([...schools, newSchool]);
    setUsers([...users, admin]);
    logAuditEvent('Criar Escola', `Adicionou a escola ${newSchool.name} e criou o seu administrador ${admin.name}`);
    queueSyncAction('CRIAR_ESCOLA', `Criação da escola "${newSchool.name}"`, newSchool);
    queueSyncAction('CADASTRAR_UTILIZADOR', `Cadastro do administrador "${admin.name}"`, admin);
  };

  const handleUpdateSchool = (updatedSchool: School) => {
    if (!authService.canManageSchools()) {
      showToast('Erro de Permissão: Apenas o Super-Administrador pode actualizar dados de escolas.', 'error');
      return;
    }
    setSchools(schools.map(s => s.id === updatedSchool.id ? updatedSchool : s));
    logAuditEvent('Actualizar Escola', `Actualizou os dados da escola ${updatedSchool.name}`);
    queueSyncAction('ACTUALIZAR_ESCOLA', `Atualização da escola "${updatedSchool.name}"`, updatedSchool);
  };

  const handleDeleteSchool = (id: string) => {
    if (!authService.canManageSchools()) {
      showToast('Erro de Permissão: Apenas o Super-Administrador pode eliminar escolas.', 'error');
      return;
    }
    const school = schools.find(s => s.id === id);
    confirmAction(
      'Eliminar Escola',
      'Tem a certeza que deseja eliminar esta escola? Todos os dados associados a esta escola (alunos, turmas, etc.) não serão apagados automaticamente, mas não estarão mais acessíveis.',
      () => {
        setSchools(schools.filter(s => s.id !== id));
        showToast('Escola eliminada com sucesso', 'success');
        if (school) {
          logAuditEvent('Eliminar Escola', `Eliminou a escola ${school.name}`);
          queueSyncAction('ELIMINAR_ESCOLA', `Eliminação da escola "${school.name}"`, { id });
        }
      }
    );
  };

  const onExportData = () => {
    const data = {
      students,
      classes,
      teachers,
      payments,
      expenses,
      grades,
      users,
      templates,
      schools,
      schoolSettings,
      viewConfigs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edugest_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado com sucesso', 'success');
  };

  const onImportData = (jsonString: string) => {
    confirmAction(
      'Restaurar Backup',
      'Tem a certeza que deseja restaurar os dados? Todos os dados actuais serão perdidos e substituídos pelo conteúdo do ficheiro.',
      () => {
        try {
          const data = JSON.parse(jsonString);
          if (data.students) setStudents(data.students);
          if (data.classes) setClasses(data.classes);
          if (data.teachers) setTeachers(data.teachers);
          if (data.payments) setPayments(data.payments);
          if (data.expenses) setExpenses(data.expenses);
          if (data.grades) setGrades(data.grades);
          if (data.users) setUsers(data.users);
          if (data.templates) setTemplates(data.templates);
          if (data.schools) setSchools(data.schools);
          if (data.schoolSettings) setSchoolSettings(data.schoolSettings);
          if (data.viewConfigs) setViewConfigs(data.viewConfigs);
          
          performFullBackup(data).catch(err => console.error('Erro ao sincronizar backup para a nuvem:', err));

          showToast('Dados restaurados com sucesso!', 'success');
          setActiveView('dashboard');
        } catch (error) {
          showToast('Erro ao importar ficheiro. Formato inválido.', 'error');
        }
      }
    );
  };

  const onDeleteStudent = (id: string) => {
    const student = students.find(s => s.id === id);
    if (student && !authService.canAccessData(student)) {
      showToast('Sem permissão para eliminar este aluno', 'error');
      return;
    }
    confirmAction(
      'Eliminar Aluno',
      `Tem a certeza que deseja eliminar o aluno ${student?.name}? Esta acção não pode ser desfeita.`,
      () => {
        setStudents(students.filter(s => s.id !== id));
        showToast('Aluno eliminado com sucesso', 'success');
        queueSyncAction('ELIMINAR_ALUNO', `Eliminação do aluno "${student?.name || id}"`, { id });
      }
    );
  };

  const onDeleteTeacher = (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    if (teacher && !authService.canAccessData(teacher)) {
      showToast('Sem permissão para eliminar este professor', 'error');
      return;
    }
    confirmAction(
      'Eliminar Professor',
      `Tem a certeza que deseja eliminar o professor ${teacher?.name}? Esta acção não pode ser desfeita.`,
      () => {
        setTeachers(teachers.filter(t => t.id !== id));
        showToast('Professor eliminado com sucesso', 'success');
        queueSyncAction('ELIMINAR_PROFESSOR', `Eliminação do professor "${teacher?.name || id}"`, { id });
      }
    );
  };

  const onDeleteClass = (id: string) => {
    const cls = classes.find(c => c.id === id);
    if (cls && !authService.canAccessData(cls)) {
      showToast('Sem permissão para eliminar esta turma', 'error');
      return;
    }
    confirmAction(
      'Eliminar Turma',
      `Tem a certeza que deseja eliminar a turma ${cls?.name}? Todos os alunos desta turma ficarão sem turma atribuída.`,
      () => {
        setClasses(classes.filter(c => c.id !== id));
        setStudents(students.map(s => s.classId === id ? { ...s, classId: '' } : s));
        showToast('Turma eliminada com sucesso', 'success');
        queueSyncAction('ELIMINAR_TURMA', `Eliminação da turma "${cls?.name || id}"`, { id });
      }
    );
  };

  const userRole = currentUser?.role || 'Administrador';

  const allNavItems = [
    { id: 'dashboard', label: 'Estatística', icon: LayoutDashboard, roles: ['Super-Administrador', 'Administrador', 'Secretário', 'Financeiro', 'Professor'], group: 'Área Administrativa' },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone, roles: ['Super-Administrador', 'Administrador', 'Secretário', 'Financeiro', 'Professor'], group: 'Geral' },
    { id: 'schools', label: 'Escolas', icon: SchoolIcon, roles: ['Super-Administrador'], group: 'Geral' },
    
    { id: 'students', label: 'Alunos & Matrículas', icon: Users, roles: ['Administrador', 'Secretário'], group: 'Área Académica' },
    { id: 'teachers', label: 'Professores', icon: UserRound, roles: ['Administrador', 'Secretário'], group: 'Área Académica' },
    { id: 'classes', label: 'Classes & Turmas', icon: Layers, roles: ['Administrador', 'Secretário', 'Professor'], group: 'Área Académica' },
    { id: 'lists', label: 'Lançamento de Notas', icon: Check, roles: ['Administrador', 'Secretário', 'Professor'], group: 'Área Académica' },
    { id: 'exams', label: 'Exames', icon: BookOpen, roles: ['Administrador', 'Secretário', 'Professor'], group: 'Área Académica' },
    { id: 'mini-pautas', label: 'Mini Pautas', icon: FileSpreadsheet, roles: ['Administrador', 'Professor', 'Secretário'], group: 'Área Académica' },
    { id: 'pauta-final', label: 'Pautas Finais', icon: GraduationCap, roles: ['Administrador', 'Professor', 'Secretário'], group: 'Área Académica' },
    { id: 'ai-assistant', label: 'Assistente Pedagógico', icon: Bot, roles: ['Super-Administrador', 'Administrador', 'Professor', 'Secretário'], group: 'Área Académica' },
    { id: 'boletim', label: 'Boletim de Notas', icon: FileDown, roles: ['Administrador', 'Professor', 'Secretário', 'Aluno'], group: 'Área Académica' },
    { id: 'certificates', label: 'Certificados & Declarações', icon: Award, roles: ['Administrador', 'Secretário'], group: 'Área Académica' },
    { id: 'transfers', label: 'Transferências de Alunos', icon: Award, roles: ['Administrador', 'Secretário'], group: 'Área Académica' },
    { id: 'academic', label: 'Relatório Académico', icon: BookOpen, roles: ['Super-Administrador', 'Administrador', 'Secretário'], group: 'Área Académica' },

    { id: 'users', label: 'Utilizadores & Funcionários', icon: UserCog, roles: ['Super-Administrador', 'Administrador'], group: 'Área Administrativa' },
    { id: 'finance', label: 'Finanças', icon: CreditCard, roles: ['Financeiro'], group: 'Área Administrativa' },
    { id: 'calendar', label: 'Calendário Escolar', icon: CalendarDays, roles: ['Administrador'], group: 'Área Administrativa' },
    { id: 'archive', label: 'Arquivo Digital', icon: Archive, roles: ['Super-Administrador', 'Administrador'], group: 'Área Administrativa' },
    { id: 'backup', label: 'Backup do Sistema', icon: Database, roles: ['Super-Administrador'], group: 'Área Administrativa' },
    { id: 'audit', label: 'Auditoria de Acesso', icon: History, roles: ['Super-Administrador'], group: 'Área Administrativa' },

    { id: 'settings', label: 'Dados da Escola & Anos', icon: Settings, roles: ['Administrador'], group: 'Área de Configuração' },
    { id: 'profile', label: 'Perfil e Preferências', icon: UserRound, roles: ['Super-Administrador', 'Administrador', 'Secretário', 'Financeiro', 'Professor', 'Aluno'], group: 'Área de Configuração' },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  useEffect(() => {
    const isAllowed = navItems.some(item => item.id === activeView);
    if (!isAllowed && navItems.length > 0) {
      setActiveView(navItems[0].id as View);
    }
  }, [navItems, activeView]);

  if (portalTeacher) {
    return (
      <TeacherPortalView 
        teacher={portalTeacher} 
        students={students} 
        classes={classes} 
        grades={grades}
        onUpdateGrades={onUpdateGrades}
        getGrade={getGrade}
        schoolSettings={schoolSettings}
        setSchoolSettings={setSchoolSettings}
        showToast={showToast}
        onLogout={() => {
          setPortalTeacher(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
        onExportPDF={exportClassStudentListPDF}
        currentUser={currentUser}
      />
    );
  }

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-blue-900 border-r border-blue-800 transition-all duration-300 flex flex-col z-50",
          isMobile 
            ? cn("fixed inset-y-0 left-0 shadow-2xl", sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-72")
            : cn("relative", sidebarOpen ? "w-64" : "w-20")
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
              schoolSettings.logoBase64 ? "bg-white p-1" : "bg-blue-500 text-white shadow-blue-400/20"
            )}>
              {schoolSettings.logoBase64 ? (
                <img src={schoolSettings.logoBase64} alt="Escola" className="w-full h-full object-contain" />
              ) : (
                <GraduationCap size={24} />
              )}
            </div>
            {(sidebarOpen || isMobile) && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-lg tracking-tight text-white">B.A GestEscola</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold text-blue-300">Angola • Sistema</p>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-blue-300 hover:text-white lg:hidden">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {currentUser?.role === 'Administrador' && (sidebarOpen || isMobile) && (
            <div className="mb-4 space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-blue-300 ml-1">Filtro de Navegação</label>
              <select
                value={navFilter}
                onChange={(e) => setNavFilter(e.target.value)}
                className="w-full bg-blue-800/50 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 border-none font-semibold cursor-pointer appearance-none"
              >
                <option value="Todas">Todas as Áreas</option>
                <option value="Geral">Geral</option>
                <option value="Área Académica">Área Académica</option>
                <option value="Área Administrativa">Área Administrativa</option>
                <option value="Área de Configuração">Área de Configuração</option>
              </select>
            </div>
          )}
          {navItems
            .filter(item => {
              if (currentUser?.role !== 'Administrador') return true;
              if (navFilter === 'Todas') return true;
              return item.group === navFilter || !item.group;
            })
            .map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id as View);
                if (isMobile) setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                activeView === item.id 
                  ? "bg-blue-800 text-white shadow-sm" 
                  : "text-blue-200 hover:bg-blue-800/50 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                "shrink-0 transition-colors",
                activeView === item.id ? "text-blue-400" : "group-hover:text-blue-300"
              )} />
              {(sidebarOpen || isMobile) && (
                <span className={cn(
                  "flex-1 text-left text-sm font-semibold tracking-tight",
                  activeView === item.id ? "text-white" : "text-blue-200 group-hover:text-white"
                )}>
                  {item.label}
                </span>
              )}
              {activeView === item.id && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 w-1 h-6 bg-blue-400 rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800 space-y-1">
          <button 
            onClick={() => window.open('https://wa.me/244932590171', '_blank')}
            className="w-full flex items-center gap-3 p-3 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all font-semibold"
          >
            <Phone size={20} />
            {(sidebarOpen || isMobile) && <span>Suporte WhatsApp</span>}
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-semibold"
          >
            <LogOut size={20} />
            {(sidebarOpen || isMobile) && <span>Sair do Sistema</span>}
          </button>
          {!isMobile && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center gap-3 p-3 text-blue-200 hover:text-white transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              {sidebarOpen && <span>Recolher Menu</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1 mr-4">
            {isMobile && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-all active:scale-95"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex-1">
              {isEditingHeader ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <input 
                    type="text" 
                    value={tempHeader.title}
                    onChange={(e) => setTempHeader({ ...tempHeader, title: e.target.value })}
                    className="w-full text-lg font-bold bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    autoFocus
                  />
                  <input 
                    type="text" 
                    value={tempHeader.subtitle}
                    onChange={(e) => setTempHeader({ ...tempHeader, subtitle: e.target.value })}
                    className="w-full text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setViewConfigs({ ...viewConfigs, [activeView]: tempHeader });
                      setIsEditingHeader(false);
                    }}
                    className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 active:scale-95"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => setIsEditingHeader(false)}
                    className="p-2.5 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-all active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                    {viewConfigs[activeView].title}
                  </h2>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {viewConfigs[activeView].subtitle}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setTempHeader(viewConfigs[activeView]);
                    setIsEditingHeader(true);
                  }}
                  className="p-2 text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  title="Editar cabeçalho"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            {/* Connection & Sync Status Indicator */}
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all active:scale-95 text-xs font-black tracking-tight shadow-sm cursor-pointer ${
                isOnline && !isSimulatedOffline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80'
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/80 animate-pulse'
              }`}
              title="Estado de Ligação e Sincronização"
            >
              {isOnline && !isSimulatedOffline ? (
                <>
                  <Wifi size={14} className="text-emerald-500 animate-bounce" />
                  <span className="hidden sm:inline">Online</span>
                  {isSyncing && <RefreshCw size={12} className="animate-spin text-emerald-500 ml-1" />}
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-amber-500" />
                  <span>Offline</span>
                  {syncQueue.length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-bounce ml-1">
                      {syncQueue.length}
                    </span>
                  )}
                </>
              )}
            </button>

            {currentUser?.role === 'Super-Administrador' ? (
              <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-2xl border border-neutral-200">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest hidden lg:inline ml-1">Escola Activa:</span>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => {
                    setSelectedSchoolId(e.target.value);
                  }}
                  className="bg-transparent border-none text-xs font-black text-neutral-800 outline-none pr-2 cursor-pointer focus:ring-0"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              currentSchool && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl text-xs font-black tracking-tight max-w-[200px] sm:max-w-xs truncate shadow-sm">
                  🏫 {currentSchool.name}
                </div>
              )
            )}

            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="pl-11 pr-4 py-2.5 bg-neutral-100 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 rounded-2xl text-sm w-72 transition-all outline-none font-medium"
              />
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-neutral-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-neutral-900 leading-none">{currentUser?.name || 'Administrador'}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">Nível de Acesso Total</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border-2 border-white shadow-sm overflow-hidden ring-1 ring-neutral-200">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'Admin')}&background=random`} alt="Admin" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 hover:text-rose-700 transition-all active:scale-95 flex items-center gap-2"
                title="Sair do Sistema"
              >
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </header>

        {showSubscriptionAlert && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-6 p-4 rounded-2xl border border-rose-200 bg-rose-50 flex items-start gap-4 shadow-sm">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-900 mb-1">
                Atenção: A assinatura da sua instituição encontra-se {currentSchool?.subscription?.status === 'Expirada' ? 'expirada' : 'pendente'}.
              </h3>
              <p className="text-xs font-medium text-rose-700 leading-relaxed mb-3">
                Algumas funcionalidades do sistema foram temporariamente restritas. Por favor, regularize a sua subscrição ({currentSchool?.subscription?.plan || 'N/A'}) para restaurar o acesso total.
              </p>
              <button
                onClick={async () => {
                  if (currentSchool) {
                    const updatedSchool: School = {
                      ...currentSchool,
                      subscription: {
                        plan: currentSchool.subscription?.plan || 'Mensal',
                        startDate: currentSchool.subscription?.startDate || new Date().toISOString().split('T')[0],
                        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: 'Activa'
                      }
                    };
                    const updatedSchools = schools.map(s => s.id === currentSchool.id ? updatedSchool : s);
                    setSchools(updatedSchools);
                    localStorage.setItem('edugest_schools', JSON.stringify(updatedSchools));
                    showToast('Assinatura activada com sucesso! Todas as funcionalidades foram restauradas.', 'success');
                    try {
                      await pushItemToSupabaseWithRetry({
                        type: 'ACTUALIZAR_ESCOLA',
                        data: updatedSchool
                      });
                    } catch (e) {
                      console.error('Erro ao sincronizar activação de escola:', e);
                    }
                  }
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all active:scale-95 shadow-md shadow-rose-600/10 inline-flex items-center gap-2"
              >
                Activar Assinatura Agora
              </button>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && (
                <DashboardView 
                  students={filteredStudents} 
                  classes={filteredClasses} 
                  payments={filteredPayments} 
                  grades={filteredGrades}
                  getGrade={getGrade}
                  isMobile={isMobile}
                  setActiveView={setActiveView}
                  currentUser={currentUser}
                />
              )}
              {activeView === 'announcements' && (
                <AnnouncementsView
                  announcements={announcements}
                  setAnnouncements={setAnnouncements}
                  currentUser={currentUser!}
                  currentSchoolId={currentSchoolId}
                  users={users}
                  showToast={showToast}
                  queueSyncAction={queueSyncAction}
                />
              )}
              {activeView === 'students' && (
                <StudentsView 
                  students={filteredStudents} 
                  classes={filteredClasses} 
                  grades={filteredGrades}
                  onAddStudent={(currentUser?.role === 'Super-Administrador' || currentUser?.role === 'Administrador') && hasActiveSubscription ? (s) => {
                    setStudents([...students, { ...s, schoolId: currentSchoolId || '' }]);
                    showToast('Aluno matriculado com sucesso');
                    queueSyncAction('CADASTRAR_ALUNO', `Matrícula do aluno "${s.name}"`, s);
                  } : undefined}
                  onUpdateStudent={hasActiveSubscription ? (s) => {
                    setStudents(students.map(item => item.id === s.id ? { ...s, schoolId: s.schoolId || currentSchoolId || '' } : item));
                    showToast('Dados do aluno actualizados');
                    queueSyncAction('ACTUALIZAR_ALUNO', `Dados de "${s.name}" actualizados`, s);
                  } : undefined}
                  onDeleteStudent={currentUser?.role !== 'Professor' && hasActiveSubscription ? onDeleteStudent : undefined}
                  getGrade={getGrade}
                  setActiveView={setActiveView}
                  isAdding={isAddingStudent}
                  setIsAdding={setIsAddingStudent}
                  editingStudent={editingStudent}
                  setEditingStudent={setEditingStudent}
                  currentUser={currentUser || undefined}
                  onImportStudents={hasActiveSubscription ? (importedStudents) => {
                    const createdClassesMap: { [key: string]: string } = {};
                    const newClassesToAdd: Class[] = [];

                    importedStudents.forEach(s => {
                      if (s.classId && s.classId.startsWith('new_')) {
                        const originalClassName = s.classId.substring(4);
                        if (!createdClassesMap[originalClassName]) {
                          const newId = 'c_' + Math.random().toString(36).substr(2, 9);
                          createdClassesMap[originalClassName] = newId;
                          
                          let guessedLevel = '7ª Classe';
                          const levelMatch = originalClassName.match(/(\d+)\s*ª?/);
                          if (levelMatch) {
                            guessedLevel = `${levelMatch[1]}ª Classe`;
                          }

                          const newClassObj: Class = {
                            id: newId,
                            name: originalClassName,
                            level: guessedLevel,
                            shift: 'Manhã',
                            room: 'N/A',
                            capacity: 40,
                            subjects: getSubjectsByLevel(guessedLevel) || [],
                            schoolId: currentSchoolId || 's1'
                          };
                          newClassesToAdd.push(newClassObj);
                        }
                      }
                    });

                    if (newClassesToAdd.length > 0) {
                      setClasses(prev => [...prev, ...newClassesToAdd]);
                      newClassesToAdd.forEach(cls => {
                        queueSyncAction('CRIAR_TURMA', `Turma "${cls.name}" criada automaticamente durante importação`, cls);
                      });
                    }

                    const newStudents: Student[] = importedStudents.map(s => {
                      let resolvedClassId = s.classId;
                      if (s.classId && s.classId.startsWith('new_')) {
                        const originalClassName = s.classId.substring(4);
                        resolvedClassId = createdClassesMap[originalClassName] || '';
                      }

                      return {
                        ...s,
                        classId: resolvedClassId,
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        enrollmentDate: new Date().toISOString(),
                        schoolId: currentSchoolId || ''
                      };
                    });

                    setStudents([...students, ...newStudents]);
                    if (newClassesToAdd.length > 0) {
                      showToast(`${newStudents.length} alunos importados e ${newClassesToAdd.length} novas turmas criadas com sucesso!`, 'success');
                    } else {
                      showToast(`${newStudents.length} alunos importados com sucesso!`, 'success');
                    }
                    queueSyncAction('IMPORTAR_ALUNOS', `Importação de ${newStudents.length} alunos`, newStudents);
                  } : undefined}
                />
              )}
              {activeView === 'academic' && (
                <AcademicView 
                  classes={filteredClasses} 
                  students={filteredStudents}
                  grades={filteredGrades}
                  onUpdateGrades={hasActiveSubscription ? (newGrades) => {
                    onUpdateGrades(newGrades);
                    queueSyncAction('ACTUALIZAR_NOTAS', `Actualização de pauta de notas`, newGrades);
                  } : undefined}
                  getGrade={getGrade}
                  teachers={filteredTeachers}
                  onUpdateTeachers={hasActiveSubscription ? (newTeachers) => {
                    const otherSchoolsTeachers = teachers.filter(t => t.schoolId !== currentSchoolId);
                    const withSchoolId = newTeachers.map(t => ({ ...t, schoolId: currentSchoolId || t.schoolId || 's1' }));
                    setTeachers([...otherSchoolsTeachers, ...withSchoolId]);
                    queueSyncAction('ACTUALIZAR_PROFESSORES', `Lista de professores actualizada`, newTeachers);
                  } : undefined}
                  schoolSettings={schoolSettings}
                  showToast={showToast}
                />
              )}
              {activeView === 'finance' && (
                <FinanceView 
                  students={filteredStudents} 
                  payments={filteredPayments}
                  expenses={filteredExpenses}
                  classes={filteredClasses}
                  onAddPayment={hasActiveSubscription ? (p) => {
                    setPayments(prev => [...prev, { ...p, schoolId: currentSchoolId || '' }]);
                    queueSyncAction('REGISTAR_PAGAMENTO', `Pagamento de MZN ${p.amount} (${p.service}) registado para o aluno`, p);
                  } : undefined}
                  onAddExpense={hasActiveSubscription ? (exp) => {
                    setExpenses(prev => [...prev, { ...exp, schoolId: currentSchoolId || '' }]);
                    queueSyncAction('REGISTAR_DESPESA', `Despesa "${exp.description}" (${exp.amount} MZN) registada`, exp);
                  } : undefined}
                  onDeleteExpense={hasActiveSubscription ? (id) => {
                    setExpenses(prev => prev.filter(e => e.id !== id));
                    queueSyncAction('ELIMINAR_DESPESA', `Despesa ID: ${id} eliminada`, { id });
                  } : undefined}
                  onUpdateExpense={hasActiveSubscription ? (exp) => {
                    setExpenses(prev => prev.map(item => item.id === exp.id ? { ...exp, schoolId: exp.schoolId || currentSchoolId || '' } : item));
                    queueSyncAction('ACTUALIZAR_DESPESA', `Despesa "${exp.description}" actualizada`, exp);
                  } : undefined}
                  confirmAction={confirmAction}
                  currentUser={currentUser}
                  schoolName={schools.find(s => s.id === currentSchoolId)?.name}
                  schoolSettings={schoolSettings}
                />
              )}
              {activeView === 'ai-assistant' && (
                <AiAssistantView currentUser={currentUser} />
              )}
              {activeView === 'teachers' && (
                <TeachersView 
                  teachers={filteredTeachers} 
                  classes={filteredClasses}
                  onAddTeacher={hasActiveSubscription ? (t) => {
                    setTeachers([...teachers, { ...t, schoolId: currentSchoolId || '' }]);
                    showToast('Professor cadastrado com sucesso');
                    queueSyncAction('CADASTRAR_PROFESSOR', `Cadastro do professor "${t.name}"`, t);
                  } : undefined}
                  onUpdateTeacher={hasActiveSubscription ? (t) => {
                    setTeachers(teachers.map(item => item.id === t.id ? { ...t, schoolId: t.schoolId || currentSchoolId || '' } : item));
                    showToast('Dados do professor actualizados');
                    queueSyncAction('ACTUALIZAR_PROFESSOR', `Dados de "${t.name}" actualizados`, t);
                  } : undefined}
                  onDeleteTeacher={hasActiveSubscription ? onDeleteTeacher : undefined}
                  showToast={showToast}
                />
              )}
              {activeView === 'classes' && (
                <ClassesView 
                  classes={filteredClasses} 
                  onAddClass={(currentUser?.role === 'Super-Administrador' || currentUser?.role === 'Administrador') && hasActiveSubscription ? (c) => {
                    setClasses([...classes, { ...c, schoolId: currentSchoolId || '' }]);
                    showToast('Turma criada com sucesso');
                    queueSyncAction('CRIAR_TURMA', `Criação da turma "${c.name}"`, c);
                  } : undefined}
                  onUpdateClass={hasActiveSubscription ? (c) => {
                    setClasses(classes.map(item => item.id === c.id ? { ...c, schoolId: c.schoolId || currentSchoolId || '' } : item));
                    showToast('Dados da turma actualizados');
                    queueSyncAction('ACTUALIZAR_TURMA', `Dados da turma "${c.name}" actualizados`, c);
                  } : undefined}
                  onDeleteClass={hasActiveSubscription ? onDeleteClass : undefined}
                  students={filteredStudents}
                  setActiveView={setActiveView}
                  setSelectedListClassId={setSelectedListClassId}
                  schoolSettings={schoolSettings}
                  setSchoolSettings={setSchoolSettings}
                  currentUser={currentUser}
                />
              )}
              {activeView === 'lists' && (
                <ListsView 
                  classes={filteredClasses} 
                  students={filteredStudents}
                  selectedClassId={selectedListClassId}
                  onClassChange={setSelectedListClassId}
                  setActiveView={setActiveView}
                  schoolSettings={schoolSettings}
                  setSchoolSettings={setSchoolSettings}
                  onEditStudent={hasActiveSubscription ? (student) => {
                    setEditingStudent(student);
                    setActiveView('students');
                  } : undefined}
                  onDeleteStudent={currentUser?.role !== 'Professor' && hasActiveSubscription ? onDeleteStudent : undefined}
                  onExportPDF={exportClassStudentListPDF}
                />
              )}
              {activeView === 'mini-pautas' && (
                <MiniPautasView 
                  classes={filteredClasses} 
                  students={filteredStudents}
                  grades={filteredGrades}
                  onUpdateGrades={onUpdateGrades}
                  getGrade={getGrade}
                  schoolSettings={schoolSettings}
                  setSchoolSettings={setSchoolSettings}
                  currentUser={currentUser}
                  showToast={showToast}
                />
              )}
              {activeView === 'pauta-final' && (
                <PautaFinalView 
                  classes={filteredClasses} 
                  students={filteredStudents}
                  grades={filteredGrades}
                  getGrade={getGrade}
                  schoolSettings={schoolSettings}
                  setSchoolSettings={setSchoolSettings}
                  onIssueCertificate={(studentId, bulkIds) => {
                    setCertInitData({ studentId, tab: 'issue', bulkIds });
                    setActiveView('certificates');
                  }}
                  showToast={showToast}
                  currentUser={currentUser}
                />
              )}
              {activeView === 'boletim' && (
                <BoletimView 
                  students={currentUser?.role === 'Aluno' ? filteredStudents.filter(s => s.id === currentUser.studentId || s.name === currentUser.name) : filteredStudents}
                  classes={filteredClasses}
                  grades={filteredGrades}
                  getGrade={getGrade}
                  schoolSettings={schoolSettings}
                  setSchoolSettings={setSchoolSettings}
                  currentUser={currentUser}
                />
              )}
              {activeView === 'certificates' && (
                <CertificatesView 
                  students={filteredStudents}
                  classes={filteredClasses}
                  templates={filteredTemplates}
                  onUpdateTemplates={hasActiveSubscription ? (newTemplates) => {
                    const otherSchoolsTemplates = templates.filter(t => t.schoolId !== currentSchoolId);
                    const withSchoolId = newTemplates.map(t => ({ ...t, schoolId: currentSchoolId || t.schoolId || 's1' }));
                    setTemplates([...otherSchoolsTemplates, ...withSchoolId]);
                  } : undefined}
                  schoolSettings={schoolSettings}
                  initialStudentId={certInitData.studentId}
                  initialTab={certInitData.tab}
                  initialBulkIds={certInitData.bulkIds}
                  getGrade={getGrade}
                />
              )}
              {activeView === 'users' && (
                <UsersView 
                  users={filteredUsers}
                  onAddUser={hasActiveSubscription ? onAddUser : undefined}
                  onUpdateUser={hasActiveSubscription ? onUpdateUser : undefined}
                  onDeleteUser={hasActiveSubscription ? onDeleteUser : undefined}
                  showToast={showToast}
                  currentUser={currentUser}
                  schools={schools}
                  classes={classes}
                  students={students}
                />
              )}
              {activeView === 'profile' && (
                <ProfileView 
                  currentUser={currentUser!}
                  users={users}
                  setUsers={setUsers}
                  setCurrentUser={setCurrentUser}
                  showToast={showToast}
                  onUpdateUser={onUpdateUser}
                />
              )}

              {activeView === 'schools' && (
                <SchoolsView 
                  schools={schools}
                  onAddSchool={handleAddSchool}
                  onUpdateSchool={handleUpdateSchool}
                  onDeleteSchool={handleDeleteSchool}
                  users={users}
                  showToast={showToast}
                  currentUser={currentUser}
                />
              )}

              {activeView === 'backup' && (
                <BackupView 
                  onExport={onExportData}
                  onImport={onImportData}
                />
              )}

              {activeView === 'audit' && (
                <AuditView 
                  logs={auditLogs}
                  onClearLogs={() => {
                    setAuditLogs([]);
                    localStorage.removeItem('edugest_audit_logs');
                    showToast('Histórico de auditoria limpo com sucesso', 'success');
                  }}
                />
              )}

              {activeView === 'settings' && (
                <SettingsView 
                  schoolSettings={schoolSettings}
                  showToast={showToast}
                  setSchoolSettings={(newSettings) => {
                    setSchoolSettings(newSettings);
                    localStorage.setItem('edugest_school_settings', JSON.stringify(newSettings));
                    if (currentSchoolId) {
                      const updatedSchools = schools.map(s => s.id === currentSchoolId ? {
                        ...s,
                        name: newSettings.nomeEscola,
                        republica: newSettings.republica,
                        governoProvincia: newSettings.governoProvincia,
                        administracaoMunicipal: newSettings.administracaoMunicipal,
                        direccaoMunicipal: newSettings.direccaoMunicipal,
                        anoLectivo: newSettings.anoLectivo,
                        logoBase64: newSettings.logoBase64,
                      } : s);
                      setSchools(updatedSchools);
                      localStorage.setItem('edugest_schools', JSON.stringify(updatedSchools));
                      pushItemToSupabaseWithRetry({
                        type: 'ACTUALIZAR_ESCOLA',
                        data: updatedSchools.find(s => s.id === currentSchoolId)
                      }).catch(e => console.error(e));
                    }
                  }}
                />
              )}
              {activeView === 'calendar' && (
                <CalendarView />
              )}
              {activeView === 'archive' && (
                <ArchiveView />
              )}
              {activeView === 'exams' && (
                <ExamsView classes={filteredClasses} students={filteredStudents} />
              )}
              {activeView === 'transfers' && (
                <TransfersView students={filteredStudents} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />

      {/* Offline & Sync Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-100 animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-blue-500/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isOnline && !isSimulatedOffline ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {isOnline && !isSimulatedOffline ? <Wifi size={22} className="animate-pulse" /> : <WifiOff size={22} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">Integração Supabase Cloud</h3>
                  <p className="text-xs text-neutral-500">Tecnologia Offline-First & Sincronização em Tempo Real</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-neutral-100 px-6 bg-neutral-50/50">
              <button
                onClick={() => setSyncModalTab('status')}
                className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  syncModalTab === 'status' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Conectividade & Fila ({syncQueue.length})
              </button>
              <button
                onClick={() => setSyncModalTab('data')}
                className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  syncModalTab === 'data' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Transferência de Dados
              </button>
              <button
                onClick={() => setSyncModalTab('sql')}
                className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  syncModalTab === 'sql' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Script SQL (Supabase)
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {syncModalTab === 'status' && (
                <>
                  {/* Connection Toggle Panel */}
                  <div className="p-5 bg-neutral-50 rounded-3xl border border-neutral-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Simulador de Conectividade</h4>
                        <p className="text-sm font-bold text-neutral-800 mt-1">
                          Estado: {isOnline && !isSimulatedOffline ? (
                            <span className="text-emerald-600 font-black">LIGADO À INTERNET (Nuvem Activa)</span>
                          ) : (
                            <span className="text-amber-600 font-black">OFFLINE (Modo Local Seguro)</span>
                          )}
                        </p>
                      </div>
                      {/* Custom Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={!isSimulatedOffline}
                          onChange={(e) => {
                            const newOnlineState = !e.target.checked;
                            setIsSimulatedOffline(newOnlineState);
                            showToast(newOnlineState ? 'Modo Offline Simulado Activo' : 'Ligação restaurada, a reconectar...', 'info');
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Use o interruptor acima para simular a perda de ligação à Internet. Quando estiver Offline, todas as suas ações (matrículas, pautas, pagamentos) serão guardadas de forma segura localmente no navegador e enviadas automaticamente quando voltar Online.
                    </p>
                  </div>

                  {/* Sync Queue List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Fila de Alterações Locais ({syncQueue.length})</h4>
                      {syncQueue.length > 0 && (
                        <button 
                          onClick={() => {
                            confirmAction(
                              'Limpar Fila de Alterações',
                              'Tem a certeza de que deseja limpar a fila local? Todas as alterações feitas offline serão descartadas permanentemente.',
                              () => {
                                setSyncQueue([]);
                                localStorage.removeItem('edugest_sync_queue');
                                showToast('Fila de alterações limpa', 'warning');
                              }
                            );
                          }}
                          className="text-[10px] font-black text-rose-600 hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Limpar Fila
                        </button>
                      )}
                    </div>

                    {syncQueue.length > 0 ? (
                      <div className="border border-neutral-100 rounded-3xl divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                        {syncQueue.map((item) => (
                          <div key={item.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-neutral-50/50 transition-colors">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-neutral-800">{item.description}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-md uppercase">
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  {item.timestamp}
                                </span>
                              </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-emerald-50/50 border border-emerald-100/80 rounded-3xl text-center space-y-2">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                        <p className="text-xs font-bold text-emerald-800">Tudo Sincronizado!</p>
                        <p className="text-[11px] text-emerald-600">Todas as operações estão gravadas em segurança na base de dados central do Supabase.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {syncModalTab === 'data' && (
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl">
                    <p className="text-xs font-bold text-emerald-800">Conexão Estabelecida com o Supabase</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">URL: {SUPABASE_URL}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Export Card */}
                    <div className="p-5 bg-white border border-neutral-200/80 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="p-2 w-max bg-blue-50 text-blue-600 rounded-xl">
                          <Upload size={18} />
                        </div>
                        <h4 className="text-sm font-black text-neutral-900">Exportar para o Supabase</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          Semeia todo o armazenamento local atual (escolas, turmas, alunos, notas, despesas e pagamentos) diretamente para as tabelas no Supabase.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          confirmAction(
                            'Sincronizar e Exportar tudo',
                            'Esta ação irá enviar todos os seus dados locais para o Supabase, integrando com as tabelas na nuvem. Deseja continuar?',
                            handleExportAllToSupabase
                          );
                        }}
                        disabled={isSyncing}
                        className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={12} />
                        <span>Semeador (Exportar Tudo)</span>
                      </button>
                    </div>

                    {/* Import Card */}
                    <div className="p-5 bg-white border border-neutral-200/80 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="p-2 w-max bg-emerald-50 text-emerald-600 rounded-xl">
                          <Download size={18} />
                        </div>
                        <h4 className="text-sm font-black text-neutral-900">Importar do Supabase</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          Puxa e atualiza todo o seu painel de administração local com os dados reais salvos no seu banco de dados relacional em nuvem.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          confirmAction(
                            'Importar todos os dados',
                            'Tem a certeza de que deseja carregar os dados do Supabase? Isto irá atualizar os dados no seu navegador para corresponder à nuvem.',
                            handleImportAllFromSupabase
                          );
                        }}
                        disabled={isSyncing}
                        className="w-full mt-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={12} />
                        <span>Sincronizar (Importar Tudo)</span>
                      </button>
                    </div>

                    {/* Clear All Database Data (Começar do Zero) */}
                    <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-3xl space-y-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between sm:col-span-2">
                      <div className="space-y-2">
                        <div className="p-2 w-max bg-rose-100 text-rose-600 rounded-xl">
                          <Trash2 size={18} />
                        </div>
                        <h4 className="text-sm font-black text-rose-950">Limpar Banco de Dados (Recomeçar do Zero)</h4>
                        <p className="text-xs text-rose-800 leading-relaxed">
                          Esta ação irá <span className="font-bold">eliminar permanentemente</span> todos os dados de escolas, turmas, alunos, professores, pautas, pagamentos e despesas tanto no Supabase quanto localmente neste navegador. Use esta opção para iniciar novos cadastros do zero.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          confirmAction(
                            'LIMPAR BANCO DE DADOS E DADOS LOCAIS',
                            'ATENÇÃO EXTREMA: Esta acção é irreversível! Irá apagar todos os dados de escolas, turmas, alunos e demais registos na base de dados do Supabase e no armazenamento local deste navegador. Deseja prosseguir?',
                            handleClearAllSupabaseData
                          );
                        }}
                        disabled={isSyncing}
                        className="w-full mt-2 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        <Trash2 size={12} />
                        <span>Limpar Toda a Base de Dados (Remoto + Local)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {syncModalTab === 'sql' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Passo Único: Configuração SQL no Supabase</h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Para que as operações em nuvem funcionem perfeitamente, copie o código abaixo e execute-o na aba <span className="font-bold">SQL Editor</span> no painel do seu projeto do Supabase. Isso criará todas as tabelas com suporte relacional e as regras de segurança apropriadas.
                    </p>
                  </div>

                  <div className="relative">
                    <pre className="p-4 bg-neutral-900 text-neutral-200 text-[10px] font-mono rounded-2xl max-h-56 overflow-y-auto whitespace-pre leading-relaxed select-text border border-neutral-800">
                      {SUPABASE_SQL_SCHEMA}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                        showToast('Script SQL copiado para a área de transferência!', 'success');
                      }}
                      className="absolute top-3 right-3 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl transition-all cursor-pointer border border-neutral-700 active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                      title="Copiar Script"
                    >
                      <Copy size={12} />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-2xl font-bold text-xs hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Fechar
              </button>
              {syncQueue.length > 0 && syncModalTab === 'status' && (
                <button 
                  onClick={async () => {
                    if (!isOnline || isSimulatedOffline) {
                      showToast('Impossível sincronizar. Ligue-se à internet primeiro!', 'error');
                      return;
                    }
                    setIsSyncing(true);
                    showToast('Sincronização manual iniciada...', 'info');
                    
                    const cleanQueue = validateAndCleanSyncQueue(syncQueue);
                    if (cleanQueue.length !== syncQueue.length) {
                      setSyncQueue(cleanQueue);
                      localStorage.setItem('edugest_sync_queue', JSON.stringify(cleanQueue));
                    }

                    let successCount = 0;
                    const failedItems = [];
                    
                    for (const item of cleanQueue) {
                      try {
                        await pushItemToSupabaseWithRetry({ type: item.type, data: item.data }, 3, 1000, 8000);
                        successCount++;
                      } catch (e) {
                        console.error(`Erro na sincronização manual para o item ${item.id}:`, e);
                        failedItems.push(item);
                      }
                    }
                    
                    setSyncQueue(failedItems);
                    setIsSyncing(false);
                    
                    if (failedItems.length > 0) {
                      localStorage.setItem('edugest_sync_queue', JSON.stringify(failedItems));
                      showToast(`Sincronização parcial: ${failedItems.length} restantes.`, 'warning');
                      setSyncRetryCount(prev => prev + 1);
                    } else {
                      localStorage.removeItem('edugest_sync_queue');
                      showToast('Todos os dados sincronizados com sucesso!', 'success');
                      setSyncRetryCount(0);
                    }
                  }}
                  disabled={isSyncing || !isOnline || isSimulatedOffline}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-200"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Sincronizar Agora ({syncQueue.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Custom Feedback Components ---

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info' | 'warning', onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={20} />,
    error: <XCircle className="text-rose-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />
  };

  const bgColors = {
    success: "bg-emerald-50 border-emerald-100",
    error: "bg-rose-50 border-rose-100",
    info: "bg-blue-50 border-blue-100",
    warning: "bg-amber-50 border-amber-100"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "fixed bottom-8 right-8 z-[100] p-4 rounded-2xl border shadow-2xl flex items-center gap-4 min-w-[300px] max-w-md",
        bgColors[type]
      )}
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <p className="text-sm font-bold text-neutral-800 flex-1">{message}</p>
      <button 
        onClick={onClose}
        className="text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">{title}</h3>
              <p className="text-neutral-500 font-bold leading-relaxed">{message}</p>
            </div>
            <div className="p-6 bg-neutral-50 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-3 rounded-xl font-black text-neutral-600 hover:bg-neutral-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="px-8 py-3 rounded-xl font-black bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ListsView({ classes, students, selectedClassId, onClassChange, setActiveView, schoolSettings, setSchoolSettings, onEditStudent, onDeleteStudent, onExportPDF }: { 
  classes: Class[], 
  students: Student[],
  selectedClassId: string,
  onClassChange: (id: string) => void,
  setActiveView: (view: View) => void,
  schoolSettings: SchoolSettings,
  setSchoolSettings: (s: SchoolSettings) => void,
  onEditStudent?: (s: Student) => void,
  onDeleteStudent?: (id: string) => void,
  onExportPDF?: (cls: Class, paperSize?: 'A4' | 'A3' | 'A5') => void
} ) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'A5'>('A4');
  const currentClassId = selectedClassId || classes[0]?.id || '';

  const selectedClass = classes.find(c => c.id === currentClassId);
  const classStudents = students
    .filter(s => s.classId === currentClassId)
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.bi.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const calculateAge = (birthDate: string): number | string => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return '-';
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const exportToExcel = () => {
    if (!selectedClass) return;
    const data = classStudents.map((s, i) => ({
      'Nº': i + 1,
      'Nome Completo': s.name,
      'Gênero': s.gender,
      'Idade': calculateAge(s.birthDate),
      'BI': s.bi,
      'Estado': s.enrollmentStatus
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Alunos');
    XLSX.writeFile(wb, `Lista_${selectedClass.name}.xlsx`);
  };

  const maxListStudents = classStudents.slice(0, 45);
  const paddedStudents = Array.from({ length: 45 }, (_, i) => maxListStudents[i] || null);

  const config = {
    A3: {
      cardMaxW: "max-w-5xl",
      tableHeaderPadding: "px-4 py-4 sm:py-5 print:py-2.5 print:px-3",
      tableCellPadding: "px-4 py-3 sm:py-4 print:px-3 print:py-1.5",
      fontSize: "text-base print:text-[11px]",
      headerTitleSize: "text-2xl sm:text-3xl print:text-2xl",
      metaLabelSize: "text-[9px] print:text-[10px]",
      metaValueSize: "text-sm print:text-base",
      badgeSize: "print:border print:px-2 print:py-0.5 print:text-[9.5px]",
      sigLineSize: "text-sm print:text-[11px]",
      sigTitleSize: "text-base print:text-[12px]"
    },
    A4: {
      cardMaxW: "max-w-4xl",
      tableHeaderPadding: "px-4 py-4 print:py-1 print:px-2",
      tableCellPadding: "px-4 py-3 sm:py-4 print:px-2 print:py-0.5",
      fontSize: "text-sm print:text-[8.5px]",
      headerTitleSize: "text-2xl sm:text-3xl print:text-lg",
      metaLabelSize: "text-[9px] print:text-[9px]",
      metaValueSize: "text-sm print:text-xs",
      badgeSize: "print:border print:px-1 print:py-0 print:text-[7.5px]",
      sigLineSize: "text-xs print:text-[9px]",
      sigTitleSize: "text-sm print:text-[10px]"
    },
    A5: {
      cardMaxW: "max-w-2xl",
      tableHeaderPadding: "px-4 py-3 print:py-0.5 print:px-1.5",
      tableCellPadding: "px-4 py-2 print:px-1.5 print:py-0.5",
      fontSize: "text-xs print:text-[6.5px]",
      headerTitleSize: "text-xl sm:text-2xl print:text-xs",
      metaLabelSize: "text-[8px] print:text-[7px]",
      metaValueSize: "text-xs print:text-[8.5px]",
      badgeSize: "print:border print:px-0.5 print:py-0 print:text-[5.5px]",
      sigLineSize: "text-[9px] print:text-[6.5px]",
      sigTitleSize: "text-[10px] print:text-[7px]"
    }
  }[paperSize];

  return (
    <div className="space-y-8 print:space-y-0 print:p-0 print:m-0">
      <style>{`
        @media print {
          @page {
            size: ${paperSize.toLowerCase()} portrait !important;
            margin: ${paperSize === 'A5' ? '8mm' : paperSize === 'A3' ? '15mm' : '10mm'} !important;
          }
          .print-sheet-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Custom size adaptations for printing */
          ${paperSize === 'A3' ? `
            .print-sheet-container, .print-sheet-container * {
              font-size: 11pt !important;
            }
            .print-sheet-container h2 {
              font-size: 18pt !important;
            }
            .print-sheet-container h1,
            .print-sheet-container h3,
            .print-sheet-container h4,
            .print-sheet-container h5 {
              font-size: 12pt !important;
            }
            .print-sheet-container table th {
              font-size: 11pt !important;
              padding: 10px 12px !important;
            }
            .print-sheet-container table td {
              font-size: 11pt !important;
              padding: 8px 12px !important;
            }
            .print-sheet-container img {
              width: 22mm !important;
              height: 22mm !important;
            }
          ` : ''}
          ${paperSize === 'A5' ? `
            .print-sheet-container, .print-sheet-container * {
              font-size: 6.5pt !important;
            }
            .print-sheet-container h2 {
              font-size: 9.5pt !important;
            }
            .print-sheet-container h1,
            .print-sheet-container h3,
            .print-sheet-container h4,
            .print-sheet-container h5 {
              font-size: 7.5pt !important;
            }
            .print-sheet-container table th {
              font-size: 6.5pt !important;
              padding: 2px 4px !important;
            }
            .print-sheet-container table td {
              font-size: 6.5pt !important;
              padding: 2px 4px !important;
            }
            .print-sheet-container img {
              width: 11mm !important;
              height: 11mm !important;
            }
          ` : ''}
        }
      `}</style>

      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm no-print print:hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setActiveView('classes')}
              className="p-3 bg-white border border-neutral-200 rounded-2xl text-neutral-400 hover:text-emerald-600 hover:border-emerald-100 transition-all active:scale-95"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Layers size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Seleccionar Turma</p>
              <select 
                value={currentClassId}
                onChange={(e) => onClassChange(e.target.value)}
                className="w-full sm:w-64 bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar na lista..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold w-full sm:w-64 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-1.5 bg-neutral-100/80 p-1.5 rounded-2xl border border-neutral-200/50 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-2">Tamanho:</span>
            {(['A4', 'A3', 'A5'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setPaperSize(size)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-black rounded-xl transition-all active:scale-95",
                  paperSize === size
                    ? "bg-white text-emerald-600 shadow-sm border border-neutral-200/20"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-2xl font-bold text-xs hover:bg-neutral-50 transition-all active:scale-95 shadow-sm"
            >
              <Printer size={16} />
              Imprimir
            </button>
            {onExportPDF && selectedClass && (
              <button 
                onClick={() => onExportPDF(selectedClass, paperSize)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
              >
                <FileDown size={16} />
                PDF ({paperSize})
              </button>
            )}
            <button 
              onClick={exportToExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-2xl font-bold text-xs hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {selectedClass ? (
        <div className={cn(
          "bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:mx-auto print-sheet-container transition-all duration-300",
          config.cardMaxW
        )}>
          <OfficialHeader 
            settings={schoolSettings} 
            setSettings={setSchoolSettings} 
            extraInfo={{ classe: selectedClass.level, periodo: selectedClass.shift }}
          />
          <div className="border-b border-neutral-200 bg-neutral-50/50 rounded-2xl p-6 mb-6 print:bg-transparent print:p-2 print:mb-4 print:border-b">
            <div className="text-center space-y-3 print:space-y-1">
              <h2 className={cn("font-black text-neutral-900 tracking-tight uppercase", config.headerTitleSize)}>Lista Nominal de Alunos</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center max-w-3xl mx-auto border-t border-neutral-200 pt-3 mt-2 print:pt-1 print:gap-2 print:border-t">
                <div>
                  <p className={cn("font-black text-neutral-400 uppercase tracking-wider", config.metaLabelSize)}>Turma</p>
                  <p className={cn("font-black text-neutral-800 uppercase", config.metaValueSize)}>{selectedClass.name}</p>
                </div>
                <div>
                  <p className={cn("font-black text-neutral-400 uppercase tracking-wider", config.metaLabelSize)}>Classe</p>
                  <p className={cn("font-black text-neutral-800 uppercase", config.metaValueSize)}>{selectedClass.level}</p>
                </div>
                <div>
                  <p className={cn("font-black text-neutral-400 uppercase tracking-wider", config.metaLabelSize)}>Ano Lectivo</p>
                  <p className={cn("font-black text-neutral-800 uppercase", config.metaValueSize)}>{schoolSettings.anoLectivo}</p>
                </div>
                <div>
                  <p className={cn("font-black text-neutral-400 uppercase tracking-wider", config.metaLabelSize)}>Sala</p>
                  <p className={cn("font-black text-neutral-800 uppercase", config.metaValueSize)}>{selectedClass.room || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full print:p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px] print:min-w-0">
                <thead>
                  <tr className="border-b-2 border-neutral-900 print:border-b">
                    <th className={cn("text-[10px] font-black text-neutral-900 uppercase tracking-widest w-16", config.tableHeaderPadding)}>Nº</th>
                    <th className={cn("text-[10px] font-black text-neutral-900 uppercase tracking-widest", config.tableHeaderPadding)}>Nome Completo</th>
                    <th className={cn("text-[10px] font-black text-neutral-900 uppercase tracking-widest w-24 text-center sm:text-left", config.tableHeaderPadding)}>Gênero</th>
                    <th className={cn("text-[10px] font-black text-neutral-900 uppercase tracking-widest w-24 text-center sm:text-left", config.tableHeaderPadding)}>Idade</th>
                    <th className={cn("text-[10px] font-black text-neutral-900 uppercase tracking-widest w-40", config.tableHeaderPadding)}>Documento BI</th>
                    <th className={cn("text-[10px] font-black text-neutral-900 uppercase tracking-widest w-32", config.tableHeaderPadding)}>Estado</th>
                    {(onEditStudent || onDeleteStudent) && <th className="px-4 py-4 text-[10px] font-black text-neutral-900 uppercase tracking-widest print:hidden w-24">Acções</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 print:divide-neutral-200">
                  {paddedStudents.map((student, index) => {
                    if (student) {
                      return (
                        <tr key={student.id} className="hover:bg-neutral-50 transition-colors border-b border-neutral-100 print:border-neutral-200">
                          <td className={cn("font-black text-neutral-400", config.tableCellPadding, config.fontSize)}>{index + 1}</td>
                          <td className={cn("font-bold text-neutral-900 uppercase tracking-tight", config.tableCellPadding, config.fontSize)}>{student.name}</td>
                          <td className={cn("font-bold text-neutral-500 text-center sm:text-left", config.tableCellPadding, config.fontSize)}>{student.gender}</td>
                          <td className={cn("font-bold text-neutral-500 text-center sm:text-left", config.tableCellPadding, config.fontSize)}>{calculateAge(student.birthDate)}</td>
                          <td className={cn("font-mono font-bold text-neutral-400", config.tableCellPadding, config.fontSize)}>{student.bi}</td>
                          <td className={config.tableCellPadding}>
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest print:border",
                              student.enrollmentStatus === 'Confirmado' ? "bg-emerald-100 text-emerald-700 print:bg-transparent print:text-emerald-800 print:border-emerald-300" :
                              student.enrollmentStatus === 'Matriculado' ? "bg-blue-100 text-blue-700 print:bg-transparent print:text-blue-800 print:border-blue-300" :
                              student.enrollmentStatus === 'Pendente' ? "bg-amber-100 text-amber-700 print:bg-transparent print:text-amber-800 print:border-amber-300" :
                              "bg-rose-100 text-rose-700 print:bg-transparent print:text-rose-800 print:border-rose-300",
                              config.badgeSize
                            )}>
                              {student.enrollmentStatus}
                            </span>
                          </td>
                          {(onEditStudent || onDeleteStudent) && (
                            <td className="px-4 py-3 sm:py-4 print:hidden">
                              <div className="flex gap-2">
                                {onEditStudent && (
                                  <button 
                                    onClick={() => onEditStudent(student)}
                                    className="p-2 bg-neutral-100 text-neutral-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                                    title="Editar Aluno"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                                {onDeleteStudent && (
                                  <button 
                                    onClick={() => onDeleteStudent(student.id)}
                                    className="p-2 bg-neutral-100 text-neutral-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                                    title="Eliminar Aluno"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={`empty-${index}`} className="border-b border-neutral-100 print:border-neutral-200">
                          <td className={cn("font-black text-neutral-300", config.tableCellPadding, config.fontSize)}>{index + 1}</td>
                          <td className={cn("text-neutral-300", config.tableCellPadding, config.fontSize)}>-</td>
                          <td className={cn("text-neutral-300 text-center sm:text-left", config.tableCellPadding, config.fontSize)}>-</td>
                          <td className={cn("text-neutral-300 text-center sm:text-left", config.tableCellPadding, config.fontSize)}>-</td>
                          <td className={cn("text-neutral-300", config.tableCellPadding, config.fontSize)}>-</td>
                          <td className={cn("text-neutral-300", config.tableCellPadding, config.fontSize)}>-</td>
                          {(onEditStudent || onDeleteStudent) && (
                            <td className="px-4 py-3 sm:py-4 print:hidden"></td>
                          )}
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Espaço de Assinaturas e Data */}
          <div className={cn("mt-10 pt-8 border-t border-neutral-100 print:mt-6 print:pt-4 space-y-6 px-4 sm:px-6 lg:px-8", config.sigLineSize)}>
            <div className="flex justify-end text-neutral-800 font-bold uppercase tracking-wide">
              <span>Em _________________________, aos _____ de _________________ de 20____</span>
            </div>
            
            <div className="grid grid-cols-3 gap-6 text-center mt-6 print:grid-cols-3">
              <div className="flex flex-col items-center">
                <span className={cn("font-black text-neutral-900 uppercase tracking-wider", config.sigTitleSize)}>O Professor</span>
                <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
                <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
              </div>
              <div className="flex flex-col items-center">
                <span className={cn("font-black text-neutral-900 uppercase tracking-wider", config.sigTitleSize)}>O Subdirector Pedagógico</span>
                <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
                <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
              </div>
              <div className="flex flex-col items-center">
                <span className={cn("font-black text-neutral-900 uppercase tracking-wider", config.sigTitleSize)}>O Director da Escola</span>
                <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
                <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 no-print print:hidden">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Total de Alunos: {classStudents.length}
            </div>
            <div className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">
              B.A GestEscola • Sistema de Gestão Escolar
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-20 rounded-[40px] border border-neutral-200 text-center">
          <p className="text-neutral-400 font-bold">Nenhuma turma seleccionada</p>
        </div>
      )}
    </div>
  );
}

interface SchoolSettings {
  republica: string;
  governoProvincia: string;
  administracaoMunicipal: string;
  direccaoMunicipal: string;
  nomeEscola: string;
  anoLectivo: string;
  customLevels?: string[];
  logoBase64?: string;
}

const getImageFormat = (dataUrl: string | null): 'PNG' | 'JPEG' | 'WEBP' => {
  if (!dataUrl) return 'PNG';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'PNG';
};

const loadAngolaInsignia = (customLogo?: string): Promise<string | null> => {
  if (customLogo) {
    return Promise.resolve(customLogo);
  }
  try {
    const saved = localStorage.getItem('edugest_school_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.logoBase64) {
        return Promise.resolve(parsed.logoBase64);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
  });
};

function OfficialHeader({ settings, setSettings, className, extraInfo }: { 
  settings: SchoolSettings, 
  setSettings?: (s: SchoolSettings) => void,
  className?: string,
  extraInfo?: { classe?: string, periodo?: string }
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    if (setSettings) setSettings(localSettings);
    setIsEditing(false);
  };

  return (
    <div className={cn("text-center space-y-1 mb-8 print:mb-4", className)}>
      <div className="relative group inline-block w-full">
        {isEditing ? (
          <div className="space-y-2 bg-neutral-50 p-4 rounded-2xl border border-neutral-200 no-print">
            <div className="flex justify-center mb-2">
              <img 
                src={localSettings.logoBase64 || "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png"} 
                alt="Logomarca" 
                className="w-12 h-12 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <input 
              className="w-full text-center bg-white border border-neutral-200 rounded-lg py-1 px-2 text-[12px] font-black"
              value={localSettings.republica}
              onChange={e => setLocalSettings({...localSettings, republica: e.target.value})}
              placeholder="República"
            />
            <input 
              className="w-full text-center bg-white border border-neutral-200 rounded-lg py-1 px-2 text-[12px] font-black"
              value={localSettings.governoProvincia}
              onChange={e => setLocalSettings({...localSettings, governoProvincia: e.target.value})}
              placeholder="Governo Provincial"
            />
            <input 
              className="w-full text-center bg-white border border-neutral-200 rounded-lg py-1 px-2 text-[12px] font-black"
              value={localSettings.administracaoMunicipal}
              onChange={e => setLocalSettings({...localSettings, administracaoMunicipal: e.target.value})}
              placeholder="Administração Municipal"
            />
            <input 
              className="w-full text-center bg-white border border-neutral-200 rounded-lg py-1 px-2 text-[12px] font-black"
              value={localSettings.direccaoMunicipal}
              onChange={e => setLocalSettings({...localSettings, direccaoMunicipal: e.target.value})}
              placeholder="Direcção Municipal"
            />
            <input 
              className="w-full text-center bg-white border border-neutral-200 rounded-lg py-1 px-2 text-[12px] font-black"
              value={localSettings.nomeEscola}
              onChange={e => setLocalSettings({...localSettings, nomeEscola: e.target.value})}
              placeholder="Nome da Escola"
            />
            <input 
              className="w-full text-center bg-white border border-neutral-200 rounded-lg py-1 px-2 text-[12px] font-black"
              value={localSettings.anoLectivo}
              onChange={e => setLocalSettings({...localSettings, anoLectivo: e.target.value})}
              placeholder="Ano Lectivo"
            />
            <button 
              onClick={handleSave}
              className="bg-neutral-900 text-white px-4 py-1.5 rounded-lg text-xs font-black w-full"
            >
              Guardar Cabeçalho
            </button>
          </div>
        ) : (
          <div className="cursor-pointer hover:bg-neutral-50 p-4 print:p-0 rounded-xl transition-colors relative" onClick={() => setSettings && setIsEditing(true)}>
            <div className="flex justify-center mb-4 print:mb-2">
              <img 
                src={settings.logoBase64 || "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png"} 
                alt={settings.logoBase64 ? "Logomarca da Escola" : "Insígnia da República de Angola"} 
                className="w-16 h-16 print:w-12 print:h-12 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-0.5 text-[12px] print:text-[10px] font-bold text-neutral-900 uppercase">
              <h1 className="tracking-widest">{settings.republica}</h1>
              <h2 className="tracking-widest">{settings.governoProvincia}</h2>
              <h3 className="tracking-widest">{settings.administracaoMunicipal}</h3>
              <h4 className="tracking-widest">{settings.direccaoMunicipal}</h4>
              <h5 className="tracking-widest">{settings.nomeEscola}</h5>
            </div>
            <div className="flex items-center justify-center gap-8 mt-4 print:mt-2 text-[12px] print:text-[10px] font-bold text-neutral-700">
              <span>Ano lectivo: {settings.anoLectivo}</span>
              {extraInfo?.classe && <span>Classe: {extraInfo.classe}</span>}
              {extraInfo?.periodo && <span>Período: {extraInfo.periodo}</span>}
            </div>
            {setSettings && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                <Pencil size={14} className="text-neutral-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ schoolSettings, setSchoolSettings, showToast }: { 
  schoolSettings: SchoolSettings, 
  setSchoolSettings: (s: SchoolSettings) => void,
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [localSettings, setLocalSettings] = useState(schoolSettings);

  useEffect(() => {
    setLocalSettings(schoolSettings);
  }, [schoolSettings]);

  const handleSave = () => {
    setSchoolSettings(localSettings);
    if (showToast) {
      showToast('Configurações e logótipo guardados com sucesso! O logótipo foi aplicado automaticamente em todos os recibos e certificados.', 'success');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLocalSettings({
            ...localSettings,
            logoBase64: event.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white">
            <Settings size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Configurações do Sistema</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ajustes globais e informações da instituição</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-3 bg-neutral-50/50 p-6 rounded-[32px] border border-dashed border-neutral-200">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Logomarca Oficial da Escola</label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group w-32 h-32 rounded-3xl bg-white border border-neutral-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                  {localSettings.logoBase64 ? (
                    <>
                      <img src={localSettings.logoBase64} alt="Logomarca da Escola" className="w-full h-full object-contain p-2" />
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, logoBase64: undefined })}
                        className="absolute inset-0 bg-neutral-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs cursor-pointer"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png" 
                        alt="Insígnia de Angola (Padrão)" 
                        className="w-14 h-14 object-contain opacity-40 mx-auto"
                      />
                      <span className="text-[8px] font-black text-neutral-400 block mt-1.5 uppercase">Padrão Insígnia</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 w-full space-y-2">
                  <div className="border border-neutral-200 bg-white rounded-2xl p-4 text-center hover:border-neutral-400 transition-all relative cursor-pointer shadow-sm">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={18} className="text-neutral-500" />
                      <span className="text-xs font-black text-neutral-800">Carregar Logomarca da Escola</span>
                      <span className="text-[10px] text-neutral-400 font-bold">Arraste a imagem ou clique para selecionar (Formatos: PNG, JPG)</span>
                    </div>
                  </div>
                  {localSettings.logoBase64 && (
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 ml-1">
                      <Check size={12} /> Logomarca personalizada pronta para guardar!
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">República</label>
              <input 
                type="text"
                value={localSettings.republica}
                onChange={(e) => setLocalSettings({ ...localSettings, republica: e.target.value })}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Governo Provincial</label>
              <input 
                type="text"
                value={localSettings.governoProvincia}
                onChange={(e) => setLocalSettings({ ...localSettings, governoProvincia: e.target.value })}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Administração Municipal</label>
              <input 
                type="text"
                value={localSettings.administracaoMunicipal}
                onChange={(e) => setLocalSettings({ ...localSettings, administracaoMunicipal: e.target.value })}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Direcção Municipal</label>
              <input 
                type="text"
                value={localSettings.direccaoMunicipal}
                onChange={(e) => setLocalSettings({ ...localSettings, direccaoMunicipal: e.target.value })}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome da Instituição</label>
              <input 
                type="text"
                value={localSettings.nomeEscola}
                onChange={(e) => setLocalSettings({ ...localSettings, nomeEscola: e.target.value })}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Ano Lectivo Actual</label>
              <input 
                type="text"
                value={localSettings.anoLectivo}
                onChange={(e) => setLocalSettings({ ...localSettings, anoLectivo: e.target.value })}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2 pt-6 border-t border-neutral-100">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Níveis de Ensino (Classes)</label>
              <span className="text-[10px] font-bold text-neutral-400">Um por linha (Ex: 1ª Classe)</span>
            </div>
            <textarea 
              value={(localSettings.customLevels || LEVELS.filter(l => l !== 'Todos')).join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n').map(l => l.trim()).filter(l => l);
                setLocalSettings({ ...localSettings, customLevels: lines });
              }}
              rows={8}
              className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all resize-none"
              placeholder="1ª Classe\n2ª Classe..."
            />
          </div>

          <div className="pt-6 border-t border-neutral-50 flex justify-end">
            <button 
              onClick={handleSave}
              className="px-8 py-4 bg-neutral-900 text-white rounded-2xl font-black text-sm hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-neutral-200"
            >
              Guardar Alterações
            </button>
          </div>
        </div>
      </div>

      <div className="bg-emerald-900 p-8 rounded-[40px] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <h4 className="text-xl font-black tracking-tight mb-2">Sobre o Sistema</h4>
          <p className="text-emerald-100/70 text-sm font-medium leading-relaxed max-w-2xl">
            B.A GestEscola é uma plataforma robusta desenvolvida para simplificar a gestão académica e administrativa de instituições de ensino em Angola. 
            Este sistema permite o controlo total sobre matrículas, turmas, pautas, finanças e corpo docente.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Versão do Sistema</p>
              <p className="text-sm font-black">v2.4.0 Professional Edition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ 
  students, 
  classes, 
  payments, 
  grades, 
  getGrade,
  isMobile,
  setActiveView,
  currentUser
}: { 
  students: Student[], 
  classes: Class[], 
  payments: Payment[], 
  grades: Grade[],
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number | string,
  isMobile: boolean,
  setActiveView: (view: View) => void,
  currentUser?: SystemUser | null
}) {
  const [statsPeriod, setStatsPeriod] = useState<'1º Trimestre' | '2º Trimestre' | '3º Trimestre'>('1º Trimestre');
  const [selectedSubject, setSelectedSubject] = useState<string>('Geral');
  const [selectedMetric, setSelectedMetric] = useState<'passRate' | 'averageGrade'>('passRate');
  const [selectedLevelCategory, setSelectedLevelCategory] = useState<'Todos' | 'Ensino Primário' | 'Ensino Secundário'>('Todos');
  const [compTab, setCompTab] = useState<'classPassRate' | 'schoolPassRate'>('classPassRate');

  const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const enrolledCount = students.length;

  const matchLevelCategory = (level: string = '') => {
    if (selectedLevelCategory === 'Todos') return true;
    const isPrimary = !!level.match(/^[1-6]ª Classe/) || level.includes('Ensino Primário');
    if (selectedLevelCategory === 'Ensino Primário') return isPrimary;
    if (selectedLevelCategory === 'Ensino Secundário') return !isPrimary;
    return true;
  };

  const filteredClassesByLevel = classes.filter(cls => matchLevelCategory(cls.level));

  // Extract all unique subjects in the active school classes matching level filter
  const allSubjects = Array.from(
    new Set(
      filteredClassesByLevel.flatMap(cls => getSubjectsForClass(cls))
    )
  ).sort();

  // Helper to compute a student's MT (Média Trimestral) for a subject and period
  const getStudentSubjectGrade = (studentId: string, subjectId: string, period: string) => {
    const mac = Number(getGrade(studentId, subjectId, period, 'MAC') || 0);
    const npt = Number(getGrade(studentId, subjectId, period, 'NPT') || 0);
    return (mac + npt) / 2;
  };

  const getAcademicStats = () => {
    const classPerformance = filteredClassesByLevel.map(cls => {
      const classStudents = students.filter(s => s.classId === cls.id);
      if (classStudents.length === 0) {
        return { 
          name: cls.name, 
          value: 0, 
          level: cls.level,
          displayValue: '0',
          passRate: 0,
          averageGrade: 0,
          maxScale: 20
        };
      }

      // If specific subject is chosen, check if class has it
      const hasSubject = selectedSubject === 'Geral' || getSubjectsForClass(cls).includes(selectedSubject);
      if (!hasSubject) {
        return {
          name: cls.name,
          value: 0,
          level: cls.level,
          displayValue: 'N/D',
          notApplicable: true,
          passRate: 0,
          averageGrade: 0,
          maxScale: 20
        };
      }

      const subjects = selectedSubject === 'Geral' 
        ? getSubjectsForClass(cls)
        : [selectedSubject];

      const { threshold, max } = getGradeScale(cls.level);
      let totalGradesSum = 0;
      let totalGradesCount = 0;
      let passes = 0;

      classStudents.forEach(student => {
        let studentSum = 0;
        let studentCount = 0;

        subjects.forEach(sub => {
          const grade = getStudentSubjectGrade(student.id, sub, statsPeriod);
          studentSum += grade;
          studentCount++;
        });

        const studentAvg = studentCount > 0 ? studentSum / studentCount : 0;
        totalGradesSum += studentAvg;
        totalGradesCount++;

        if (studentAvg >= threshold) {
          passes++;
        }
      });

      const passRate = Math.round((passes / classStudents.length) * 100);
      const averageGrade = totalGradesCount > 0 ? Number((totalGradesSum / totalGradesCount).toFixed(1)) : 0;

      return {
        name: cls.name,
        value: selectedMetric === 'passRate' ? passRate : averageGrade,
        level: cls.level,
        displayValue: selectedMetric === 'passRate' ? `${passRate}%` : `${averageGrade}/${max}`,
        passRate,
        averageGrade,
        maxScale: max
      };
    }).filter(item => !item.notApplicable);

    // Sort by value descending and take top 6 classes
    return classPerformance.sort((a, b) => b.value - a.value).slice(0, 6);
  };

  const academicData = getAcademicStats();

  const getGradeDistribution = () => {
    let insuficiente = 0;
    let suficiente = 0;
    let bom = 0;
    let muitoBom = 0;

    students.forEach(student => {
      const cls = classes.find(c => c.id === student.classId);
      if (!cls || !matchLevelCategory(cls.level)) return;

      // Check if this class has the selected subject (if not "Geral")
      if (selectedSubject !== 'Geral' && !getSubjectsForClass(cls).includes(selectedSubject)) {
        return;
      }

      const subjects = selectedSubject === 'Geral' 
        ? getSubjectsForClass(cls)
        : [selectedSubject];

      let studentSum = 0;
      let studentCount = 0;

      subjects.forEach(sub => {
        const grade = getStudentSubjectGrade(student.id, sub, statsPeriod);
        studentSum += grade;
        studentCount++;
      });

      if (studentCount === 0) return;
      const studentAvg = studentSum / studentCount;
      const { max } = getGradeScale(cls.level);

      if (max === 10) {
        if (studentAvg < 5) insuficiente++;
        else if (studentAvg < 7) suficiente++;
        else if (studentAvg < 9) bom++;
        else muitoBom++;
      } else { // max === 20
        if (studentAvg < 10) insuficiente++;
        else if (studentAvg < 14) suficiente++;
        else if (studentAvg < 18) bom++;
        else muitoBom++;
      }
    });

    return [
      { name: 'Insuficiente', count: insuficiente, fill: '#f43f5e', description: 'Nota Baixa' },
      { name: 'Suficiente', count: suficiente, fill: '#f59e0b', description: 'Média de Passagem' },
      { name: 'Bom', count: bom, fill: '#10b981', description: 'Bom Aproveitamento' },
      { name: 'Muito Bom', count: muitoBom, fill: '#3b82f6', description: 'Excelente' }
    ];
  };

  const gradeDistributionData = getGradeDistribution();

  const getPerformanceTrend = () => {
    // 1. Get top 4 classes based on the current period's performance to track
    const topClasses = academicData.slice(0, 4).map(c => {
      const cls = classes.find(cl => cl.name === c.name);
      return { id: cls?.id, name: c.name, level: c.level };
    });

    const periods = ['1º Trimestre', '2º Trimestre', '3º Trimestre'] as const;

    const trendData = periods.map(period => {
      const periodObj: { name: string; [key: string]: any } = { name: period.split(' ')[0] + ' Trim' };

      topClasses.forEach(tc => {
        if (!tc.id) return;
        const cls = classes.find(c => c.id === tc.id);
        if (!cls) return;

        const classStudents = students.filter(s => s.classId === tc.id);
        if (classStudents.length === 0) {
          periodObj[tc.name] = 0;
          return;
        }

        if (selectedSubject !== 'Geral' && !getSubjectsForClass(cls).includes(selectedSubject)) {
          periodObj[tc.name] = null;
          return;
        }

        const subjects = selectedSubject === 'Geral' 
          ? getSubjectsForClass(cls)
          : [selectedSubject];

        const { threshold } = getGradeScale(cls.level);
        let totalGradesSum = 0;
        let totalGradesCount = 0;
        let passes = 0;

        classStudents.forEach(student => {
          let studentSum = 0;
          let studentCount = 0;

          subjects.forEach(sub => {
            const grade = getStudentSubjectGrade(student.id, sub, period);
            studentSum += grade;
            studentCount++;
          });

          const studentAvg = studentCount > 0 ? studentSum / studentCount : 0;
          totalGradesSum += studentAvg;
          totalGradesCount++;

          if (studentAvg >= threshold) {
            passes++;
          }
        });

        const passRate = Math.round((passes / classStudents.length) * 100);
        const averageGrade = totalGradesCount > 0 ? Number((totalGradesSum / totalGradesCount).toFixed(1)) : 0;

        periodObj[tc.name] = selectedMetric === 'passRate' ? passRate : averageGrade;
      });

      return periodObj;
    });

    return {
      trendData,
      classNames: topClasses.map(tc => tc.name)
    };
  };

  const { trendData, classNames } = getPerformanceTrend();
  const TREND_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const getMonthlyRevenue = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthStr = (index + 1).toString().padStart(2, '0');
      const revenue = payments
        .filter(p => p.date.includes(`-${monthStr}-${currentYear}`))
        .reduce((acc, p) => acc + p.amount, 0);
      return { name: month, revenue };
    }).filter(m => m.revenue > 0 || months.indexOf(m.name) <= new Date().getMonth());
  };

  const chartData = getMonthlyRevenue();

  // --- GRÁFICOS COMPARATIVOS DE DESEMPENHO ACADÉMICO ---
  const getComparativeClassAverages = () => {
    return filteredClassesByLevel.map(cls => {
      const classStudents = students.filter(s => s.classId === cls.id);
      if (classStudents.length === 0) return null;

      const hasSubject = selectedSubject === 'Geral' || getSubjectsForClass(cls).includes(selectedSubject);
      if (!hasSubject) return null;

      const subjects = selectedSubject === 'Geral' 
        ? getSubjectsForClass(cls)
        : [selectedSubject];

      const { threshold, max } = getGradeScale(cls.level);

      const getPeriodStats = (periodStr: string) => {
        let totalSum = 0;
        let count = 0;
        let passes = 0;

        classStudents.forEach(student => {
          let studentSum = 0;
          let subCount = 0;

          subjects.forEach(sub => {
            const grade = getStudentSubjectGrade(student.id, sub, periodStr);
            studentSum += grade;
            subCount++;
          });

          const studentAvg = subCount > 0 ? studentSum / subCount : 0;
          totalSum += studentAvg;
          count++;

          if (studentAvg >= threshold) {
            passes++;
          }
        });

        const avgGrade = count > 0 ? Number((totalSum / count).toFixed(1)) : 0;
        const passRate = count > 0 ? Math.round((passes / count) * 100) : 0;

        return { avgGrade, passRate };
      };

      const p1 = getPeriodStats('1º Trimestre');
      const p2 = getPeriodStats('2º Trimestre');
      const p3 = getPeriodStats('3º Trimestre');

      return {
        name: cls.name,
        level: cls.level,
        maxScale: max,
        m1: p1.avgGrade,
        m2: p2.avgGrade,
        m3: p3.avgGrade,
        p1Rate: p1.passRate,
        p2Rate: p2.passRate,
        p3Rate: p3.passRate,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  };

  const comparativeClassAverages = getComparativeClassAverages();

  const getComparativeSchoolPassRateByPeriod = () => {
    const periods = ['1º Trimestre', '2º Trimestre', '3º Trimestre'] as const;

    return periods.map(periodStr => {
      let totalStudentsCount = 0;
      let totalPassedCount = 0;
      let sumOfAverages = 0;

      students.forEach(student => {
        const cls = classes.find(c => c.id === student.classId);
        if (!cls || !matchLevelCategory(cls.level)) return;

        if (selectedSubject !== 'Geral' && !getSubjectsForClass(cls).includes(selectedSubject)) {
          return;
        }

        const subjects = selectedSubject === 'Geral' 
          ? getSubjectsForClass(cls)
          : [selectedSubject];

        const { threshold } = getGradeScale(cls.level);
        let studentSum = 0;
        let subCount = 0;

        subjects.forEach(sub => {
          const grade = getStudentSubjectGrade(student.id, sub, periodStr);
          studentSum += grade;
          subCount++;
        });

        const studentAvg = subCount > 0 ? studentSum / subCount : 0;
        sumOfAverages += studentAvg;
        totalStudentsCount++;

        if (studentAvg >= threshold) {
          totalPassedCount++;
        }
      });

      const passRate = totalStudentsCount > 0 ? Math.round((totalPassedCount / totalStudentsCount) * 100) : 0;
      const avgGrade = totalStudentsCount > 0 ? Number((sumOfAverages / totalStudentsCount).toFixed(1)) : 0;

      return {
        period: periodStr.split(' ')[0] + ' Trim',
        fullName: periodStr,
        taxaAprovacao: passRate,
        mediaGeral: avgGrade,
        totalAlunos: totalStudentsCount,
        aprovados: totalPassedCount,
        reprovados: totalStudentsCount - totalPassedCount
      };
    });
  };

  const comparativeSchoolPassRates = getComparativeSchoolPassRateByPeriod();

  const genderData = [
    { name: 'Masculino', value: students.filter(s => s.gender === 'M').length },
    { name: 'Feminino', value: students.filter(s => s.gender === 'F').length },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Painel de Estatística</h2>
          <p className="text-sm font-bold text-neutral-400 mt-1">Análise em tempo real do aproveitamento escolar e finanças da instituição.</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-white px-4 py-2 flex items-center justify-center rounded-2xl border border-neutral-200 shadow-sm text-xs font-black text-neutral-600 gap-2 w-fit">
             <CalendarDays size={16} className="text-emerald-600" />
             {new Date().toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Alunos', value: enrolledCount, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-500/20 to-transparent' },
          { label: 'Turmas Activas', value: classes.length, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500/20 to-transparent' },
          { label: 'Receita Total', value: `${totalRevenue.toLocaleString()} AKZ`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', gradient: 'from-amber-500/20 to-transparent' },
          { label: 'Matrículas Pendentes', value: students.filter(s => s.enrollmentStatus === 'Pendente').length, icon: UserRound, color: 'text-rose-600', bg: 'bg-rose-50', gradient: 'from-rose-500/20 to-transparent' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.gradient} -mr-16 -mt-16 rounded-full transition-transform group-hover:scale-150 duration-700`} />
            <div className="relative z-10 flex items-start justify-between mb-4">
              <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", stat.bg, stat.color)}>
                <stat.icon size={20} className="sm:hidden" />
                <stat.icon size={24} className="hidden sm:block" />
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <h3 className="text-xl sm:text-3xl font-black text-neutral-900 tracking-tight truncate">{stat.value}</h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Academic Panel Section Header & Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-emerald-600" size={24} />
          <h3 className="font-black text-xl text-neutral-900 tracking-tight">Análise Académica Avançada</h3>
        </div>

        {/* Interactive Selector Controls Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-5 bg-white rounded-3xl border border-neutral-200 shadow-sm relative z-20">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <GraduationCap size={12} className="text-neutral-500" /> Nível de Ensino
            </span>
            <div className="flex gap-1 p-1 bg-neutral-50 border border-neutral-200 rounded-2xl h-[46px] items-center">
              {(['Todos', 'Ensino Primário', 'Ensino Secundário'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevelCategory(lvl)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap px-1 text-center cursor-pointer",
                    selectedLevelCategory === lvl 
                      ? "bg-white text-emerald-600 shadow-sm border border-neutral-200/50" 
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {lvl === 'Todos' ? 'Todos' : lvl === 'Ensino Primário' ? 'Primário' : 'Secundário'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <BookOpen size={12} className="text-neutral-500" /> Disciplina de Estudo
            </span>
            <div className="relative">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl text-xs font-bold text-neutral-800 transition-all cursor-pointer appearance-none outline-none"
              >
                <option value="Geral">Geral (Média de Todas as Disciplinas)</option>
                {allSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-500">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <CalendarDays size={12} className="text-neutral-500" /> Período Avaliativo
            </span>
            <div className="flex gap-1 p-1 bg-neutral-50 border border-neutral-200 rounded-2xl h-[46px] items-center">
              {(['1º Trimestre', '2º Trimestre', '3º Trimestre'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setStatsPeriod(p)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    statsPeriod === p ? "bg-white text-emerald-600 shadow-sm border border-neutral-200/50" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {p.split(' ')[0]} Trim
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-neutral-500" /> Métrica Visualizada
            </span>
            <div className="flex gap-1 p-1 bg-neutral-50 border border-neutral-200 rounded-2xl h-[46px] items-center">
              {[
                { value: 'passRate', label: 'Taxa de Aprovação (%)' },
                { value: 'averageGrade', label: 'Média das Notas' }
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMetric(m.value as 'passRate' | 'averageGrade')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    selectedMetric === m.value ? "bg-white text-emerald-600 shadow-sm border border-neutral-200/50" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Academic Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Chart 1: Aproveitamento por Turma */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm relative overflow-hidden flex flex-col">
            <div className="mb-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-neutral-900 tracking-tight">Desempenho por Turma</h4>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">
                    Nível: <span className="text-blue-600 font-extrabold">{selectedLevelCategory}</span> • Filtro: <span className="text-emerald-600 font-extrabold">{selectedSubject}</span> • {selectedMetric === 'passRate' ? 'Taxa de Aprovação (%)' : 'Média das Notas'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-emerald-100">
                    {statsPeriod}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="h-[280px] w-full relative z-10 mt-auto">
              {academicData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <BookOpen size={40} className="text-neutral-300 mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-neutral-500">Sem dados pedagógicos para a disciplina seleccionada.</p>
                  <p className="text-xs text-neutral-400 mt-1">Experimente seleccionar outra disciplina ou verificar os lançamentos.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={academicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} domain={selectedMetric === 'passRate' ? [0, 100] : [0, 'auto']} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl border border-neutral-800 text-white min-w-[150px] z-50 relative">
                              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{data.level}</p>
                              <p className="font-black text-base tracking-tight leading-none mb-3">{data.name}</p>
                              <div className="pt-2 border-t border-neutral-800 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-neutral-400 font-bold">Taxa Aprovação:</span>
                                  <span className="font-black text-emerald-400">{data.passRate}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-neutral-400 font-bold">Média Notas:</span>
                                  <span className="font-black text-blue-400">{data.averageGrade}/{data.maxScale}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {academicData.map((entry, index) => {
                        let barColor = '#34d399'; // Emerald-400
                        if (selectedMetric === 'averageGrade') {
                          // Color code based on average grade
                          const ratio = entry.averageGrade / entry.maxScale;
                          if (ratio >= 0.8) barColor = '#3b82f6'; // Blue-500
                          else if (ratio >= 0.5) barColor = '#10b981'; // Emerald-500
                          else if (ratio >= 0.4) barColor = '#f59e0b'; // Amber-500
                          else barColor = '#f43f5e'; // Rose-500
                        } else {
                          // Pass rates coloring
                          if (entry.passRate >= 80) barColor = '#10b981';
                          else if (entry.passRate >= 50) barColor = '#34d399';
                          else barColor = '#f43f5e';
                        }
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Distribuição por Escalão */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-black text-lg text-neutral-900 tracking-tight font-sans">Distribuição das Notas</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">Escalão de desempenho dos alunos</p>
            </div>

            <div className="h-[200px] w-full my-6">
              {students.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-xs font-bold text-neutral-400">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#737373', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#737373', fontWeight: 700 }} allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-neutral-900 p-3 rounded-xl shadow-md text-white border border-neutral-800 text-xs font-bold">
                              <p className="text-[9px] text-neutral-400 uppercase tracking-widest mb-1">{data.description}</p>
                              <p className="text-base font-black">{data.name}</p>
                              <p className="mt-2 text-emerald-400 font-extrabold">{data.count} Alunos</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {gradeDistributionData.map((entry, index) => (
                        <Cell key={`cell-dist-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-neutral-600 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
              {gradeDistributionData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                  <span className="truncate">{entry.name}: {entry.count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Second Row: Performance Trend (LineChart) & Gender Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Chart 3: Tendência de Desempenho */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col">
            <div className="mb-6">
              <h4 className="font-black text-lg text-neutral-900 tracking-tight">Evolução do Aproveitamento (Top Turmas)</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">
                Progresso das 4 turmas com maior rendimento ao longo do ano lectivo
              </p>
            </div>

            <div className="h-[250px] w-full mt-auto relative">
              {classNames.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <Activity size={32} className="text-neutral-300 mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-neutral-400">Sem dados suficientes para mapear a evolução temporal.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} domain={selectedMetric === 'passRate' ? [0, 100] : [0, 'auto']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#171717', color: '#fff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.15)', padding: '12px 16px', fontWeight: 'bold' }}
                      itemStyle={{ fontSize: '12px' }}
                      labelStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#a3a3a3', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '15px' }} />
                    {classNames.map((name, index) => (
                      <Line 
                        key={name} 
                        type="monotone" 
                        dataKey={name} 
                        stroke={TREND_COLORS[index % TREND_COLORS.length]} 
                        strokeWidth={3} 
                        dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 7 }} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Gender Distribution */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-black text-lg text-neutral-900 tracking-tight">Distribuição de Género</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">Alunos matriculados na instituição</p>
            </div>
            
            <div className="h-[200px] w-full my-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-gender-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#171717', fontSize: '14px', fontWeight: 900 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-neutral-600">Masc. ({genderData[0].value})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-xs font-bold text-neutral-600">Fem. ({genderData[1].value})</span>
              </div>
            </div>
          </div>

        </div>

        {/* SEÇÃO DE GRÁFICOS COMPARATIVOS DE DESEMPENHO ACADÉMICO */}
        <div className="space-y-6 pt-6 border-t border-neutral-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="text-blue-600" size={24} />
                <h3 className="font-black text-xl text-neutral-900 tracking-tight">Análise Comparativa por Trimestre</h3>
              </div>
              <p className="text-xs font-bold text-neutral-400 mt-1">
                Comparativo da média das turmas e taxa de aprovação no 1º, 2º e 3º Trimestres (
                {selectedLevelCategory !== 'Todos' && <span className="text-blue-600 font-extrabold">Nível: {selectedLevelCategory} | </span>}
                Disciplina: <span className="text-emerald-600 font-extrabold">{selectedSubject}</span>)
              </p>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex flex-wrap gap-2">
              {comparativeSchoolPassRates.map((s, idx) => (
                <div key={idx} className="bg-white px-3 py-2 rounded-2xl border border-neutral-200 shadow-sm flex flex-col text-right min-w-[100px]">
                  <span className="text-[9px] font-black uppercase text-neutral-400">{s.fullName}</span>
                  <span className="text-xs font-black text-neutral-800">
                    <span className="text-blue-600">{s.mediaGeral}v</span> • <span className="text-emerald-600">{s.taxaAprovacao}% Aprov.</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Comparative Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Chart A: Comparativo de Média das Turmas (1º, 2º e 3º Trimestres) */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h4 className="font-black text-lg text-neutral-900 tracking-tight flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500" />
                    Média das Turmas por Trimestre
                  </h4>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">
                    Comparativo direto do rendimento médio (escala de cada classe)
                  </p>
                </div>
              </div>

              <div className="h-[300px] w-full relative z-10 my-2">
                {comparativeClassAverages.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                    <BookOpen size={36} className="text-neutral-300 mb-2 animate-bounce" />
                    <p className="text-xs font-bold text-neutral-500">Sem lançamentos suficientes para comparação trimestral.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativeClassAverages} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} domain={[0, 'auto']} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc', radius: 8 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const diff13 = (data.m3 - data.m1).toFixed(1);
                            const isPositive = Number(diff13) >= 0;
                            return (
                              <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl border border-neutral-800 text-white min-w-[170px] z-50">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{data.level}</p>
                                <p className="font-black text-base tracking-tight mb-2">{data.name}</p>
                                <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-800">
                                  <div className="flex justify-between items-center">
                                    <span className="text-blue-400 font-bold">1º Trimestre:</span>
                                    <span className="font-black">{data.m1}/{data.maxScale}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-emerald-400 font-bold">2º Trimestre:</span>
                                    <span className="font-black">{data.m2}/{data.maxScale}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-amber-400 font-bold">3º Trimestre:</span>
                                    <span className="font-black">{data.m3}/{data.maxScale}</span>
                                  </div>
                                  <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-[11px]">
                                    <span className="text-neutral-400 font-bold">Evolução (1º ao 3º Trim):</span>
                                    <span className={cn("font-black", isPositive ? "text-emerald-400" : "text-rose-400")}>
                                      {isPositive ? `+${diff13}` : diff13} val.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '12px' }} 
                      />
                      <Bar name="1º Trimestre" dataKey="m1" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar name="2º Trimestre" dataKey="m2" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar name="3º Trimestre" dataKey="m3" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center bg-neutral-50 p-3 rounded-2xl border border-neutral-100 mt-2">
                <div className="flex items-center justify-center gap-1.5 text-blue-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>1º Trim: Azul</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>2º Trim: Verde</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-amber-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>3º Trim: Amarelo</span>
                </div>
              </div>
            </div>

            {/* Chart B: Comparativo da Taxa de Aprovação por Período */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-neutral-900 tracking-tight flex items-center gap-2">
                    <Award size={18} className="text-emerald-600" />
                    Taxa de Aprovação por Período (%)
                  </h4>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">
                    Porcentagem de alunos aprovados em cada trimestre
                  </p>
                </div>

                {/* View Toggle */}
                <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCompTab('classPassRate')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer",
                      compTab === 'classPassRate' ? "bg-white text-emerald-600 shadow-sm font-black" : "text-neutral-500 hover:text-neutral-800"
                    )}
                  >
                    Por Turma
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompTab('schoolPassRate')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer",
                      compTab === 'schoolPassRate' ? "bg-white text-emerald-600 shadow-sm font-black" : "text-neutral-500 hover:text-neutral-800"
                    )}
                  >
                    Visão Geral
                  </button>
                </div>
              </div>

              <div className="h-[300px] w-full relative z-10 my-2">
                {compTab === 'classPassRate' ? (
                  comparativeClassAverages.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                      <BookOpen size={36} className="text-neutral-300 mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-neutral-500">Sem lançamentos para taxa de aprovação.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparativeClassAverages} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} domain={[0, 100]} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', radius: 8 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl border border-neutral-800 text-white min-w-[170px] z-50">
                                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{data.level}</p>
                                  <p className="font-black text-base tracking-tight mb-2">{data.name}</p>
                                  <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-800">
                                    <div className="flex justify-between items-center">
                                      <span className="text-blue-400 font-bold">1º Trim Aprovação:</span>
                                      <span className="font-black">{data.p1Rate}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-emerald-400 font-bold">2º Trim Aprovação:</span>
                                      <span className="font-black">{data.p2Rate}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-amber-400 font-bold">3º Trim Aprovação:</span>
                                      <span className="font-black">{data.p3Rate}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '12px' }} 
                        />
                        <Bar name="1º Trim (%)" dataKey="p1Rate" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        <Bar name="2º Trim (%)" dataKey="p2Rate" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        <Bar name="3º Trim (%)" dataKey="p3Rate" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativeSchoolPassRates} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} domain={[0, 100]} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc', radius: 8 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl border border-neutral-800 text-white min-w-[170px] z-50">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Aprovação Global Institucional</p>
                                <p className="font-black text-base tracking-tight mb-2">{data.fullName}</p>
                                <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-800">
                                  <div className="flex justify-between items-center">
                                    <span className="text-emerald-400 font-bold">Taxa de Aprovação:</span>
                                    <span className="font-black">{data.taxaAprovacao}%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-blue-400 font-bold">Média Geral Escola:</span>
                                    <span className="font-black">{data.mediaGeral} v</span>
                                  </div>
                                  <div className="flex justify-between items-center text-neutral-300">
                                    <span>Total Aprovados:</span>
                                    <span className="font-black text-emerald-400">{data.aprovados} alunos</span>
                                  </div>
                                  <div className="flex justify-between items-center text-neutral-300">
                                    <span>Não Aprovados:</span>
                                    <span className="font-black text-rose-400">{data.reprovados} alunos</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar name="Taxa de Aprovação (%)" dataKey="taxaAprovacao" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {comparativeSchoolPassRates.map((entry, index) => {
                          const color = index === 0 ? '#3b82f6' : index === 1 ? '#10b981' : '#f59e0b';
                          return <Cell key={`cell-sch-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold bg-emerald-50 text-emerald-800 p-3 rounded-2xl border border-emerald-100/80 mt-2">
                <span>💡 Comparativo de taxa de aprovação (%) calculado por turma e por trimestre.</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Third Row: Quick Actions & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 sm:p-8 rounded-[32px] border border-neutral-800 shadow-xl flex flex-col text-white">
          <h3 className="font-black text-xl tracking-tight mb-2">Acções Rápidas</h3>
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">Atalhos do dia-a-dia</p>
          
          <div className="flex-1 flex flex-col justify-center space-y-3">
            {[
              { label: 'Nova Matrícula', icon: Plus, action: () => setActiveView('students'), color: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30', roles: ['Administrador', 'Secretário'] },
              { label: 'Registar Pagamento', icon: CreditCard, action: () => setActiveView('finance'), color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30', roles: ['Financeiro'] },
              { label: 'Assistente Pedagógico', icon: Bot, action: () => setActiveView('ai-assistant'), color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30', roles: ['Super-Administrador', 'Administrador', 'Professor', 'Secretário'] },
              { label: 'Lançar Notas', icon: BookOpen, action: () => setActiveView('academic'), color: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30', roles: ['Administrador', 'Professor', 'Secretário'] },
              { label: 'Emitir Declaração', icon: FileDown, action: () => setActiveView('certificates'), color: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30', roles: ['Administrador', 'Secretário'] },
              { label: 'Auditoria de Acesso', icon: History, action: () => setActiveView('audit'), color: 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30', roles: ['Super-Administrador'] },
              { label: 'Controlo de Escolas', icon: SchoolIcon, action: () => setActiveView('schools'), color: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30', roles: ['Super-Administrador'] },
              { label: 'Gerir Utilizadores', icon: UserCog, action: () => setActiveView('users'), color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30', roles: ['Super-Administrador'] },
              { label: 'Backup do Sistema', icon: Database, action: () => setActiveView('backup'), color: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30', roles: ['Super-Administrador'] },
            ].filter(a => a.roles.includes(currentUser?.role || '')).map((action, i) => (
              <button 
                key={i} 
                onClick={action.action}
                className={cn("w-full flex items-center gap-4 p-4 rounded-2xl transition-all border border-transparent hover:border-white/10 active:scale-[0.98]", action.color)}
              >
                <action.icon size={20} />
                <span className="font-black text-sm tracking-tight text-white">{action.label}</span>
                <ChevronRight size={16} className="ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-black text-xl text-neutral-900 tracking-tight">Evolução de Receitas</h3>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">Registos de pagamentos Mensais (AKZ)</p>
            </div>
          </div>
          <div className="h-[250px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373', fontWeight: 700 }} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#059669', fontSize: '16px', fontWeight: 900 }}
                  labelStyle={{ color: '#737373', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

function StudentModal({ student, classes, onClose, onSave }: { 
  student: Student | null, 
  classes: Class[],
  onClose: () => void, 
  onSave: (s: Student) => void 
}) {
  const [formData, setFormData] = useState<Partial<Student>>(
    student || { 
      name: '', 
      bi: '', 
      birthDate: '', 
      gender: 'M', 
      guardianName: '', 
      guardianPhone: '', 
      classId: classes[0]?.id || '',
      enrollmentStatus: 'Matriculado',
      enrollmentDate: new Date().toISOString().split('T')[0]
    }
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{student ? 'Editar Aluno' : 'Nova Matrícula'}</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Preencha os dados do estudante</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                placeholder="Ex: Manuel António"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nº do BI</label>
              <input 
                type="text" 
                value={formData.bi}
                onChange={(e) => setFormData({ ...formData, bi: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                placeholder="Ex: 000000000LA000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
              <input 
                type="date" 
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Gênero</label>
              <select 
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome do Encarregado</label>
              <input 
                type="text" 
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Telefone do Encarregado</label>
              <input 
                type="text" 
                value={formData.guardianPhone}
                onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Turma</label>
              <select 
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.level}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Estado da Matrícula</label>
              <select 
                value={formData.enrollmentStatus}
                onChange={(e) => setFormData({ ...formData, enrollmentStatus: e.target.value as any })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              >
                <option value="Matriculado">Matriculado</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Pendente">Pendente</option>
                <option value="Desistente">Desistente</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Zona de Residência</label>
              <input 
                type="text" 
                value={formData.residentialZone || ''}
                onChange={(e) => setFormData({ ...formData, residentialZone: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                placeholder="Ex: Bairro Central"
              />
            </div>
          </div>

          <button 
            onClick={() => onSave({ ...formData, id: student?.id || Date.now().toString() } as Student)}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 mt-4"
          >
            {student ? 'Guardar Alterações' : 'Finalizar Matrícula'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StudentsView({ 
  students, 
  classes, 
  grades, 
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent, 
  getGrade, 
  setActiveView,
  isAdding,
  setIsAdding,
  editingStudent,
  setEditingStudent,
  currentUser,
  onImportStudents
}: { 
  students: Student[], 
  classes: Class[], 
  grades: Grade[],
  onAddStudent?: (s: Student) => void,
  onUpdateStudent?: (s: Student) => void,
  onDeleteStudent?: (id: string) => void,
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  setActiveView: (view: View) => void,
  isAdding: boolean,
  setIsAdding: (b: boolean) => void,
  editingStudent: Student | null,
  setEditingStudent: (s: Student | null) => void,
  currentUser?: SystemUser,
  onImportStudents?: (students: Omit<Student, 'id' | 'enrollmentDate'>[]) => void
} ) {
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ageRange, setAgeRange] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    try {
      const birth = new Date(birthDate);
      if (isNaN(birth.getTime())) return 0;
      const diff = Date.now() - birth.getTime();
      return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    } catch (e) {
      return 0;
    }
  };

  const zones = Array.from(new Set(students.map(s => s.residentialZone).filter(Boolean) as string[]));

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.bi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    const matchesStatus = statusFilter === 'all' || s.enrollmentStatus === statusFilter;
    
    const age = calculateAge(s.birthDate);
    const matchesAge = ageRange === 'all' || 
      (ageRange === '0-5' && age <= 5) ||
      (ageRange === '6-10' && age >= 6 && age <= 10) ||
      (ageRange === '11-15' && age >= 11 && age <= 15) ||
      (ageRange === '16-20' && age >= 16 && age <= 20) ||
      (ageRange === '21+' && age >= 21);
      
    const matchesZone = zoneFilter === 'all' || s.residentialZone === zoneFilter;
    
    return matchesSearch && matchesClass && matchesStatus && matchesAge && matchesZone;
  });

  const handleExportExcel = () => {
    const data = filteredStudents.map((s, i) => ({
      'Nº': i + 1,
      'Nome Completo': s.name,
      'Gênero': s.gender,
      'BI': s.bi,
      'Turma': classes.find(c => c.id === s.classId)?.name || 'N/A',
      'Estado': s.enrollmentStatus,
      'Zona': s.residentialZone || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');
    XLSX.writeFile(workbook, `Lista_Alunos_${zoneFilter !== 'all' ? zoneFilter : 'Geral'}.xlsx`);
  };

  const getMTLocal = (studentId: string, subjectId: string, period: string) => {
    const student = students.find(s => s.id === studentId);
    const cls = classes.find(c => c.id === student?.classId);
    return calculateMT(studentId, subjectId, period, getGrade, cls?.level);
  };

  const totalStudents = filteredStudents.length;
  const maleStudents = filteredStudents.filter(s => s.gender === 'M').length;
  const femaleStudents = filteredStudents.filter(s => s.gender === 'F').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button 
            onClick={handleExportExcel}
            className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button 
            onClick={() => setActiveView('lists')}
            className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95"
          >
            <Check size={18} />
            Ver Listas
          </button>
          <div className="relative group flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou BI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-neutral-300 rounded-2xl text-sm w-full lg:w-96 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-neutral-800 shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all w-full sm:min-w-[220px] font-bold text-neutral-700"
            >
              <option value="all">Todas as Turmas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all w-full sm:min-w-[180px] font-bold text-neutral-700"
            >
              <option value="all">Todos os Estados</option>
              <option value="Matriculado">Matriculado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Pendente">Pendente</option>
              <option value="Desistente">Desistente</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all w-full sm:min-w-[150px] font-bold text-neutral-700"
            >
              <option value="all">Idade: Todas</option>
              <option value="0-5">0-5 anos</option>
              <option value="6-10">6-10 anos</option>
              <option value="11-15">11-15 anos</option>
              <option value="16-20">16-20 anos</option>
              <option value="21+">21+ anos</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all w-full sm:min-w-[180px] font-bold text-neutral-700"
            >
              <option value="all">Zona: Todas</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>
        </div>
        {onAddStudent && (
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {currentUser && ['Super-Administrador', 'Administrador', 'Secretário'].includes(currentUser.role) && (
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-100 active:scale-95 w-full lg:w-auto"
              >
                <FileDown size={20} />
                Importar Excel
              </button>
            )}
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-emerald-100 active:scale-95 w-full lg:w-auto"
            >
              <Plus size={20} />
              Nova Matrícula
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Alunos', value: totalStudents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Masculino', value: maleStudents, icon: UserRound, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Feminino', value: femaleStudents, icon: UserRound, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Turmas', value: classes.length, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <h4 className="text-2xl font-black text-neutral-900 tracking-tight">{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Aluno</th>
                <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Documento BI</th>
                <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Turma Actual</th>
                <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-6 sm:px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 shadow-sm group-hover:scale-110 transition-transform">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 tracking-tight text-sm sm:text-base">{student.name}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{student.gender === 'M' ? 'Masculino' : 'Feminino'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-5">
                    <span className="text-xs sm:text-sm font-bold text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded-lg">{student.bi}</span>
                  </td>
                  <td className="px-6 sm:px-8 py-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-xs sm:text-sm font-bold text-neutral-700">
                          {classes.find(c => c.id === student.classId)?.name || 'N/A'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mt-0.5 ml-3.5">
                        {classes.find(c => c.id === student.classId)?.level || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-5">
                    <span className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                      student.enrollmentStatus === 'Matriculado' ? "bg-emerald-50 text-emerald-700" :
                      student.enrollmentStatus === 'Confirmado' ? "bg-blue-50 text-blue-700" :
                      student.enrollmentStatus === 'Desistente' ? "bg-neutral-100 text-neutral-500" :
                      "bg-amber-50 text-amber-700"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        student.enrollmentStatus === 'Matriculado' ? "bg-emerald-500" :
                        student.enrollmentStatus === 'Confirmado' ? "bg-blue-500" : 
                        student.enrollmentStatus === 'Desistente' ? "bg-neutral-400" : "bg-amber-500"
                      )} />
                      {student.enrollmentStatus}
                    </span>
                  </td>
                  <td className="px-6 sm:px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedStudentForGrades(student)}
                        className="p-2 bg-neutral-100 text-neutral-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                        title="Histórico Escolar"
                      >
                        <BookOpen size={14} />
                      </button>
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="p-2 bg-neutral-100 text-neutral-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                        title="Editar Aluno"
                      >
                        <Edit size={14} />
                      </button>
                      {onDeleteStudent && (
                        <button 
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-2 bg-neutral-100 text-neutral-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                          title="Eliminar Aluno"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-neutral-300" />
            </div>
            <p className="text-neutral-500 font-bold">Nenhum aluno encontrado</p>
            <p className="text-xs text-neutral-400 mt-1">Tente ajustar os seus filtros de pesquisa.</p>
          </div>
        )}
      </div>

      {selectedStudentForGrades && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-5xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border border-white/20"
          >
            <div className="p-6 sm:p-10 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/50">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-emerald-200">
                  {selectedStudentForGrades.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl sm:text-3xl font-black text-neutral-900 tracking-tight">Histórico Escolar</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                    <span className="text-xs sm:text-sm font-bold text-neutral-500">{selectedStudentForGrades.name}</span>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-neutral-300" />
                    <span className="text-[10px] sm:text-xs font-bold text-neutral-400 font-mono uppercase tracking-widest">{selectedStudentForGrades.bi}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStudentForGrades(null)} className="text-neutral-400 hover:text-neutral-900 p-2 sm:p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-10 overflow-y-auto flex-1 space-y-6 sm:space-y-10">
              <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disciplina</th>
                        <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">1º Trimestre</th>
                        <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">2º Trimestre</th>
                        <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">3º Trimestre</th>
                        <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Média Geral</th>
                        <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {(() => {
                        const studentClass = classes.find(c => c.id === selectedStudentForGrades.classId);
                        const studentLevel = studentClass?.level || '1ª Classe';
                        const { threshold } = getGradeScale(studentLevel);
                        const studentSubjects = getSubjectsForClass(studentClass);

                        return studentSubjects.map((subject) => {
                          const n1 = getMTLocal(selectedStudentForGrades.id, subject, '1º Trimestre');
                          const n2 = getMTLocal(selectedStudentForGrades.id, subject, '2º Trimestre');
                          const n3 = getMTLocal(selectedStudentForGrades.id, subject, '3º Trimestre');
                          const cls = classes.find(c => c.id === selectedStudentForGrades.classId);
                          const media = calculateAnnual(selectedStudentForGrades.id, subject, getGrade, cls?.level).toFixed(1);
                          const isPassed = Number(media) >= threshold;

                          return (
                            <tr key={subject} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="px-6 sm:px-8 py-4 sm:py-5 font-bold text-neutral-900">{subject}</td>
                              <td className="px-6 sm:px-8 py-4 sm:py-5 text-sm font-bold text-center">
                                <span className={n1 >= threshold ? "text-neutral-900" : "text-rose-600"}>{n1}</span>
                              </td>
                              <td className="px-6 sm:px-8 py-4 sm:py-5 text-sm font-bold text-center">
                                <span className={n2 >= threshold ? "text-neutral-900" : "text-rose-600"}>{n2}</span>
                              </td>
                              <td className="px-6 sm:px-8 py-4 sm:py-5 text-sm font-bold text-center">
                                <span className={n3 >= threshold ? "text-neutral-900" : "text-rose-600"}>{n3}</span>
                              </td>
                              <td className="px-6 sm:px-8 py-4 sm:py-5 text-center">
                                <span className={cn(
                                  "text-sm font-black",
                                  isPassed ? "text-neutral-900" : "text-rose-600"
                                )}>{media}</span>
                              </td>
                              <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                                <span className={cn(
                                  "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                                  isPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                )}>
                                  {isPassed ? 'Aprovado' : 'Reprovado'}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                {[
                  { label: 'Média Global', value: '14.2', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
                  { label: 'Assiduidade', value: '98%', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
                  { label: 'Comportamento', value: 'Excelente', color: 'bg-amber-50 text-amber-700', border: 'border-amber-100' },
                ].map((stat, i) => (
                  <div key={i} className={cn("p-6 sm:p-8 rounded-[20px] sm:rounded-[24px] border shadow-sm", stat.color, stat.border)}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{stat.label}</p>
                    <h4 className="text-2xl sm:text-4xl font-black mt-2 tracking-tight">{stat.value}</h4>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 sm:p-10 border-t border-neutral-100 flex flex-col sm:flex-row justify-end shrink-0 bg-neutral-50/50 gap-4">
              <button 
                onClick={() => setSelectedStudentForGrades(null)}
                className="px-8 py-4 text-neutral-500 font-bold hover:text-neutral-900 transition-colors order-2 sm:order-1"
              >
                Fechar
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-neutral-900 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200 order-1 sm:order-2"
              >
                <FileDown size={20} />
                Imprimir Boletim
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isAdding && (
        <StudentModal 
          student={null}
          classes={classes}
          onClose={() => setIsAdding(false)}
          onSave={async (s) => {
            onAddStudent(s);
            setIsAdding(false);
            
            // Generate PDF Receipt
            const doc = new jsPDF();
            const studentClass = classes.find(c => c.id === s.classId);
            const insignia = await loadAngolaInsignia();
            
            let startY = 45;
            if (insignia) {
              doc.addImage(insignia, getImageFormat(insignia), 95, 10, 20, 20);
              doc.setFontSize(14);
              doc.setTextColor(16, 185, 129);
              doc.text('B.A GestEscola', 105, 36, { align: 'center' });
              
              doc.setFontSize(12);
              doc.setTextColor(100);
              doc.text('Recibo de Matrícula', 105, 43, { align: 'center' });
              
              doc.setLineWidth(0.5);
              doc.line(20, 48, 190, 48);
              startY = 58;
            } else {
              doc.setFontSize(14);
              doc.setTextColor(16, 185, 129);
              doc.text('B.A GestEscola', 105, 20, { align: 'center' });
              
              doc.setFontSize(12);
              doc.setTextColor(100);
              doc.text('Recibo de Matrícula', 105, 30, { align: 'center' });
              
              doc.setLineWidth(0.5);
              doc.line(20, 35, 190, 35);
              startY = 45;
            }
            
            doc.setFontSize(12);
            doc.setTextColor(0);
            
            const lineHeight = 10;
            
            doc.setFont('helvetica', 'bold');
            doc.text('Dados do Aluno:', 20, startY);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Nome Completo: ${s.name}`, 20, startY + lineHeight);
            doc.text(`Nº do BI: ${s.bi}`, 20, startY + lineHeight * 2);
            doc.text(`Data de Nascimento: ${new Date(s.birthDate).toLocaleDateString('pt-PT')}`, 20, startY + lineHeight * 3);
            doc.text(`Género: ${s.gender === 'M' ? 'Masculino' : 'Feminino'}`, 20, startY + lineHeight * 4);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Dados Académicos:', 20, startY + lineHeight * 6);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Turma: ${studentClass?.name || 'N/A'}`, 20, startY + lineHeight * 7);
            doc.text(`Nível/Classe: ${studentClass?.level || 'N/A'}`, 20, startY + lineHeight * 8);
            doc.text(`Data de Matrícula: ${new Date(s.enrollmentDate).toLocaleDateString('pt-PT')}`, 20, startY + lineHeight * 9);
            doc.text(`Estado: ${s.enrollmentStatus}`, 20, startY + lineHeight * 10);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Encarregado de Educação:', 20, startY + lineHeight * 12);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Nome: ${s.guardianName}`, 20, startY + lineHeight * 13);
            doc.text(`Telefone: ${s.guardianPhone}`, 20, startY + lineHeight * 14);
            
            doc.setLineWidth(0.5);
            doc.line(20, 250, 190, 250);
            
            doc.setFontSize(12);
            doc.setTextColor(150);
            doc.text('Documento gerado pelo sistema B.A GestEscola', 105, 260, { align: 'center' });
            doc.text(`Data de emissão: ${new Date().toLocaleString('pt-PT')}`, 105, 265, { align: 'center' });
            
            doc.save(`Recibo_Matricula_${s.name.replace(/\s+/g, '_')}.pdf`);
          }}
        />
      )}

      {editingStudent && (
        <StudentModal 
          student={editingStudent}
          classes={classes}
          onClose={() => setEditingStudent(null)}
          onSave={(s) => {
            onUpdateStudent(s);
            setEditingStudent(null);
          }}
        />
      )}

      {isImportModalOpen && currentUser && (
        <ImportStudentsModal
          classes={classes}
          existingStudents={students}
          onImport={(importedStudents) => {
            if (onImportStudents) {
              onImportStudents(importedStudents);
            }
          }}
          onClose={() => setIsImportModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function TeacherAssignmentModal({ teacher, classes, onClose, onUpdateTeachers, teachers }: {
  teacher: Teacher,
  classes: Class[],
  onClose: () => void,
  onUpdateTeachers?: (newTeachers: Teacher[]) => void,
  teachers: Teacher[]
}) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const subjects = getSubjectsForClass(selectedClass);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || '');

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  const handleAddAssignment = () => {
    if (!selectedClassId || !selectedSubject) return;
    
    // Check if already assigned
    const alreadyAssigned = teacher.assignments.some(a => a.classId === selectedClassId && a.subject === selectedSubject);
    if (alreadyAssigned) return;

    const updatedTeacher = {
      ...teacher,
      assignments: [...teacher.assignments, { classId: selectedClassId, subject: selectedSubject }]
    };

    onUpdateTeachers(teachers.map(t => t.id === teacher.id ? updatedTeacher : t));
  };

  const handleRemoveAssignment = (classId: string, subject: string) => {
    const updatedTeacher = {
      ...teacher,
      assignments: teacher.assignments.filter(a => !(a.classId === classId && a.subject === subject))
    };
    onUpdateTeachers(teachers.map(t => t.id === teacher.id ? updatedTeacher : t));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Atribuir Turmas e Disciplinas</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Professor: {teacher.name}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Selecionar Turma</label>
              <select 
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.shift})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Selecionar Disciplina</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button 
                onClick={handleAddAssignment}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Adicionar Atribuição
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">Atribuições Atuais</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teacher.assignments.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-neutral-50 rounded-3xl border border-dashed border-neutral-200">
                  <p className="text-sm font-bold text-neutral-400">Nenhuma atribuição registada.</p>
                </div>
              ) : (
                teacher.assignments.map((a, i) => {
                  const cls = classes.find(c => c.id === a.classId);
                  return (
                    <div key={i} className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center justify-between shadow-sm group hover:border-emerald-200 transition-all">
                      <div>
                        <p className="text-sm font-black text-neutral-900">{a.subject}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{cls?.name || 'Turma não encontrada'}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveAssignment(a.classId, a.subject)}
                        className="p-2 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TeachersAcademicView({ teachers, classes, onUpdateTeachers, onSelectClass }: {
  teachers: Teacher[],
  classes: Class[],
  onUpdateTeachers?: (newTeachers: Teacher[]) => void,
  onSelectClass: (cls: Class) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar professor por nome ou especialidade..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 rounded-2xl text-sm font-bold transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map(teacher => (
          <motion.div 
            key={teacher.id}
            layout
            className="bg-white rounded-[32px] border border-neutral-200 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all group"
          >
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                  <UserRound size={32} />
                </div>
                <button 
                  onClick={() => setSelectedTeacher(teacher)}
                  className="p-3 bg-neutral-50 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                  title="Atribuir Turmas"
                >
                  <Settings size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-neutral-900 tracking-tight group-hover:text-emerald-600 transition-colors">{teacher.name}</h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{teacher.specialization}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-neutral-500">
                  <Phone size={16} className="shrink-0" />
                  <span className="text-sm font-bold">{teacher.phone}</span>
                </div>
                
                <div className="pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Turmas Atribuídas</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">
                      {teacher.assignments.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {teacher.assignments.length === 0 ? (
                      <p className="text-[10px] font-bold text-neutral-300 italic">Nenhuma turma atribuída</p>
                    ) : (
                      teacher.assignments.slice(0, 3).map((a, i) => {
                        const cls = classes.find(c => c.id === a.classId);
                        return (
                          <button 
                            key={i} 
                            onClick={() => cls && onSelectClass(cls)}
                            className="px-3 py-1 bg-neutral-50 text-neutral-600 rounded-xl text-[10px] font-bold border border-neutral-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
                          >
                            {cls?.name || 'N/A'} - {a.subject}
                          </button>
                        );
                      })
                    )}
                    {teacher.assignments.length > 3 && (
                      <span className="px-3 py-1 bg-neutral-50 text-neutral-400 rounded-xl text-[10px] font-bold">
                        +{teacher.assignments.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedTeacher && (
        <TeacherAssignmentModal 
          teacher={selectedTeacher}
          classes={classes}
          teachers={teachers}
          onClose={() => setSelectedTeacher(null)}
          onUpdateTeachers={onUpdateTeachers}
        />
      )}
    </div>
  );
}

function AcademicView({ classes, students, grades, onUpdateGrades, getGrade, teachers, onUpdateTeachers, schoolSettings, showToast }: { 
  classes: Class[], 
  students: Student[],
  grades: Grade[],
  onUpdateGrades: (newGrades: Grade[]) => void,
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  teachers: Teacher[],
  onUpdateTeachers?: (newTeachers: Teacher[]) => void,
  schoolSettings?: SchoolSettings,
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [topTab, setTopTab] = useState<'Classes' | 'Teachers'>('Classes');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'1T' | '2T' | '3T' | 'Anual'>('1T');
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [tempClassName, setTempClassName] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('Todos');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [isEditingGrades, setIsEditingGrades] = useState(false);
  const [localGrades, setLocalGrades] = useState<Grade[]>([]);

  useEffect(() => {
    setIsEditingGrades(false);
  }, [activeTab, selectedClass]);

  const filteredClasses = classes.filter(c => {
    const matchesLevel = levelFilter === 'Todos' || c.level === levelFilter;
    const matchesSearch = c.name.toLowerCase().includes(classSearchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const subjects = getSubjectsForClass(selectedClass);

  const handleStartEditing = () => {
    if (!selectedClass) return;
    const period = activeTab === '1T' ? '1º Trimestre' : activeTab === '2T' ? '2º Trimestre' : '3º Trimestre';
    const classStudents = students.filter(s => s.classId === selectedClass.id);
    
    const currentGrades = [...grades];
    classStudents.forEach(student => {
      subjects.forEach(subject => {
        (['AC1', 'AC2', 'AC3', 'MAC', 'NPT'] as const).forEach(type => {
          const exists = currentGrades.find(g => g.studentId === student.id && g.subjectId === subject && g.period === period && g.type === type);
          if (!exists) {
            currentGrades.push({
              studentId: student.id,
              subjectId: subject,
              period,
              type,
              value: getGrade(student.id, subject, period, type)
            });
          }
        });
      });
    });
    setLocalGrades(currentGrades);
    setIsEditingGrades(true);
  };

  const handleSaveGrades = () => {
    onUpdateGrades(localGrades);
    setIsEditingGrades(false);
  };

  const updateLocalGrade = (studentId: string, subjectId: string, period: string, type: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT', value: number) => {
    const scale = selectedClass ? getGradeScale(selectedClass.level).max : 20;
    const clampedValue = Math.min(scale, Math.max(0, value));
    setLocalGrades(prev => {
      let updated = prev.map(g => (g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === type) ? { ...g, value: clampedValue } : g);
      const existing = prev.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === type);
      if (!existing) {
        updated.push({ studentId, subjectId, period, type, value: clampedValue });
      }

      if (['AC1', 'AC2', 'AC3'].includes(type)) {
        const getVal = (t: 'AC1' | 'AC2' | 'AC3') => {
          if (t === type) return clampedValue;
          const f = updated.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === t);
          return f ? f.value : (getGrade(studentId, subjectId, period, t) || 0);
        };
        const ac1 = getVal('AC1');
        const ac2 = getVal('AC2');
        const ac3 = getVal('AC3');
        const newMac = Number(((ac1 + ac2 + ac3) / 3).toFixed(1));
        const macExist = updated.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === 'MAC');
        if (macExist) {
          updated = updated.map(g => (g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === 'MAC') ? { ...g, value: newMac } : g);
        } else {
          updated.push({ studentId, subjectId, period, type: 'MAC', value: newMac });
        }
      }

      return updated;
    });
  };

  const getGradeValue = (studentId: string, subjectId: string, period: string, type: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT' = 'MAC') => {
    if (isEditingGrades) {
      const local = localGrades.find(g => g.studentId === studentId && g.subjectId === subjectId && g.period === period && g.type === type);
      return local ? local.value : getGrade(studentId, subjectId, period, type);
    }
    return getGrade(studentId, subjectId, period, type);
  };

  const getMT = (studentId: string, subjectId: string, period: string) => {
    return calculateMT(studentId, subjectId, period, getGradeValue, selectedClass?.level);
  };

  const getClassStats = () => {
    if (!selectedClass || activeTab === 'Anual') return null;
    
    const period = activeTab === '1T' ? '1º Trimestre' : activeTab === '2T' ? '2º Trimestre' : '3º Trimestre';
    const classStudents = students.filter(s => s.classId === selectedClass.id);
    if (classStudents.length === 0) return null;

    let totalGrades = 0;
    let totalCount = 0;
    let passes = 0;
    let fails = 0;

    const subjectStats = subjects.map(subject => {
      let subTotal = 0;
      let subPasses = 0;
      const { threshold } = getGradeScale(selectedClass.level);
      classStudents.forEach(s => {
        const g = getMT(s.id, subject, period);
        subTotal += g;
        if (g >= threshold) subPasses++;
      });
      return {
        subject,
        avg: (subTotal / classStudents.length).toFixed(1),
        passRate: ((subPasses / classStudents.length) * 100).toFixed(0)
      };
    });

    classStudents.forEach(s => {
      let studentAvg = 0;
      const { threshold } = getGradeScale(selectedClass.level);
      subjects.forEach(sub => {
        const g = getMT(s.id, sub, period);
        studentAvg += g;
        totalGrades += g;
        totalCount++;
      });
      if ((studentAvg / subjects.length) >= threshold) passes++;
      else fails++;
    });

    const bestSubject = [...subjectStats].sort((a, b) => Number(b.avg) - Number(a.avg))[0];

    return {
      avg: (totalGrades / totalCount).toFixed(1),
      passRate: ((passes / classStudents.length) * 100).toFixed(0),
      bestSubject: bestSubject?.subject || 'N/A',
      totalStudents: classStudents.length,
      passes,
      fails
    };
  };

  const stats = getClassStats();

  const calculateAnnualMedia = (studentId: string, subjectId: string) => {
    const g1 = getMT(studentId, subjectId, '1º Trimestre');
    const g2 = getMT(studentId, subjectId, '2º Trimestre');
    const g3 = getMT(studentId, subjectId, '3º Trimestre');
    return ((g1 + g2 + g3) / 3).toFixed(1);
  };

  const exportToExcel = () => {
    if (!selectedClass) return;

    const classStudents = students
      .filter(s => s.classId === selectedClass.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const data = classStudents.map((student, index) => {
      const row: any = { 
        'Nº': index + 1,
        'Nome do Aluno': student.name 
      };
      
      if (activeTab === 'Anual') {
        subjects.forEach(subject => {
          row[`${subject} (MF)`] = calculateAnnualMedia(student.id, subject);
        });
        const mt1 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '1º Trimestre'), 0) / (subjects.length || 1);
        const mt2 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '2º Trimestre'), 0) / (subjects.length || 1);
        const mt3 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '3º Trimestre'), 0) / (subjects.length || 1);
        const mf = (mt1 + mt2 + mt3) / 3;
        
        row['MT1'] = mt1.toFixed(1);
        row['MT2'] = mt2.toFixed(1);
        row['MT3'] = mt3.toFixed(1);
        row['MF'] = mf.toFixed(1);
        const { threshold } = getGradeScale(selectedClass.level);
        row['OBS'] = student.enrollmentStatus === 'Desistente' ? 'DESISTENTE' : mf >= threshold ? 'APTO' : 'N/APTO';
      } else {
        const period = activeTab === '1T' ? '1º Trimestre' : activeTab === '2T' ? '2º Trimestre' : '3º Trimestre';
        subjects.forEach(subject => {
          row[`${subject} MAC`] = getGrade(student.id, subject, period, 'MAC');
          row[`${subject} NPT`] = getGrade(student.id, subject, period, 'NPT');
          row[`${subject} MT`] = getMT(student.id, subject, period).toFixed(1);
        });
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Pauta ${activeTab}`);
    
    const fileName = `Pauta_${selectedClass.name.replace(/ /g, '_')}_${activeTab}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = async () => {
    if (!selectedClass) return;

    const classStudents = students
      .filter(s => s.classId === selectedClass.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `Pauta de Aproveitamento - ${selectedClass.name} (${activeTab === 'Anual' ? 'Anual' : activeTab})`;
    
    const insignia = await loadAngolaInsignia();
    let startY = 28;
    if (insignia) {
      doc.addImage(insignia, getImageFormat(insignia), 14, 10, 15, 15);
      doc.setFontSize(14);
      doc.text(title, 34, 15);
      doc.setFontSize(10);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 34, 21);
      startY = 32;
    } else {
      doc.setFontSize(14);
      doc.text(title, 14, 15);
      doc.setFontSize(12);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 22);
      startY = 28;
    }

    let tableHeaders: string[];
    let tableData: any[];

    if (activeTab === 'Anual') {
      tableHeaders = ['Nº', 'Nome do Aluno', ...subjects.map(s => `${s.substring(0,3)}.`), 'MT1', 'MT2', 'MT3', 'MF', 'OBS'];
      tableData = classStudents.map((student, index) => {
        const mt1 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '1º Trimestre'), 0) / (subjects.length || 1);
        const mt2 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '2º Trimestre'), 0) / (subjects.length || 1);
        const mt3 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '3º Trimestre'), 0) / (subjects.length || 1);
        const mf = (mt1 + mt2 + mt3) / 3;
        
        return [
          index + 1,
          student.name,
          ...subjects.map(subject => calculateAnnualMedia(student.id, subject)),
          mt1.toFixed(1),
          mt2.toFixed(1),
          mt3.toFixed(1),
          mf.toFixed(1),
          student.enrollmentStatus === 'Desistente' ? 'DESISTENTE' : mf >= getGradeScale(selectedClass.level).threshold ? 'APTO' : 'N/APTO'
        ];
      });
    } else {
      const period = activeTab === '1T' ? '1º Trimestre' : activeTab === '2T' ? '2º Trimestre' : '3º Trimestre';
      tableHeaders = ['Nº', 'Nome do Aluno'];
      subjects.forEach(s => {
        tableHeaders.push(`${s.substring(0,3)}. MAC`);
        tableHeaders.push(`${s.substring(0,3)}. NPT`);
        tableHeaders.push(`${s.substring(0,3)}. MT`);
      });
      
      tableData = classStudents.map((student, index) => {
        const row = [index + 1, student.name];
        subjects.forEach(subject => {
          row.push(getGrade(student.id, subject, period, 'MAC').toString());
          row.push(getGrade(student.id, subject, period, 'NPT').toString());
          row.push(getMT(student.id, subject, period).toFixed(1));
        });
        return row;
      });
    }

    autoTable(doc, {
      startY: startY,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 12 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 35 },
      }
    });

    // Add space for signatures and date
    const finalY = (doc as any).lastAutoTable?.finalY || (startY + 100);
    const paperWidth = 297;
    const paperHeight = 210;
    const margin = 14;
    
    let sigY = finalY + 10;
    const requiredHeight = 35;
    
    if (sigY + requiredHeight > paperHeight - margin) {
      doc.addPage();
      sigY = margin + 15;
    }
    
    // Date line
    doc.setFont('helvetica', 'bold');
    const dateFontSize = 9;
    doc.setFontSize(dateFontSize);
    const dateText = "Em _________________________, aos _____ de _________________ de 20____";
    doc.text(dateText, paperWidth - margin, sigY, { align: 'right' });
    
    // Signatures columns
    const colWidth = (paperWidth - (margin * 2)) / 3;
    const sigLabelY = sigY + 10;
    const lineY = sigLabelY + 14;
    const descY = lineY + 4;
    
    const sigLabelFontSize = 9;
    const sigDescFontSize = 7.5;
    
    const sigs = [
      { label: "O Professor", desc: "(Assinatura legível)" },
      { label: "O Subdirector Pedagógico", desc: "(Assinatura legível)" },
      { label: "O Director da Escola", desc: "(Assinatura legível)" }
    ];
    
    sigs.forEach((sig, index) => {
      const colCenterX = margin + (index * colWidth) + (colWidth / 2);
      
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sigLabelFontSize);
      doc.text(sig.label, colCenterX, sigLabelY, { align: 'center' });
      
      // Line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sigLabelFontSize);
      const lineText = "__________________________";
      doc.text(lineText, colCenterX, lineY, { align: 'center' });
      
      // Description
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(sigDescFontSize);
      doc.text(sig.desc, colCenterX, descY, { align: 'center' });
    });

    doc.save(`Pauta_${selectedClass.name.replace(/ /g, '_')}_${activeTab}.pdf`);
  };

  const exportStudentList = () => {
    if (!selectedClass) return;

    const classStudents = students
      .filter(s => s.classId === selectedClass.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const data = classStudents.map((student, index) => ({
      'Nº': index + 1,
      'Nome Completo': student.name,
      'BI': student.bi,
      'Género': student.gender === 'M' ? 'Masculino' : 'Feminino',
      'Estado': student.enrollmentStatus,
      'Data de Matrícula': student.enrollmentDate
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Alunos');
    
    const fileName = `Lista_Alunos_${selectedClass.name.replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 p-1.5 bg-neutral-100 rounded-[28px] w-fit border border-neutral-200/50">
        <button
          onClick={() => setTopTab('Classes')}
          className={cn(
            "px-8 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            topTab === 'Classes' 
              ? "bg-white text-emerald-600 shadow-sm" 
              : "text-neutral-400 hover:text-neutral-600"
          )}
        >
          <Layers size={16} />
          Turmas e Pautas
        </button>
        <button
          onClick={() => setTopTab('Teachers')}
          className={cn(
            "px-8 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            topTab === 'Teachers' 
              ? "bg-white text-emerald-600 shadow-sm" 
              : "text-neutral-400 hover:text-neutral-600"
          )}
        >
          <UserRound size={16} />
          Professores e Atribuições
        </button>
      </div>

      {topTab === 'Teachers' ? (
        <TeachersAcademicView 
          teachers={teachers} 
          classes={classes} 
          onUpdateTeachers={onUpdateTeachers} 
          onSelectClass={(cls) => {
            setSelectedClass(cls);
            setTopTab('Classes');
          }}
        />
      ) : (
        <div className="space-y-8">
          {!selectedClass ? (
            <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Selecione uma Turma</h3>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Escolha a turma para gerir pautas e notas</p>
              
              <div className="mt-4 relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar turma pelo nome..." 
                  value={classSearchTerm}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-neutral-100 rounded-[24px] w-fit border border-neutral-200/50">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={cn(
                    "px-6 py-2.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all",
                    levelFilter === lvl 
                      ? "bg-white text-emerald-600 shadow-sm" 
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClasses.map((cls) => {
              const classStudentsCount = students.filter(s => s.classId === cls.id).length;
              return (
                <button 
                  key={cls.id} 
                  onClick={() => setSelectedClass(cls)}
                  className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-neutral-50 rounded-bl-[60px] -mr-12 -mt-12 transition-all group-hover:bg-emerald-50 duration-500" />
                  
                  <div className="relative flex items-center justify-between mb-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                      {cls.level.charAt(0)}
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 bg-neutral-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-neutral-100">{cls.shift}</span>
                  </div>
                  
                  <h4 className="font-black text-xl text-neutral-900 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors">{cls.name}</h4>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">{cls.level}</p>
                  
                  <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-neutral-300" />
                      <span className="text-xs font-bold text-neutral-500">{classStudentsCount} Alunos</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <span className="text-[10px] font-black uppercase tracking-widest">Abrir Pauta</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {filteredClasses.length === 0 && (
            <div className="p-20 text-center bg-white rounded-[40px] border border-dashed border-neutral-200">
              <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers size={32} className="text-neutral-200" />
              </div>
              <h4 className="text-xl font-black text-neutral-900">Nenhuma turma encontrada</h4>
              <p className="text-sm text-neutral-400 mt-2 max-w-xs mx-auto">Não existem turmas registadas para este nível de ensino no momento.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-neutral-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-bl-[200px] -mr-32 -mt-32 -z-0" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
              <button 
                onClick={() => setSelectedClass(null)} 
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-neutral-100 text-neutral-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
              >
                <X size={24} />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">
                    {selectedClass.level}
                  </span>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-neutral-300" />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    Turno {selectedClass.shift}
                  </span>
                </div>
                <div className="flex items-center gap-3 group">
                  <h3 className="text-2xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                    {selectedClass.name}
                  </h3>
                  <button 
                    onClick={() => {
                      setTempClassName(selectedClass.name);
                      setIsEditingClassName(true);
                    }}
                    className="p-2 text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-bold text-neutral-400 mt-1">Gestão de pautas e aproveitamento escolar</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row flex-wrap gap-4">
              <div className="flex flex-wrap gap-1 p-1 bg-neutral-100 rounded-[20px] border border-neutral-200/50">
                {(['1T', '2T', '3T', 'Anual'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 sm:px-6 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    {tab === 'Anual' ? 'Anual' : tab}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                {activeTab !== 'Anual' && (
                  <button 
                    onClick={() => isEditingGrades ? handleSaveGrades() : handleStartEditing()} 
                    className={cn(
                      "flex-1 sm:flex-none px-6 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                      isEditingGrades 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100" 
                        : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-neutral-100"
                    )}
                  >
                    {isEditingGrades ? <Check size={18} /> : <Pencil size={18} />}
                    {isEditingGrades ? 'Salvar' : 'Lançar Notas'}
                  </button>
                )}
                <div className="flex bg-white rounded-2xl border border-neutral-200 p-1 shadow-sm">
                  <button onClick={exportToExcel} className="p-2.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Exportar Excel">
                    <FileDown size={20} />
                  </button>
                  <button onClick={exportToPDF} className="p-2.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Exportar PDF (Pauta Actual)">
                    <FileDown size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedClass && schoolSettings) {
                        const classStudents = students.filter(s => s.classId === selectedClass.id).sort((a,b) => a.name.localeCompare(b.name));
                        generateUnifiedClassPautasPDF(selectedClass, classStudents, getGrade, schoolSettings, showToast);
                      }
                    }} 
                    className="p-2.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                    title="Exportar PDF Unificado (Todas as Disciplinas para Arquivo Impresso)"
                  >
                    <FileText size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Aproveitamento', value: `${stats.passRate}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: `${stats.passes} Alunos Aprovados` },
                { label: 'Média da Turma', value: stats.avg, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Escala 0-20 valores' },
                { label: 'Melhor Disciplina', value: stats.bestSubject, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Maior média trimestral' },
                { label: 'Em Risco', value: stats.fails, icon: X, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Alunos abaixo da média' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <h4 className="text-3xl font-black text-neutral-900 tracking-tight truncate">{stat.value}</h4>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mt-1">{stat.desc}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th rowSpan={activeTab === 'Anual' ? 1 : 2} className="px-8 py-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest sticky left-0 bg-neutral-50/50 z-20 backdrop-blur-sm">Aluno</th>
                    {subjects.map(subject => (
                      <th key={subject} colSpan={activeTab === 'Anual' ? 1 : 3} className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-l border-neutral-100">{subject}</th>
                    ))}
                    {activeTab === 'Anual' && (
                      <>
                        <th className="px-6 py-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-l border-neutral-100">MT1</th>
                        <th className="px-6 py-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-l border-neutral-100">MT2</th>
                        <th className="px-6 py-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-l border-neutral-100">MT3</th>
                        <th className="px-8 py-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/50 sticky right-0 z-20 backdrop-blur-sm border-l border-emerald-100">MF</th>
                        <th className="px-8 py-6 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-l border-neutral-100">OBS</th>
                      </>
                    )}
                  </tr>
                  {activeTab !== 'Anual' && (
                    <tr className="bg-neutral-50/50 border-b border-neutral-100">
                      {subjects.map(subject => (
                        <React.Fragment key={subject}>
                          <th className="px-2 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center border-l border-neutral-100">MAC</th>
                          <th className="px-2 py-2 text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">NPT</th>
                          <th className="px-2 py-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30">MT</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {students
                    .filter(s => s.classId === selectedClass.id)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((student) => {
                      const mt1 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '1º Trimestre'), 0) / (subjects.length || 1);
                      const mt2 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '2º Trimestre'), 0) / (subjects.length || 1);
                      const mt3 = subjects.reduce((acc, sub) => acc + getMT(student.id, sub, '3º Trimestre'), 0) / (subjects.length || 1);
                      const mf = (mt1 + mt2 + mt3) / 3;

                    return (
                      <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                          {student.name}
                        </td>
                        {subjects.map(subject => {
                          const period = activeTab === '1T' ? '1º Trimestre' : activeTab === '2T' ? '2º Trimestre' : '3º Trimestre';
                          
                          if (activeTab === 'Anual') {
                            const subjMf = calculateAnnualMedia(student.id, subject);
                            const { threshold: tSubj } = getGradeScale(selectedClass.level);
                            return (
                              <td key={subject} className="px-6 py-5 text-center border-l border-neutral-50">
                                <span className={cn("text-sm font-black", Number(subjMf) >= tSubj ? "text-neutral-900" : "text-rose-600")}>
                                  {subjMf}
                                </span>
                              </td>
                            );
                          }

                          const mac = getGradeValue(student.id, subject, period, 'MAC');
                          const npt = getGradeValue(student.id, subject, period, 'NPT');
                          const mt = (mac + npt) / 2;
                          const { max, threshold: tMt } = getGradeScale(selectedClass.level);

                          return (
                            <React.Fragment key={subject}>
                              <td className="px-2 py-5 text-center border-l border-neutral-50">
                                {isEditingGrades ? (
                                  <input 
                                    type="number" min="0" max={max} step="0.1"
                                    value={mac}
                                    onChange={(e) => updateLocalGrade(student.id, subject, period, 'MAC', Number(e.target.value))}
                                    className={cn("w-12 p-1 text-center bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-emerald-500 font-bold text-xs", mac >= tMt ? "text-neutral-900" : "text-rose-600")}
                                  />
                                ) : (
                                  <span className={cn("text-xs font-bold", mac >= tMt ? "text-neutral-900" : "text-rose-600")}>{mac}</span>
                                )}
                              </td>
                              <td className="px-2 py-5 text-center">
                                {isEditingGrades ? (
                                  <input 
                                    type="number" min="0" max={max} step="0.1"
                                    value={npt}
                                    onChange={(e) => updateLocalGrade(student.id, subject, period, 'NPT', Number(e.target.value))}
                                    className={cn("w-12 p-1 text-center bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-emerald-500 font-bold text-xs", npt >= tMt ? "text-neutral-900" : "text-rose-600")}
                                  />
                                ) : (
                                  <span className={cn("text-xs font-bold", npt >= tMt ? "text-neutral-900" : "text-rose-600")}>{npt}</span>
                                )}
                              </td>
                              <td className="px-2 py-5 text-center bg-emerald-50/30">
                                <span className={cn("text-xs font-black", mt >= tMt ? "text-neutral-900" : "text-rose-600")}>
                                  {mt.toFixed(1)}
                                </span>
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {activeTab === 'Anual' && (
                          <>
                            <td className="px-6 py-5 text-center border-l border-neutral-50">
                              <span className={cn("text-sm font-bold", mt1 >= getGradeScale(selectedClass.level).threshold ? "text-neutral-900" : "text-rose-600")}>{mt1.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-5 text-center border-l border-neutral-50">
                              <span className={cn("text-sm font-bold", mt2 >= getGradeScale(selectedClass.level).threshold ? "text-neutral-900" : "text-rose-600")}>{mt2.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-5 text-center border-l border-neutral-50">
                              <span className={cn("text-sm font-bold", mt3 >= getGradeScale(selectedClass.level).threshold ? "text-neutral-900" : "text-rose-600")}>{mt3.toFixed(1)}</span>
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                              <span className={cn("font-black text-lg", mf >= getGradeScale(selectedClass.level).threshold ? "text-neutral-900" : "text-rose-700")}>
                                {mf.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                              <span className={cn(
                                "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                                student.enrollmentStatus === 'Desistente' ? "bg-neutral-100 text-neutral-400" :
                                mf >= getGradeScale(selectedClass.level).threshold ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              )}>
                                {student.enrollmentStatus === 'Desistente' ? 'DESISTENTE' : mf >= getGradeScale(selectedClass.level).threshold ? 'APTO' : 'N/APTO'}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>
);
}

function FinanceView({ students, payments, expenses = [], classes, onAddPayment, onAddExpense, onDeleteExpense, onUpdateExpense, confirmAction, currentUser, schoolName, schoolSettings }: { 
  students: Student[], 
  payments: Payment[], 
  expenses?: Expense[], 
  classes: Class[], 
  onAddPayment?: (p: Payment) => void,
  onAddExpense?: (e: Expense) => void,
  onDeleteExpense?: (id: string) => void,
  onUpdateExpense?: (e: Expense) => void,
  confirmAction: (title: string, message: string, onConfirm: () => void) => void,
  currentUser: any,
  schoolName?: string,
  schoolSettings?: SchoolSettings
}) {
  const [activeSubTab, setActiveSubTab] = useState<'entradas' | 'saidas' | 'caixa' | 'atrasos'>('entradas');
  const [isPaying, setIsPaying] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Payments Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');

  // Expenses Filters
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('all');

  const filteredPayments = payments.filter(p => {
    const student = students.find(s => s.id === p.studentId);
    const matchesSearch = student?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassId === 'all' || student?.classId === selectedClassId;
    return matchesSearch && matchesClass;
  });

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(expenseSearchTerm.toLowerCase()) ||
                         e.category.toLowerCase().includes(expenseSearchTerm.toLowerCase()) ||
                         (e.receiptNumber && e.receiptNumber.toLowerCase().includes(expenseSearchTerm.toLowerCase()));
    const matchesCategory = selectedExpenseCategory === 'all' || e.category === selectedExpenseCategory;
    return matchesSearch && matchesCategory;
  });

  const generateReceiptPDF = async (payment: Payment, student: Student, cls: Class | undefined) => {
    const doc = new jsPDF();
    const insignia = await loadAngolaInsignia(schoolSettings?.logoBase64);
    
    let textStartY = 20;
    let startLineY = 35;
    
    if (insignia) {
      try {
        doc.addImage(insignia, getImageFormat(insignia), 95, 10, 20, 20);
        textStartY = 37;
        startLineY = 52;
      } catch (e) {
        console.error('Erro ao adicionar logótipo ao recibo:', e);
      }
    }
    
    // Header
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text(schoolSettings?.nomeEscola || schoolName || 'RECIBO DE PAGAMENTO', 105, textStartY, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('RECIBO DE PAGAMENTO', 105, textStartY + 8, { align: 'center' });
    
    // Receipt Info
    doc.setDrawColor(230, 230, 230);
    doc.line(20, startLineY, 190, startLineY);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nº Recibo: ${payment.receiptNumber}`, 20, startLineY + 10);
    doc.text(`Data: ${payment.date}`, 190, startLineY + 10, { align: 'right' });
    
    // Student Info
    doc.setFillColor(245, 245, 245);
    doc.rect(20, startLineY + 20, 170, 40, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('DADOS DO ALUNO', 25, startLineY + 27);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nome: ${student.name}`, 25, startLineY + 37);
    doc.text(`BI: ${student.bi}`, 25, startLineY + 45);
    doc.text(`Classe: ${cls?.name || 'N/A'}`, 25, startLineY + 53);
    
    // Payment Details
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('DETALHES DO PAGAMENTO', 20, startLineY + 75);
    
    autoTable(doc, {
      startY: startLineY + 80,
      head: [['Descrição', 'Mês', 'Valor']],
      body: [[
        payment.service,
        payment.month || 'N/A',
        `${payment.amount.toLocaleString()} AKZ`
      ]],
      theme: 'striped',
      headStyles: { fillColor: [30, 30, 30] },
      styles: { fontSize: 12 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${payment.amount.toLocaleString()} AKZ`, 190, finalY, { align: 'right' });
    
    // Footer
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('___________________________', 105, finalY + 40, { align: 'center' });
    doc.text('Assinatura / Carimbo', 105, finalY + 48, { align: 'center' });
    
    doc.save(`Recibo_${payment.receiptNumber}_${student.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const insignia = await loadAngolaInsignia();
    
    let textStartY = 20;
    let startY = 30;
    
    if (insignia) {
      doc.addImage(insignia, getImageFormat(insignia), 95, 10, 20, 20);
      textStartY = 37;
      startY = 44;
    }
    
    doc.setFontSize(14);
    doc.text('Relatório de Pagamentos e Serviços', 105, textStartY, { align: 'center' });
    
    const tableData = filteredPayments.map((p, i) => {
      const student = students.find(s => s.id === p.studentId);
      const cls = classes.find(c => c.id === student?.classId);
      return [
        i + 1,
        student?.name || 'N/A',
        cls?.name || 'N/A',
        p.service,
        p.month || '-',
        `${p.amount.toLocaleString()} AKZ`,
        p.date,
        p.receiptNumber
      ];
    });

    autoTable(doc, {
      startY: startY,
      head: [['Nº', 'Aluno', 'Classe', 'Serviço', 'Mês', 'Valor', 'Data', 'Recibo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 30] },
      styles: { fontSize: 12 }
    });

    doc.save('Relatorio_Financeiro.pdf');
  };

  const handleExportExcel = () => {
    const data = filteredPayments.map((p, i) => {
      const student = students.find(s => s.id === p.studentId);
      return {
        'Nº': i + 1,
        'Aluno': student?.name || 'N/A',
        'Serviço': p.service,
        'Mês': p.month || 'N/A',
        'Valor (AKZ)': p.amount,
        'Data': p.date,
        'Recibo': p.receiptNumber,
        'Estado': p.status
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagamentos');
    XLSX.writeFile(workbook, 'Relatorio_Financeiro.xlsx');
  };

  const handleExportExpensesPDF = async () => {
    const doc = new jsPDF();
    const insignia = await loadAngolaInsignia();
    
    let textStartY = 20;
    let startY = 30;
    
    if (insignia) {
      doc.addImage(insignia, getImageFormat(insignia), 95, 10, 20, 20);
      textStartY = 37;
      startY = 44;
    }
    
    doc.setFontSize(14);
    doc.text('Relatório de Despesas e Gastos', 105, textStartY, { align: 'center' });
    
    const tableData = filteredExpenses.map((e, i) => [
      i + 1,
      e.description,
      e.category,
      e.date,
      e.receiptNumber || '-',
      `${e.amount.toLocaleString()} AKZ`
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Nº', 'Descrição', 'Categoria', 'Data', 'Recibo / Doc', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28] },
      styles: { fontSize: 12 }
    });

    doc.save('Relatorio_Despesas.pdf');
  };

  const handleExportExpensesExcel = () => {
    const data = filteredExpenses.map((e, i) => ({
      'Nº': i + 1,
      'Descrição': e.description,
      'Categoria': e.category,
      'Valor (AKZ)': e.amount,
      'Data': e.date,
      'Recibo/Documento': e.receiptNumber || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Despesas');
    XLSX.writeFile(workbook, 'Relatorio_Despesas.xlsx');
  };

  const totalRevenue = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netBalance = totalRevenue - totalExpenses;

  const categories = ['Salários', 'Material', 'Manutenção', 'Serviços', 'Alimentação', 'Outros'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Controlo Financeiro</h3>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Gestão de propinas, pagamentos e gastos</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {activeSubTab === 'entradas' ? (
            <>
              <select 
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-2xl font-bold outline-none focus:border-emerald-500"
              >
                <option value="all">Todas as Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button 
                onClick={() => window.print()}
                className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
              >
                <Printer size={18} />
                Imprimir
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
              >
                <FileSpreadsheet size={18} />
                Excel
              </button>
              <button 
                onClick={handleExportPDF}
                className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
              >
                <FileDown size={18} />
                PDF
              </button>
              <div className="relative group no-print">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar recibo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm w-full sm:w-64 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
              {onAddPayment && (
                <button 
                  onClick={() => setIsPaying(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-amber-100 active:scale-95 no-print"
                  style={{ display: currentUser?.role === 'Professor' ? 'none' : 'flex' }}
                >
                  <DollarSign size={20} />
                  Efectuar Pagamento
                </button>
              )}
            </>
          ) : (
            <>
              <select 
                value={selectedExpenseCategory}
                onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-2xl font-bold outline-none focus:border-rose-500"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button 
                onClick={() => window.print()}
                className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
              >
                <Printer size={18} />
                Imprimir
              </button>
              <button 
                onClick={handleExportExpensesExcel}
                className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
              >
                <FileSpreadsheet size={18} />
                Excel
              </button>
              <button 
                onClick={handleExportExpensesPDF}
                className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
              >
                <FileDown size={18} />
                PDF
              </button>
              <div className="relative group no-print">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-rose-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar gasto..." 
                  value={expenseSearchTerm}
                  onChange={(e) => setExpenseSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm w-full sm:w-64 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-medium"
                />
              </div>
              {onAddExpense && (
                <button 
                  onClick={() => setIsAddingExpense(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-rose-100 active:scale-95 no-print"
                >
                  <Plus size={20} />
                  Registar Gasto / Saída
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-neutral-200 no-print">
        <button
          onClick={() => setActiveSubTab('entradas')}
          className={cn(
            "px-6 py-3 border-b-2 font-black uppercase tracking-wider text-xs transition-all",
            activeSubTab === 'entradas' 
              ? "border-emerald-600 text-emerald-600 bg-emerald-50/30" 
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          )}
        >
          Entradas / Receitas
        </button>
        <button
          onClick={() => setActiveSubTab('saidas')}
          className={cn(
            "px-6 py-3 border-b-2 font-black uppercase tracking-wider text-xs transition-all",
            activeSubTab === 'saidas' 
              ? "border-rose-600 text-rose-600 bg-rose-50/30" 
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          )}
        >
          Saídas / Gastos
        </button>
        <button
          onClick={() => setActiveSubTab('caixa')}
          className={cn(
            "px-6 py-3 border-b-2 font-black uppercase tracking-wider text-xs transition-all",
            activeSubTab === 'caixa' 
              ? "border-blue-600 text-blue-600 bg-blue-50/30" 
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          )}
        >
          Relatório de Caixa
        </button>
        <button
          onClick={() => setActiveSubTab('atrasos')}
          className={cn(
            "px-6 py-3 border-b-2 font-black uppercase tracking-wider text-xs transition-all",
            activeSubTab === 'atrasos' 
              ? "border-amber-600 text-amber-600 bg-amber-50/30" 
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          )}
        >
          Alunos em Atraso
        </button>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Receitas (Entradas)', value: `${totalRevenue.toLocaleString()} AKZ`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Gastos (Saídas)', value: `${totalExpenses.toLocaleString()} AKZ`, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
          { 
            label: 'Saldo de Caixa', 
            value: `${netBalance.toLocaleString()} AKZ`, 
            icon: DollarSign, 
            color: netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600', 
            bg: netBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <h4 className="text-2xl font-black text-neutral-900 tracking-tight truncate">{stat.value}</h4>
          </div>
        ))}
      </div>

      {activeSubTab === 'entradas' ? (
        <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Aluno</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Serviço</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Mês de Referência</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Valor Pago</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Data do Registo</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredPayments.map((payment) => {
                  const student = students.find(s => s.id === payment.studentId);
                  const cls = classes.find(c => c.id === student?.classId);
                  return (
                    <tr key={payment.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <p className="font-bold text-neutral-900 tracking-tight">
                            {student?.name || 'N/A'}
                          </p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">{cls?.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-bold text-neutral-600">{payment.service}</span>
                      </td>
                      <td className="px-8 py-5">
                        {payment.month ? (
                          <span className="px-3 py-1 bg-neutral-100 rounded-xl text-[10px] font-black text-neutral-600 uppercase tracking-wider">
                            {payment.month}
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-black text-emerald-600">
                          {payment.amount.toLocaleString()} AKZ
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-bold text-neutral-500">{payment.date}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[10px] font-bold text-neutral-400 font-mono bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100">
                            {payment.receiptNumber}
                          </span>
                          <button 
                            onClick={() => student && generateReceiptPDF(payment, student, cls)}
                            className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all no-print"
                            title="Descarregar Recibo PDF"
                          >
                            <FileDown size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-12 text-neutral-400 text-xs uppercase tracking-widest font-black">
                      Nenhum pagamento registado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Documento / Recibo</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Data</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Valor</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="font-bold text-neutral-900 tracking-tight">{expense.description}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-rose-50 rounded-xl text-[10px] font-black text-rose-600 uppercase tracking-wider">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-neutral-500 font-mono">
                        {expense.receiptNumber || <span className="text-neutral-300">-</span>}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-neutral-500">{expense.date}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-rose-600">
                        -{expense.amount.toLocaleString()} AKZ
                      </span>
                    </td>
                    <td className="px-8 py-5 no-print">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingExpense(expense)}
                          className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        {onDeleteExpense && (
                          <button 
                            onClick={() => confirmAction(
                              'Eliminar Gasto',
                              `Tem a certeza que deseja eliminar o gasto "${expense.description}" no valor de ${expense.amount.toLocaleString()} AKZ?`,
                              () => onDeleteExpense(expense.id)
                            )}
                            className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-12 text-neutral-400 text-xs uppercase tracking-widest font-black">
                      Nenhum gasto ou saída registada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeSubTab === 'caixa' && (
        <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-blue-50/50">
            <div>
              <h3 className="text-xl font-black text-blue-900 tracking-tight">Relatório de Caixa Geral</h3>
              <p className="text-xs font-bold text-blue-700/60 uppercase tracking-widest mt-1">Transações ordenadas por data</p>
            </div>
            <button 
              onClick={() => window.print()}
              className="bg-white border border-neutral-200 text-neutral-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
            >
              <Printer size={16} /> Imprimir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Data</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {[
                  ...filteredPayments.map(p => ({ 
                    id: `p-${p.id}`, 
                    date: p.date, 
                    type: 'entrada', 
                    desc: `${p.service} - ${students.find(s => s.id === p.studentId)?.name || 'N/A'}`,
                    amount: p.amount 
                  })),
                  ...filteredExpenses.map(e => ({ 
                    id: `e-${e.id}`, 
                    date: e.date, 
                    type: 'saida', 
                    desc: e.description,
                    amount: -e.amount 
                  }))
                ].sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime()).map(tx => (
                  <tr key={tx.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-neutral-500">{tx.date}</td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        tx.type === 'entrada' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {tx.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-neutral-900">{tx.desc}</td>
                    <td className={cn(
                      "px-8 py-5 text-right font-black",
                      tx.type === 'entrada' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {tx.type === 'entrada' ? '+' : ''}{tx.amount.toLocaleString()} AKZ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeSubTab === 'atrasos' && (
        <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 bg-amber-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-amber-900 tracking-tight">Controlo de Alunos em Atraso</h3>
              <p className="text-xs font-bold text-amber-700/60 uppercase tracking-widest mt-1">Alunos sem pagamento de propina no mês atual</p>
            </div>
            <button 
              onClick={() => window.print()}
              className="bg-white border border-neutral-200 text-neutral-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95 no-print"
            >
              <Printer size={16} /> Imprimir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Aluno</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Classe</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Encarregado</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Telefone</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {students.filter(student => {
                  const currentMonth = new Date().toLocaleString('pt-PT', { month: 'long' });
                  const hasPaidThisMonth = payments.some(p => p.studentId === student.id && (p.service.toLowerCase().includes('propina') || p.service.toLowerCase().includes('mensalidade')) && p.month?.toLowerCase() === currentMonth.toLowerCase());
                  return !hasPaidThisMonth;
                }).map(student => {
                  const cls = classes.find(c => c.id === student.classId);
                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-neutral-900">{student.name}</td>
                      <td className="px-8 py-5 text-sm font-bold text-neutral-500">{cls?.name || 'N/A'}</td>
                      <td className="px-8 py-5 text-sm font-bold text-neutral-500">{student.guardianName || 'N/A'}</td>
                      <td className="px-8 py-5 text-sm font-bold text-neutral-500">{student.guardianPhone || 'N/A'}</td>
                      <td className="px-8 py-5">
                        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest">Atrasado</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeSubTab === 'atrasos' && (
        <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 bg-amber-50/50">
            <h3 className="text-xl font-black text-amber-900 tracking-tight">Controlo de Alunos em Atraso</h3>
            <p className="text-xs font-bold text-amber-700/60 uppercase tracking-widest mt-1">Alunos com pagamentos pendentes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Aluno</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Classe</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Último Pagamento</th>
                  <th className="px-8 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {students.slice(0, 5).map(student => {
                  const cls = classes.find(c => c.id === student.classId);
                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-neutral-900">{student.name}</td>
                      <td className="px-8 py-5 text-sm font-bold text-neutral-500">{cls?.name || 'N/A'}</td>
                      <td className="px-8 py-5 text-sm font-bold text-neutral-500">-</td>
                      <td className="px-8 py-5">
                        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest">Pendente</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isPaying && onAddPayment && (
        <PaymentModal schoolName={schoolName} 
          students={students} 
          classes={classes} 
          onClose={() => setIsPaying(false)} 
          onAddPayment={onAddPayment} 
        />
      )}

      {(isAddingExpense || editingExpense) && (
        <ExpenseModal 
          expense={editingExpense}
          onClose={() => {
            setIsAddingExpense(false);
            setEditingExpense(null);
          }} 
          onAddExpense={onAddExpense} 
          onUpdateExpense={onUpdateExpense}
        />
      )}
    </div>
  );
}

function ExpenseModal({ expense, onClose, onAddExpense, onUpdateExpense }: {
  expense: Expense | null,
  onClose: () => void,
  onAddExpense: (e: Expense) => void,
  onUpdateExpense: (e: Expense) => void
}) {
  const isEditing = !!expense;
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState(expense?.category || 'Material');
  const [amount, setAmount] = useState(expense?.amount || 10000);
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState(expense?.receiptNumber || '');

  const categories = ['Salários', 'Material', 'Manutenção', 'Serviços', 'Alimentação', 'Outros'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 max-h-[95vh] flex flex-col"
      >
        <div className="p-6 sm:p-10 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/50">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              {isEditing ? 'Editar Despesa' : 'Registar Gasto / Saída'}
            </h3>
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
              {isEditing ? 'Actualizar dados do gasto' : 'Registo de saídas e despesas da escola'}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-2 sm:p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
            <X size={24} />
          </button>
        </div>
        <form className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto flex-1" onSubmit={(e) => {
          e.preventDefault();
          const newExpense: Expense = {
            id: expense?.id || Math.random().toString(36).substr(2, 9),
            description,
            category,
            amount: Number(amount),
            date,
            receiptNumber: receiptNumber || undefined
          };
          if (isEditing) {
            onUpdateExpense(newExpense);
          } else {
            onAddExpense(newExpense);
          }
          onClose();
        }}>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Descrição</label>
              <input 
                required 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compra de Resmas de Papel A4" 
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-medium text-sm" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Categoria</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-bold"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Valor (AKZ)</label>
              <input 
                required 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-black text-rose-600" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Data</label>
              <input 
                required 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-medium" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nº Recibo / Documento (Opcional)</label>
              <input 
                type="text" 
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Ex: FT-2026/001" 
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-medium text-sm" 
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 sm:pt-10 border-t border-neutral-100">
            <button type="button" onClick={onClose} className="px-8 py-4 text-neutral-500 font-bold hover:text-neutral-900 transition-colors order-2 sm:order-1">Cancelar</button>
            <button type="submit" className="bg-rose-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-rose-100 active:scale-95 transition-all hover:bg-rose-700 order-1 sm:order-2">
              {isEditing ? 'Guardar Alterações' : 'Confirmar Gasto'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function TeachersView({ teachers, classes, onAddTeacher, onUpdateTeacher, onDeleteTeacher, showToast }: { 
  teachers: Teacher[],
  classes: Class[],
  onAddTeacher?: (t: Teacher) => void,
  onUpdateTeacher?: (t: Teacher) => void,
  onDeleteTeacher?: (id: string) => void,
  showToast: (m: string, t?: any) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const data = filteredTeachers.map((t, i) => ({
      'Nº': i + 1,
      'Nome Completo': t.name,
      'Especialização': t.specialization,
      'Telefone': t.phone
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Professores');
    XLSX.writeFile(workbook, 'Lista_Professores.xlsx');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Corpo Docente</h3>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Gestão de professores e especialidades</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar professor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-sm w-full sm:w-64 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button 
            onClick={handleExportExcel}
            className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-50 active:scale-95"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          {onAddTeacher && (
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-emerald-100 active:scale-95"
            >
              <Plus size={20} />
              Novo Professor
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {filteredTeachers.map((teacher) => (
        <div key={teacher.id} className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-16 -mt-16 transition-all group-hover:w-40 group-hover:h-40 duration-500" />
          
          <div className="relative flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[24px] bg-neutral-100 overflow-hidden shrink-0 shadow-inner border-4 border-white">
              <img 
                src={`https://picsum.photos/seed/${teacher.id}/200/200`} 
                alt={teacher.name} 
                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <h4 className="font-black text-lg sm:text-xl text-neutral-900 tracking-tight leading-tight">{teacher.name}</h4>
              <p className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-widest mt-1">{teacher.specialization}</p>
              <div className="flex items-center gap-2 mt-3 text-neutral-400">
                <Phone size={14} />
                <span className="text-xs font-bold">{teacher.phone}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-neutral-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const link = `${window.location.origin}${window.location.pathname}?portal=teacher&token=${teacher.portalToken}`;
                  navigator.clipboard.writeText(link);
                  showToast('Link do portal copiado para a área de transferência');
                }}
                className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="Copiar Link do Portal"
              >
                <LinkIcon size={16} />
              </button>
              <button 
                onClick={() => setEditingTeacher(teacher)}
                className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
              >
                <Pencil size={16} />
              </button>
              {onDeleteTeacher && (
                <button 
                  onClick={() => onDeleteTeacher(teacher.id)}
                  className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      </div>

      {(isAdding || editingTeacher) && (
        <TeacherModal 
          teacher={editingTeacher}
          classes={classes}
          onClose={() => { setIsAdding(false); setEditingTeacher(null); }}
          onSave={(t) => {
            if (editingTeacher) onUpdateTeacher(t);
            else onAddTeacher(t);
            setIsAdding(false);
            setEditingTeacher(null);
          }}
        />
      )}
    </div>
  );
}

function TeacherModal({ teacher, classes, onClose, onSave }: { 
  teacher: Teacher | null, 
  classes: Class[],
  onClose: () => void, 
  onSave: (t: Teacher) => void 
}) {
  const [formData, setFormData] = useState<Partial<Teacher>>(
    teacher ? { 
      ...teacher, 
      portalToken: teacher.portalToken || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))
    } : { 
      name: '', 
      specialization: '', 
      phone: '', 
      assignments: [], 
      portalToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{teacher ? 'Editar Professor' : 'Novo Professor'}</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Preencha os dados do docente</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              placeholder="Ex: João Silva"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Especialização</label>
            <input 
              type="text" 
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              placeholder="Ex: Matemática, Física"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Telefone</label>
            <input 
              type="text" 
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              placeholder="Ex: 923 000 000"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Atribuições (Turmas e Disciplinas)</label>
              <button 
                type="button"
                onClick={() => {
                  const newAssignments = [...(formData.assignments || []), { classId: '', subject: '' }];
                  setFormData({ ...formData, assignments: newAssignments });
                }}
                className="text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
              >
                <Plus size={12} />
                Adicionar
              </button>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {formData.assignments?.map((assignment, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                  <div className="flex-1 space-y-2">
                    <select 
                      value={assignment.classId}
                      onChange={(e) => {
                        const newAssignments = [...(formData.assignments || [])];
                        newAssignments[idx].classId = e.target.value;
                        setFormData({ ...formData, assignments: newAssignments });
                      }}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="">Seleccionar Turma</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                    </select>
                    <input 
                      type="text" 
                      value={assignment.subject}
                      onChange={(e) => {
                        const newAssignments = [...(formData.assignments || [])];
                        newAssignments[idx].subject = e.target.value;
                        setFormData({ ...formData, assignments: newAssignments });
                      }}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                      placeholder="Disciplina (Ex: Matemática)"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const newAssignments = formData.assignments?.filter((_, i) => i !== idx);
                      setFormData({ ...formData, assignments: newAssignments });
                    }}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(!formData.assignments || formData.assignments.length === 0) && (
                <p className="text-[10px] text-center text-neutral-400 font-bold py-4">Nenhuma turma atribuída</p>
              )}
            </div>
          </div>

          <button 
            onClick={() => onSave({ ...formData, id: teacher?.id || Date.now().toString() } as Teacher)}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 mt-4"
          >
            {teacher ? 'Guardar Alterações' : 'Registar Professor'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BackupView({ 
  onImport, 
  onExport 
}: { 
  onImport: (data: string) => void, 
  onExport: () => void 
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onImport(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Card */}
        <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-neutral-200 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
            <Download size={32} />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">Exportar Dados</h3>
          <p className="text-neutral-500 font-bold text-sm mb-8 leading-relaxed">
            Crie uma cópia de segurança de todos os dados do sistema (alunos, notas, pagamentos, etc) num ficheiro JSON.
          </p>
          <button 
            onClick={onExport}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
          >
            <Download size={20} />
            Descarregar Backup
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-neutral-200 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
            <Upload size={32} />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">Importar Dados</h3>
          <p className="text-neutral-500 font-bold text-sm mb-8 leading-relaxed">
            Restaure o sistema a partir de um ficheiro de backup anteriormente exportado. <span className="text-rose-500 font-black">Atenção: Isto irá substituir todos os dados actuais!</span>
          </p>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-neutral-200"
          >
            <Upload size={20} />
            Carregar Ficheiro
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex gap-4 items-start">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-amber-900 font-black text-sm uppercase tracking-wider mb-1">Recomendações de Segurança</h4>
          <p className="text-amber-700 text-xs font-bold leading-relaxed">
            Recomendamos que realize cópias de segurança semanalmente e as guarde num local seguro (disco externo ou cloud). 
            O ficheiro de backup contém informações sensíveis de alunos e professores.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuditView({ 
  logs, 
  onClearLogs 
}: { 
  logs: AuditLog[], 
  onClearLogs: () => void 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [actionFilter, setActionFilter] = useState('Todos');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'Todos' || log.userRole === roleFilter;
    const matchesAction = actionFilter === 'Todos' || 
      (actionFilter === 'Login/Logout' && (log.action === 'Login' || log.action === 'Logout')) ||
      (actionFilter === 'Acesso' && log.action === 'Acesso ao Sistema') ||
      (actionFilter === 'Criação' && log.action.startsWith('Criar')) ||
      (actionFilter === 'Actualização' && log.action.startsWith('Actualizar')) ||
      (actionFilter === 'Eliminação' && log.action.startsWith('Eliminar'));

    return matchesSearch && matchesRole && matchesAction;
  });

  const uniqueUsers = Array.from(new Set(logs.map(l => l.userEmail))).length;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Auditoria de Acesso</h2>
          <p className="text-neutral-500 font-bold text-sm text-neutral-500">Monitorização de acessos e actividades em tempo real</p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="px-5 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-2 self-start sm:self-center"
          >
            <Trash2 size={14} />
            Limpar Histórico
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-600">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-0.5">Total de Registos</span>
            <span className="text-2xl font-black text-neutral-900 leading-none">{logs.length}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-0.5">Utilizadores Únicos</span>
            <span className="text-2xl font-black text-neutral-900 leading-none">{uniqueUsers}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mb-0.5">Última Actividade</span>
            <span className="text-xs font-black text-neutral-900 truncate max-w-[200px] block">
              {logs[0] ? `${logs[0].userName} (${logs[0].action})` : 'Sem registos'}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar por utilizador, acção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-neutral-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Grupo:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="Todos">Todos os Grupos</option>
              <option value="Super-Administrador">Super-Administrador</option>
              <option value="Administrador">Administrador</option>
              <option value="Secretário">Secretário</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Professor">Professor</option>
              <option value="Aluno">Aluno</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Acção:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="Todos">Todas as Acções</option>
              <option value="Login/Logout">Login / Logout</option>
              <option value="Acesso">Acesso ao Sistema</option>
              <option value="Criação">Criação (Criar...)</option>
              <option value="Actualização">Actualização (Actualizar...)</option>
              <option value="Eliminação">Eliminação (Eliminar...)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="p-4 sm:p-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-6">Data e Hora</th>
                <th className="p-4 sm:p-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Utilizador</th>
                <th className="p-4 sm:p-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Função</th>
                <th className="p-4 sm:p-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Acção</th>
                <th className="p-4 sm:p-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest pr-6">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-neutral-400 font-bold text-sm">
                    Nenhum registo de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let badgeColor = "bg-neutral-100 text-neutral-600";
                  if (log.action === "Login" || log.action === "Acesso ao Sistema") {
                    badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                  } else if (log.action === "Logout") {
                    badgeColor = "bg-neutral-100 text-neutral-600 border border-neutral-200";
                  } else if (log.action.startsWith("Criar")) {
                    badgeColor = "bg-blue-50 text-blue-600 border border-blue-100";
                  } else if (log.action.startsWith("Actualizar")) {
                    badgeColor = "bg-amber-50 text-amber-600 border border-amber-100";
                  } else if (log.action.startsWith("Eliminar")) {
                    badgeColor = "bg-rose-50 text-rose-600 border border-rose-100";
                  }

                  let roleBadgeColor = "bg-neutral-100 text-neutral-600";
                  if (log.userRole === "Super-Administrador") {
                    roleBadgeColor = "bg-purple-100 text-purple-700 font-black";
                  } else if (log.userRole === "Administrador") {
                    roleBadgeColor = "bg-blue-100 text-blue-700 font-black";
                  } else if (log.userRole === "Secretário") {
                    roleBadgeColor = "bg-teal-100 text-teal-700 font-black";
                  } else if (log.userRole === "Financeiro") {
                    roleBadgeColor = "bg-emerald-100 text-emerald-700 font-black";
                  } else if (log.userRole === "Professor") {
                    roleBadgeColor = "bg-amber-100 text-amber-700 font-black";
                  }

                  return (
                    <tr key={log.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 sm:p-5 text-xs font-mono text-neutral-500 font-bold pl-6">{log.timestamp}</td>
                      <td className="p-4 sm:p-5 text-xs font-black text-neutral-900">
                        <div>
                          <div className="leading-tight">{log.userName}</div>
                          <div className="text-[10px] font-normal text-neutral-400 mt-0.5">{log.userEmail}</div>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-xs">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px]", roleBadgeColor)}>
                          {log.userRole}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-xs">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", badgeColor)}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-xs font-bold text-neutral-500 max-w-xs truncate pr-6" title={log.details}>
                        {log.details || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersView({ users, onAddUser, onUpdateUser, onDeleteUser, showToast, currentUser, schools, classes, students }: { 
  users: SystemUser[], 
  onAddUser?: (u: SystemUser) => void, 
  onUpdateUser?: (u: SystemUser) => void, 
  onDeleteUser?: (id: string) => void,
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void,
  currentUser: any,
  schoolName?: string,
  schools: School[],
  classes: Class[],
  students: Student[]
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar utilizador..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
          />
        </div>
        {onAddUser && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200"
          >
            <UserPlus size={20} />
            Novo Utilizador
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <UserCog size={24} />
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                user.status === 'Activo' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {user.status}
              </span>
            </div>
            
            <div className="space-y-1 mb-6">
              <h4 className="text-lg font-black text-neutral-900 tracking-tight">{user.name}</h4>
              <p className="text-xs font-bold text-neutral-400 flex items-center gap-2">
                <Mail size={12} />
                {user.email}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400">
                  <Lock size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Cargo</p>
                  <p className="text-xs font-bold text-neutral-900">{user.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {(currentUser.role === 'Super-Administrador' || (currentUser.role === 'Administrador' && user.role !== 'Super-Administrador')) && (
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {(currentUser.role === 'Super-Administrador' || (currentUser.role === 'Administrador' && user.role !== 'Super-Administrador')) && (
                  <button 
                    onClick={() => onDeleteUser && onDeleteUser(user.id)}
                    className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(isAdding || editingUser) && (
        <UserModal 
          user={editingUser}
          currentUser={currentUser}
          schools={schools}
          classes={classes}
          students={students}
          onClose={() => { setIsAdding(false); setEditingUser(null); }}
          onSave={(u) => {
            if (editingUser) onUpdateUser && onUpdateUser(u);
            else onAddUser && onAddUser(u);
            setIsAdding(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSave, currentUser, schools, classes, students }: { 
  user: SystemUser | null, 
  onClose: () => void, 
  onSave: (u: SystemUser) => void,
  currentUser: any,
  schoolName?: string,
  schools: School[],
  classes: Class[],
  students: Student[]
}) {
  const [formData, setFormData] = useState<Partial<SystemUser>>(
    user || { name: '', email: '', role: 'Secretário', status: 'Activo', schoolId: currentUser?.schoolId }
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (user?.role === 'Aluno') {
      if (user.assignedClassIds && user.assignedClassIds.length > 0) {
        return user.assignedClassIds[0];
      }
      if (user.studentId) {
        const s = students.find(x => x.id === user.studentId);
        if (s) return s.classId;
      }
    }
    return '';
  });

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    setFormData(prev => ({
      ...prev,
      assignedClassIds: classId ? [classId] : [],
      studentId: '',
      name: ''
    }));
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    const student = students.find(s => s.id === sId);
    if (student) {
      setFormData(prev => ({
        ...prev,
        studentId: sId,
        name: student.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        studentId: '',
        name: ''
      }));
    }
  };

  useEffect(() => {
    if (formData.role === 'Professor' && !formData.assignedClassIds) {
      setFormData(prev => ({ ...prev, assignedClassIds: [] }));
    }
  }, [formData.role]);

  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
              {user ? 'Editar Utilizador' : 'Novo Utilizador'}
            </h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
              Configure as credenciais de acesso
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-neutral-400 hover:text-neutral-900 shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={formData.role === 'Aluno'}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all disabled:opacity-75 disabled:bg-neutral-100/50"
                placeholder={formData.role === 'Aluno' ? "Selecione a turma e o aluno abaixo..." : "Ex: João Manuel"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Email / Utilizador</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                placeholder="exemplo@escola.ao"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
              <input 
                type="password" 
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                placeholder="Nova palavra-passe"
              />
            </div>
          </div>

          {formData.role !== 'Aluno' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Turmas Atribuídas</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {classes
                  .filter(c => c.schoolId === formData.schoolId)
                  .map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.assignedClassIds?.includes(c.id) || false}
                        onChange={(e) => {
                          const newClassIds = e.target.checked 
                            ? [...(formData.assignedClassIds || []), c.id]
                            : (formData.assignedClassIds || []).filter(id => id !== c.id);
                          setFormData({ ...formData, assignedClassIds: newClassIds });
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-neutral-900">{c.name}</span>
                    </label>
                  ))
                }
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-3xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1">Turma do Aluno</label>
                <select 
                  value={selectedClassId}
                  onChange={handleClassChange}
                  className="w-full p-3.5 bg-white border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                >
                  <option value="">Selecione a Turma</option>
                  {classes
                    .filter(c => c.schoolId === formData.schoolId)
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1">Nome do Aluno Matriculado</label>
                <select 
                  value={formData.studentId || ''}
                  onChange={handleStudentChange}
                  disabled={!selectedClassId}
                  className="w-full p-3.5 bg-white border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all disabled:opacity-50"
                >
                  <option value="">Selecione o Aluno</option>
                  {students
                    .filter(s => s.classId === selectedClassId && s.schoolId === formData.schoolId)
                    .map(s => <option key={s.id} value={s.id}>{s.name} {s.bi ? `(BI: ${s.bi})` : ''}</option>)
                  }
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Cargo / Role</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none"
              >
                {(currentUser?.role === 'Super-Administrador' || currentUser?.role === 'Administrador') && (
                  <>
                    <option value="Administrador">Administrador</option>
                    <option value="Secretário">Secretário</option>
                    <option value="Financeiro">Financeiro</option>
                  </>
                )}
                <option value="Professor">Professor</option>
                <option value="Aluno">Aluno</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Estado</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          {currentUser?.role === 'Super-Administrador' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Escola</label>
              <select 
                value={formData.schoolId || ''}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                className="w-full p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none"
              >
                <option value="">Selecione uma escola</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 bg-neutral-50/50 border-t border-neutral-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-neutral-500 font-black text-sm hover:text-neutral-900 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave({ ...formData, id: formData.id || Math.random().toString(36).substr(2, 9) } as SystemUser)}
            className="flex-[2] py-4 bg-neutral-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-neutral-200 hover:bg-neutral-800 transition-all active:scale-95"
          >
            {user ? 'Actualizar Dados' : 'Criar Utilizador'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ClassesView({ 
  classes, 
  onAddClass, 
  onUpdateClass, 
  onDeleteClass,
  students,
  setActiveView,
  setSelectedListClassId,
  schoolSettings,
  setSchoolSettings,
  onExportPDF,
  currentUser
}: { 
  classes: Class[], 
  onAddClass?: (c: Class) => void,
  onUpdateClass?: (c: Class) => void,
  onDeleteClass?: (id: string) => void,
  students: Student[],
  setActiveView: (view: View) => void,
  setSelectedListClassId: (id: string) => void,
  schoolSettings: SchoolSettings,
  setSchoolSettings: (s: SchoolSettings) => void,
  onExportPDF?: (cls: Class, paperSize?: 'A4' | 'A3' | 'A5') => void,
  currentUser: any,
  schoolName?: string
} ) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('Todos');
  const [viewingClassList, setViewingClassList] = useState<Class | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('1ª Classe');
  const [subjectsText, setSubjectsText] = useState<string>('');

  useEffect(() => {
    if (editingClass) {
      setSelectedLevel(editingClass.level);
      setSubjectsText(editingClass.subjects ? editingClass.subjects.join('\n') : getSubjectsByLevel(editingClass.level, editingClass.course).join('\n'));
    } else {
      setSelectedLevel('1ª Classe');
      setSubjectsText(getSubjectsByLevel('1ª Classe').join('\n'));
    }
  }, [editingClass]);

  useEffect(() => {
    if (!editingClass && selectedLevel) {
      setSubjectsText(getSubjectsByLevel(selectedLevel, undefined).join('\n'));
    }
  }, [selectedLevel, editingClass]);

  const levels = ['Todos', ...(schoolSettings.customLevels || LEVELS.filter(l => l !== 'Todos'))];

  const filteredClasses = levelFilter === 'Todos' 
    ? classes 
    : classes.filter(c => c.level === levelFilter);

  const exportClassStudentListExcel = (cls: Class) => {
    const classStudents = students
      .filter(s => s.classId === cls.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const data = classStudents.map((student, index) => ({
      'Nº': index + 1,
      'Nome Completo': student.name,
      'BI': student.bi,
      'Gênero': student.gender === 'M' ? 'Masculino' : 'Feminino',
      'Status': student.enrollmentStatus,
      'Data de Matrícula': student.enrollmentDate
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Alunos');
    
    const fileName = `Lista_Alunos_${cls.name.replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportClassesToExcel = () => {
    const data = filteredClasses.map((cls, index) => {
      const classStudentsCount = students.filter(s => s.classId === cls.id).length;
      return {
        'Nº': index + 1,
        'Nome da Turma': cls.name,
        'Nível': cls.level,
        'Turno': cls.shift,
        'Sala': cls.room,
        'Capacidade': cls.capacity,
        'Alunos Inscritos': classStudentsCount,
        'Taxa de Ocupação': `${((classStudentsCount / cls.capacity) * 100).toFixed(1)}%`
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Turmas');
    
    const fileName = `Lista_Turmas_${levelFilter.replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const parsedSubjects = subjectsText.split('\n').map(s => s.trim()).filter(s => s);
    const classData: Class = {
      id: editingClass?.id || Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      level: formData.get('level') as string,
      course: formData.get('course') as any,
      shift: formData.get('shift') as 'Manhã' | 'Tarde' | 'Noite',
      room: formData.get('room') as string,
      capacity: Number(formData.get('capacity')),
      subjects: parsedSubjects.length > 0 ? parsedSubjects : undefined,
    };

    if (editingClass) {
      onUpdateClass(classData);
    } else {
      onAddClass(classData);
    }
    setIsAdding(false);
    setEditingClass(null);
  };

  return (
    <div className="space-y-8">
      <div className="hidden print:block bg-white p-12 rounded-[40px] border border-neutral-200 shadow-sm mb-8">
        <OfficialHeader 
          settings={schoolSettings} 
          setSettings={setSchoolSettings} 
          extraInfo={{ classe: 'Geral', periodo: 'Anual' }}
        />
        <div className="text-center mt-8 space-y-2">
          <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-tight">Listagem de Turmas</h2>
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Ano Lectivo: {schoolSettings.anoLectivo}</p>
        </div>
        <table className="w-full mt-12 border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-900">
              <th className="py-4 text-left text-xs font-black uppercase tracking-widest">Turma</th>
              <th className="py-4 text-left text-xs font-black uppercase tracking-widest">Nível</th>
              <th className="py-4 text-left text-xs font-black uppercase tracking-widest">Turno</th>
              <th className="py-4 text-left text-xs font-black uppercase tracking-widest">Sala</th>
              <th className="py-4 text-center text-xs font-black uppercase tracking-widest">Alunos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredClasses.map(cls => (
              <tr key={cls.id}>
                <td className="py-4 font-bold text-neutral-900">{cls.name}</td>
                <td className="py-4 text-sm text-neutral-600">{cls.level}</td>
                <td className="py-4 text-sm text-neutral-600">{cls.shift}</td>
                <td className="py-4 text-sm text-neutral-600">{cls.room}</td>
                <td className="py-4 text-center text-sm font-bold text-neutral-900">
                  {students.filter(s => s.classId === cls.id).length} / {cls.capacity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-neutral-100 rounded-[24px] w-fit border border-neutral-200/50">
          {levels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={cn(
                "px-4 sm:px-6 py-2.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all",
                levelFilter === lvl 
                  ? "bg-white text-emerald-600 shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <button 
            onClick={() => window.print()}
            className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black transition-all hover:bg-neutral-50 active:scale-95"
          >
            <Printer size={20} />
            Imprimir
          </button>
          <button 
            onClick={() => setActiveView('lists')}
            className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black transition-all hover:bg-neutral-50 active:scale-95"
          >
            <Check size={20} />
            Ver Listas
          </button>
          <button 
            onClick={exportClassesToExcel}
            className="bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-sm active:scale-95"
            title="Exportar Lista de Turmas (Excel)"
          >
            <FileDown size={20} />
            Exportar Turmas
          </button>
          {onAddClass && (
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-emerald-100 active:scale-95"
              style={{ display: currentUser?.role === 'Professor' ? 'none' : 'flex' }}
            >
              <Plus size={20} />
              Nova Turma
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredClasses.map((cls) => {
          const classStudentsCount = students.filter(s => s.classId === cls.id).length;
          const occupancyRate = (classStudentsCount / cls.capacity) * 100;
          
          return (
            <div key={cls.id} className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 group relative flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center font-black text-lg sm:text-xl shadow-sm border border-emerald-100">
                  {cls.level.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-neutral-400 bg-neutral-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">{cls.shift}</span>
                  <button 
                    onClick={() => {
                      setSelectedListClassId(cls.id);
                      setActiveView('lists');
                    }}
                    className="p-2 text-neutral-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all"
                    title="Ver Lista Nominal Completa"
                  >
                    <Check size={18} />
                  </button>
                  <div className="flex transition-all">
                    <button 
                      onClick={() => onExportPDF?.(cls)}
                      className="p-2 text-neutral-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all"
                      title="Exportar Lista de Alunos (PDF)"
                    >
                      <FileDown size={18} />
                    </button>
                    <button 
                      onClick={() => exportClassStudentListExcel(cls)}
                      className="p-2 text-neutral-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all"
                      title="Exportar Lista de Alunos (Excel)"
                    >
                      <FileSpreadsheet size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditingClass(cls);
                        setIsAdding(true);
                      }}
                      className="p-2 text-neutral-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                    {currentUser?.role !== 'Professor' && onDeleteClass && (
                      <button 
                        onClick={() => onDeleteClass(cls.id)}
                        className="p-2 text-neutral-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <h4 className="font-black text-xl text-neutral-900 tracking-tight leading-tight mb-1 group-hover:text-emerald-700 transition-colors">{cls.name}</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{cls.level}</p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neutral-400 uppercase tracking-widest">Ocupação</span>
                  <span className={cn(
                    occupancyRate > 90 ? "text-rose-600" : "text-neutral-900"
                  )}>{classStudentsCount} / {cls.capacity}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${occupancyRate}%` }}
                    className={cn(
                      "h-full rounded-full",
                      occupancyRate > 90 ? "bg-rose-500" : "bg-emerald-500"
                    )}
                  />
                </div>
              </div>

              <div className="mt-auto pt-6 flex items-center gap-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <MapPin size={14} className="text-neutral-300" />
                  <span className="text-xs font-bold">{cls.room}</span>
                </div>
                <button 
                  onClick={() => setViewingClassList(cls)}
                  className="ml-auto p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  title="Ver Lista de Alunos"
                >
                  <Users size={16} />
                  Lista
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(isAdding || editingClass) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20 max-h-[95vh] flex flex-col"
          >
            <div className="p-6 sm:p-10 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/50">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">{editingClass ? 'Editar Turma' : 'Nova Turma'}</h3>
                <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Configuração de sala e turno</p>
              </div>
              <button onClick={() => { setIsAdding(false); setEditingClass(null); }} className="text-neutral-400 hover:text-neutral-900 p-2 sm:p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
                <X size={24} />
              </button>
            </div>
            <form className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto flex-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome da Turma</label>
                  <input name="name" defaultValue={editingClass?.name} required placeholder="Ex: 10ª Classe - A" className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nível de Ensino</label>
                  <select 
                    name="level" 
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none"
                  >
                    {levels.filter(l => l !== 'Todos').map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {selectedLevel.match(/^(10ª|11ª|12ª) Classe/) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Curso / Área</label>
                    <select 
                      name="course" 
                      defaultValue={editingClass?.course || 'Geral'} 
                      className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none"
                    >
                      <option value="Geral">Ensino Geral</option>
                      <option value="Ciências Físicas e Biológicas">Ciências Físicas e Biológicas</option>
                      <option value="Ciências Jurídicas e Económicas">Ciências Jurídicas e Económicas</option>
                      <option value="Ciências Sociais">Ciências Sociais</option>
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Turno</label>
                  <select name="shift" defaultValue={editingClass?.shift} className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none">
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Sala</label>
                  <input name="room" defaultValue={editingClass?.room} required placeholder="Ex: Sala 12" className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Capacidade Máxima</label>
                  <input name="capacity" type="number" defaultValue={editingClass?.capacity || 40} required className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disciplinas</label>
                  <span className="text-[10px] font-bold text-neutral-400">Uma por linha</span>
                </div>
                <textarea 
                  value={subjectsText}
                  onChange={(e) => setSubjectsText(e.target.value)}
                  rows={6}
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all resize-none"
                  placeholder="Introduza as disciplinas desta turma, separadas por linha."
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 sm:pt-10 border-t border-neutral-100">
                <button type="button" onClick={() => { setIsAdding(false); setEditingClass(null); }} className="px-8 py-4 text-neutral-500 font-bold hover:text-neutral-900 transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700 order-1 sm:order-2">
                  {editingClass ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {viewingClassList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 max-h-[90vh] flex flex-col"
          >
            <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/50">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Lista de Alunos - {viewingClassList.name}</h3>
                <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Total: {students.filter(s => s.classId === viewingClassList.id).length} Alunos</p>
              </div>
              <button onClick={() => setViewingClassList(null)} className="text-neutral-400 hover:text-neutral-900 p-2 sm:p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-neutral-50/30">
              <div className="space-y-3">
                {students
                  .filter(s => s.classId === viewingClassList.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((student, index) => (
                    <div key={student.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-neutral-200 hover:border-emerald-200 transition-all group shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-xs font-black text-neutral-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-neutral-900">{student.name}</p>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{student.bi}</p>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        student.enrollmentStatus === 'Confirmado' ? "bg-emerald-100 text-emerald-700" :
                        student.enrollmentStatus === 'Matriculado' ? "bg-blue-100 text-blue-700" :
                        student.enrollmentStatus === 'Pendente' ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      )}>
                        {student.enrollmentStatus}
                      </div>
                    </div>
                  ))}
                {students.filter(s => s.classId === viewingClassList.id).length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-neutral-100 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                      <Users size={32} className="text-neutral-300" />
                    </div>
                    <p className="text-neutral-400 font-black uppercase tracking-widest text-xs">Nenhum aluno inscrito nesta turma</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AuthView({ onLogin }: { onLogin: (user: { email: string, name: string, role: string, schoolId?: string }) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Administrador');
  const [schoolName, setSchoolName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');
    if (!email) {
      setError('Por favor digite o seu e-mail.');
      return;
    }
    const users = JSON.parse(localStorage.getItem('edugest_users') || '[]');
    if (users.find((u: any) => u.email === email)) {
      setRecoveryMessage('Foi enviado um link de recuperação para o seu e-mail.');
    } else {
      setError('E-mail não está registado no sistema.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const users = JSON.parse(localStorage.getItem('edugest_users') || '[]');
      let user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) {
        try {
          const { data: dbUser, error: dbError } = await supabase
            .from('utilizadores')
            .select('*')
            .eq('email', email)
            .maybeSingle();

          if (!dbError && dbUser) {
            if (dbUser.password === password) {
              user = {
                id: dbUser.id,
                email: dbUser.email,
                password: dbUser.password,
                name: dbUser.name,
                role: dbUser.role,
                status: dbUser.status,
                schoolId: dbUser.school_id
              };
              users.push(user);
              localStorage.setItem('edugest_users', JSON.stringify(users));
            }
          }
        } catch (err) {
          console.error('Erro ao autenticar via Supabase:', err);
        }
      }

      if (user) {
        if (user.status === 'Inactivo') {
          setError('A sua conta está inactiva. Contacte o administrador.');
          return;
        }
        onLogin({ email: user.email, name: user.name, role: user.role || 'Administrador' });
      } else {
        setError('E-mail ou palavra-passe incorretos.');
      }
    } else {
      const users = JSON.parse(localStorage.getItem('edugest_users') || '[]');
      if (users.find((u: any) => u.email === email)) {
        setError('Este e-mail já está registado localmente.');
        return;
      }

      try {
        const { data: existingUser } = await supabase
          .from('utilizadores')
          .select('id')
          .eq('email', email)
          .maybeSingle();
          
        if (existingUser) {
          setError('Este e-mail já está registado na base de dados remota.');
          return;
        }
      } catch (err) {
        console.warn('Supabase check skipped:', err);
      }

      let schoolId = undefined;
      
      if (role === 'Administrador') {
        const newSchoolId = 's_' + Math.random().toString(36).substr(2, 9);
        const newSchool = {
          id: newSchoolId,
          name: schoolName,
          status: 'Activo',
          republica: 'República de Angola',
          governoProvincia: 'Governo da Província do Cuanza-Sul',
          administracaoMunicipal: 'Administração Municipal',
          direccaoMunicipal: 'Direcção Municipal da Educação',
          anoLectivo: '2023/2024'
        };
        const schools = JSON.parse(localStorage.getItem('edugest_schools') || '[]');
        schools.push(newSchool);
        localStorage.setItem('edugest_schools', JSON.stringify(schools));
        localStorage.setItem('edugest_selected_school_id', newSchoolId);
        schoolId = newSchoolId;

        try {
          await pushItemToSupabaseWithRetry({
            type: 'CRIAR_ESCOLA',
            data: {
              id: newSchoolId,
              name: schoolName,
              status: 'Activo',
              republica: 'República de Angola',
              governoProvincia: 'Governo da Província do Cuanza-Sul',
              administracaoMunicipal: 'Administração Municipal',
              direccaoMunicipal: 'Direcção Municipal da Educação',
              anoLectivo: '2023/2024'
            }
          });
        } catch (err) {
          console.error('Erro ao guardar escola no Supabase via proxy:', err);
        }
      }

      const newUser = { 
        id: Math.random().toString(36).substr(2, 9),
        email, 
        password, 
        name, 
        role,
        status: 'Activo',
        schoolId
      };
      users.push(newUser);
      localStorage.setItem('edugest_users', JSON.stringify(users));

      try {
        await pushItemToSupabaseWithRetry({
          type: 'CADASTRAR_UTILIZADOR',
          data: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            status: 'Activo',
            schoolId: newUser.schoolId || null
          }
        });
      } catch (err) {
        console.error('Erro ao guardar utilizador no Supabase via proxy:', err);
      }
      
      setIsLogin(true);
      setError('Cadastro realizado com sucesso! Por favor, faça o login.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[28px] text-slate-900 shadow-2xl shadow-slate-900/50 mb-6">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">B.A GestEscola</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Gestão Escolar Inteligente</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 sm:p-8 sm:p-10 rounded-[40px] border border-neutral-200 shadow-xl shadow-neutral-100"
        >
          {isRecoveryMode ? (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">Recuperar Conta</h2>
                    <p className="text-xs font-bold text-neutral-400">Insira o e-mail da sua conta para receber o link de recuperação</p>
                </div>
                <form onSubmit={handleRecovery} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">E-mail Institucional</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                            <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="exemplo@escola.com" 
                            className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" 
                            />
                        </div>
                    </div>
                    {error && (
                        <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-500 text-xs font-bold ml-1">
                            {error}
                        </motion.p>
                    )}
                    {recoveryMessage && (
                        <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-600 text-xs font-bold ml-1">
                            {recoveryMessage}
                        </motion.p>
                    )}
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => { setIsRecoveryMode(false); setError(''); setRecoveryMessage(''); }}
                            className="flex-1 bg-neutral-100 text-neutral-600 py-4 rounded-2xl font-black active:scale-95 transition-all hover:bg-neutral-200 flex items-center justify-center gap-2"
                        >
                            Voltar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
                        >
                            Enviar Link
                        </button>
                    </div>
                </form>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-10 p-1.5 bg-neutral-100 rounded-[24px]">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={cn(
                    "flex-1 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all",
                    isLogin ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Entrar
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={cn(
                    "flex-1 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all",
                    !isLogin ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Registar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <div className="relative">
                        <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input 
                          type="text" 
                          required 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome" 
                          className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Cargo</label>
                      <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                      >
                        <option value="Administrador">Administrador</option>
                        <option value="Super-Administrador">Super-Administrador</option>
                      </select>
                    </div>

                    {role === 'Administrador' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome da Escola</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                          <input 
                            type="text" 
                            required 
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            placeholder="Nome da instituição de ensino" 
                            className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" 
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">E-mail Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@escola.com" 
                      className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Palavra-passe</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full pl-12 pr-12 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {isLogin && (
                    <div className="flex justify-end mt-2">
                      <button 
                        type="button" 
                        onClick={() => { setIsRecoveryMode(true); setError(''); setRecoveryMessage(''); }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest"
                      >
                        Recuperar palavra-passe
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-red-500 text-xs font-bold ml-1"
                  >
                    {error}
                  </motion.p>
                )}

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {isLogin ? 'Entrar no Sistema' : 'Criar Conta'}
                </button>
              </form>

              <div className="mt-10 text-center">
                <p className="text-neutral-400 text-xs font-bold">
                  {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
                  <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="ml-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {isLogin ? 'Registe-se aqui' : 'Entre aqui'}
                  </button>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function MiniPautasView({ classes, students, grades, onUpdateGrades, getGrade, schoolSettings, setSchoolSettings, currentUser, showToast }: { 
  classes: Class[], 
  students: Student[],
  grades: Grade[],
  onUpdateGrades: (newGrades: Grade[]) => void,
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  schoolSettings: SchoolSettings,
  setSchoolSettings: (s: SchoolSettings) => void,
  currentUser: any,
  schoolName?: string,
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const availableClasses = currentUser.role === 'Professor' 
    ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
    : classes;

  const [selectedClassId, setSelectedClassId] = useState<string>(availableClasses[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1º Trimestre');
  const [viewMode, setViewMode] = useState<'entry' | 'summary'>('entry');
  const [isEditing, setIsEditing] = useState(false);
  const [localGrades, setLocalGrades] = useState<Grade[]>([]);

  const selectedClass = availableClasses.find(c => c.id === selectedClassId);
  const subjects = getSubjectsForClass(selectedClass);
  
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  const classStudents = students.filter(s => s.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name));

  const handleStartEditing = () => {
    const currentGrades = [...grades];
    classStudents.forEach(student => {
      (['AC1', 'AC2', 'AC3', 'MAC', 'NPT'] as const).forEach(type => {
        const exists = currentGrades.find(g => g.studentId === student.id && g.subjectId === selectedSubject && g.period === selectedPeriod && g.type === type);
        if (!exists) {
          currentGrades.push({
            studentId: student.id,
            subjectId: selectedSubject,
            period: selectedPeriod,
            type,
            value: getGrade(student.id, selectedSubject, selectedPeriod, type)
          });
        }
      });
    });
    setLocalGrades(currentGrades);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateGrades(localGrades);
    setIsEditing(false);
  };

  const updateLocalGrade = (studentId: string, type: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT', value: number) => {
    const scale = selectedClass ? getGradeScale(selectedClass.level).max : 20;
    const clampedValue = Math.min(scale, Math.max(0, value));
    setLocalGrades(prev => {
      let updated = prev.map(g => 
        (g.studentId === studentId && g.subjectId === selectedSubject && g.period === selectedPeriod && g.type === type) 
        ? { ...g, value: clampedValue } 
        : g
      );

      if (['AC1', 'AC2', 'AC3'].includes(type)) {
        const getVal = (t: 'AC1' | 'AC2' | 'AC3') => {
          if (t === type) return clampedValue;
          const found = updated.find(g => g.studentId === studentId && g.subjectId === selectedSubject && g.period === selectedPeriod && g.type === t);
          return found ? found.value : (getGrade(studentId, selectedSubject, selectedPeriod, t) || 0);
        };
        const ac1 = getVal('AC1');
        const ac2 = getVal('AC2');
        const ac3 = getVal('AC3');
        const newMac = Number(((ac1 + ac2 + ac3) / 3).toFixed(1));

        updated = updated.map(g => 
          (g.studentId === studentId && g.subjectId === selectedSubject && g.period === selectedPeriod && g.type === 'MAC')
          ? { ...g, value: newMac }
          : g
        );
      }

      return updated;
    });
  };

  const getMT = (studentId: string, subjectId: string, period: string) => {
    return calculateMT(studentId, subjectId, period, getGrade, selectedClass?.level);
  };

  const handleExportExcel = () => {
    const data = classStudents.map((student, index) => {
      const mt1 = getMT(student.id, selectedSubject, '1º Trimestre');
      const mt2 = getMT(student.id, selectedSubject, '2º Trimestre');
      const mt3 = getMT(student.id, selectedSubject, '3º Trimestre');
      const annual = calculateAnnual(student.id, selectedSubject, getGrade, selectedClass?.level);
      return {
        'Nº': index + 1,
        'Nome do Aluno': student.name,
        'MT1': mt1.toFixed(1),
        'MT2': mt2.toFixed(1),
        'MT3': mt3.toFixed(1),
        'Média Anual': annual.toFixed(1),
        'Resultado': annual >= getGradeScale(selectedClass?.level || '').threshold ? 'Aprovado' : 'Reprovado'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mini-Pauta");
    XLSX.writeFile(wb, `Mini_Pauta_${selectedClass?.name}_${selectedSubject}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Turma</p>
            <select 
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSubject(''); }}
              className="bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer"
            >
              {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-px h-8 bg-neutral-100 hidden lg:block" />
          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disciplina</p>
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-px h-8 bg-neutral-100 hidden lg:block" />
          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Modo de Visualização</p>
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl">
              <button 
                onClick={() => { setViewMode('entry'); setIsEditing(false); }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'entry' ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                Lançamento
              </button>
              <button 
                onClick={() => { setViewMode('summary'); setIsEditing(false); }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'summary' ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                Resumo Anual
              </button>
            </div>
          </div>
          {viewMode === 'entry' && (
            <>
              <div className="w-px h-8 bg-neutral-100 hidden lg:block" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Período</p>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer"
                >
                  <option value="1º Trimestre">1º Trimestre</option>
                  <option value="2º Trimestre">2º Trimestre</option>
                  <option value="3º Trimestre">3º Trimestre</option>
                  {isExamClass(selectedClass?.level) && <option value="Exame">Exame Nacional</option>}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'entry' && (
            !isEditing ? (
              <button 
                onClick={handleStartEditing}
                className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700 flex items-center gap-2"
              >
                <Pencil size={20} />
                Lançar Notas
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3.5 text-neutral-500 font-bold hover:text-neutral-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Check size={20} />
                  Guardar Notas
                </button>
              </>
            )
          )}
          {viewMode === 'summary' && (
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (selectedClass) {
                    generateUnifiedClassPautasPDF(selectedClass, classStudents, getGrade, schoolSettings, showToast);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md shadow-blue-200"
                title="Exportar PDF unificado contendo pautas de todas as disciplinas da turma"
              >
                <FileText size={20} />
                PDF Unificado da Turma
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-50 text-emerald-600 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all active:scale-95"
              >
                <FileDown size={20} />
                Excel
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200"
              >
                <Printer size={20} />
                Imprimir
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden p-8 sm:p-12">
        <OfficialHeader 
          settings={schoolSettings} 
          setSettings={setSchoolSettings} 
          extraInfo={{ classe: selectedClass?.level, periodo: selectedPeriod }}
        />
        <div className="border-b border-neutral-100 bg-neutral-50/30 rounded-3xl p-8 mb-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight uppercase">Mini Pauta de Aproveitamento</h2>
            <div className="flex items-center justify-center gap-4 text-sm font-bold text-neutral-500 uppercase tracking-widest">
              <span>Turma: {selectedClass?.name}</span>
              <span className="w-1 h-1 bg-neutral-300 rounded-full" />
              <span>Disciplina: {selectedSubject}</span>
              <span className="w-1 h-1 bg-neutral-300 rounded-full" />
              <span>Período: {selectedPeriod}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">Nº</th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">Nome do Aluno</th>
                {viewMode === 'entry' ? (
                  <>
                    {!(isExamClass(selectedClass?.level) && selectedPeriod === 'Exame') && (
                      <>
                        <th className="px-3 py-3 sm:px-4 sm:py-4 print:px-1 print:py-1 text-center font-bold text-neutral-500">AC1</th>
                        <th className="px-3 py-3 sm:px-4 sm:py-4 print:px-1 print:py-1 text-center font-bold text-neutral-500">AC2</th>
                        <th className="px-3 py-3 sm:px-4 sm:py-4 print:px-1 print:py-1 text-center font-bold text-neutral-500">AC3</th>
                        <th className="px-3 py-3 sm:px-4 sm:py-4 print:px-1 print:py-1 text-center font-black text-emerald-700 bg-emerald-50/50">MAC</th>
                      </>
                    )}
                    {!(isExamClass(selectedClass?.level) && selectedPeriod === '3º Trimestre') && (
                      <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-center">{selectedPeriod === 'Exame' ? 'Exame Nacional' : 'NPT'}</th>
                    )}
                    {selectedPeriod !== 'Exame' && (
                      <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-center font-black text-blue-700 bg-blue-50/50">MT</th>
                    )}
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">MT1</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">MT2</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">MT3</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">Média Anual</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {classStudents.map((student, index) => {
                if (viewMode === 'entry') {
                  const getLocalOrGrade = (s: string, sub: string, p: string, t: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT') => isEditing 
                    ? localGrades.find(g => g.studentId === s && g.subjectId === sub && g.period === p && g.type === t)?.value ?? getGrade(s, sub, p, t)
                    : getGrade(s, sub, p, t);
                  
                  const ac1 = getLocalOrGrade(student.id, selectedSubject, selectedPeriod, 'AC1');
                  const ac2 = getLocalOrGrade(student.id, selectedSubject, selectedPeriod, 'AC2');
                  const ac3 = getLocalOrGrade(student.id, selectedSubject, selectedPeriod, 'AC3');
                  const mac = getLocalOrGrade(student.id, selectedSubject, selectedPeriod, 'MAC');
                  const npt = getLocalOrGrade(student.id, selectedSubject, selectedPeriod, 'NPT');

                  const mt = calculateMT(student.id, selectedSubject, selectedPeriod, getLocalOrGrade, selectedClass?.level);
                  const exam = isExamClass(selectedClass?.level);
                  const { max: maxScale, threshold } = getGradeScale(selectedClass?.level || '');

                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">{index + 1}</td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                        <p className="text-sm font-black text-neutral-900">{student.name}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{student.bi}</p>
                      </td>
                      {!(exam && selectedPeriod === 'Exame') && (
                        <>
                          <td className="px-2 py-3 text-center">
                            {isEditing ? (
                              <input 
                                type="number" 
                                min="0" max={maxScale} step="0.1"
                                value={ac1}
                                onChange={(e) => updateLocalGrade(student.id, 'AC1', Number(e.target.value))}
                                className={cn("w-14 p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500", ac1 >= threshold ? "text-neutral-900" : "text-rose-600")}
                                title="Avaliação Contínua 1"
                              />
                            ) : (
                              <span className={cn("text-sm font-bold", ac1 >= threshold ? "text-neutral-900" : "text-rose-600")}>{ac1}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {isEditing ? (
                              <input 
                                type="number" 
                                min="0" max={maxScale} step="0.1"
                                value={ac2}
                                onChange={(e) => updateLocalGrade(student.id, 'AC2', Number(e.target.value))}
                                className={cn("w-14 p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500", ac2 >= threshold ? "text-neutral-900" : "text-rose-600")}
                                title="Avaliação Contínua 2"
                              />
                            ) : (
                              <span className={cn("text-sm font-bold", ac2 >= threshold ? "text-neutral-900" : "text-rose-600")}>{ac2}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {isEditing ? (
                              <input 
                                type="number" 
                                min="0" max={maxScale} step="0.1"
                                value={ac3}
                                onChange={(e) => updateLocalGrade(student.id, 'AC3', Number(e.target.value))}
                                className={cn("w-14 p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500", ac3 >= threshold ? "text-neutral-900" : "text-rose-600")}
                                title="Avaliação Contínua 3"
                              />
                            ) : (
                              <span className={cn("text-sm font-bold", ac3 >= threshold ? "text-neutral-900" : "text-rose-600")}>{ac3}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center bg-emerald-50/20">
                            {isEditing ? (
                              <input 
                                type="number" 
                                min="0" max={maxScale} step="0.1"
                                value={mac}
                                onChange={(e) => updateLocalGrade(student.id, 'MAC', Number(e.target.value))}
                                className={cn("w-16 p-2 bg-emerald-100/50 border border-emerald-300 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500", mac >= threshold ? "text-emerald-950" : "text-rose-600")}
                                title="Média de Avaliação Contínua (MAC = (AC1+AC2+AC3)/3)"
                              />
                            ) : (
                              <span className={cn("text-sm font-black", mac >= threshold ? "text-emerald-950 font-black" : "text-rose-600 font-black")}>{mac}</span>
                            )}
                          </td>
                        </>
                      )}
                      {!(exam && selectedPeriod === '3º Trimestre') && (
                        <td className="px-2 py-3 text-center">
                          {isEditing ? (
                            <input 
                              type="number" 
                              min="0" max={maxScale} step="0.1"
                              value={npt}
                              onChange={(e) => updateLocalGrade(student.id, 'NPT', Number(e.target.value))}
                              className={cn("w-16 p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500", npt >= threshold ? "text-neutral-900" : "text-rose-600")}
                            />
                          ) : (
                            <span className={cn("text-sm font-black", npt >= threshold ? "text-neutral-900" : "text-rose-600")}>{npt}</span>
                          )}
                        </td>
                      )}
                      {selectedPeriod !== 'Exame' && (
                        <td className="px-2 py-3 text-center bg-blue-50/20">
                          <span className={cn(
                            "text-sm font-black",
                            mt >= threshold ? "text-blue-950 font-black" : "text-rose-600 font-black"
                          )}>{mt.toFixed(1)}</span>
                        </td>
                      )}
                    </tr>
                  );
                } else {
                  const mt1 = getMT(student.id, selectedSubject, '1º Trimestre');
                  const mt2 = getMT(student.id, selectedSubject, '2º Trimestre');
                  const mt3 = getMT(student.id, selectedSubject, '3º Trimestre');
                  const annual = calculateAnnual(student.id, selectedSubject, getGrade, selectedClass?.level);

                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">{index + 1}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-neutral-900">{student.name}</p>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                        <span className={cn(mt1 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600")}>{mt1.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                        <span className={cn(mt2 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600")}>{mt2.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                        <span className={cn(mt3 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600")}>{mt3.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 ">
                        <span className={cn(
                          "text-sm font-black",
                          annual >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"
                        )}>{annual.toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* Espaço de Assinaturas e Data */}
        <div className="mt-10 pt-8 border-t border-neutral-100 print:mt-6 print:pt-4 space-y-6 px-4 sm:px-6 lg:px-8 text-xs print:text-[9px]">
          <div className="flex justify-end text-neutral-800 font-bold uppercase tracking-wide">
            <span>Em _________________________, aos _____ de _________________ de 20____</span>
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center mt-6 print:grid-cols-3">
            <div className="flex flex-col items-center">
              <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Professor</span>
              <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
              <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Subdirector Pedagógico</span>
              <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
              <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Director da Escola</span>
              <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
              <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PautaFinalView({ classes, students, grades, getGrade, schoolSettings, setSchoolSettings, onIssueCertificate, showToast, currentUser }: { 
  classes: Class[], 
  students: Student[],
  grades: Grade[],
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  schoolSettings: SchoolSettings,
  setSchoolSettings: (s: SchoolSettings) => void,
  onIssueCertificate: (studentId: string, bulkIds?: string[]) => void,
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  currentUser: any,
  schoolName?: string
}) {
  const availableClasses = currentUser.role === 'Professor' 
    ? classes.filter(c => currentUser.assignedClassIds?.includes(c.id))
    : classes;
    
  const [selectedClassId, setSelectedClassId] = useState<string>(availableClasses[0]?.id || '');
  const selectedClass = availableClasses.find(c => c.id === selectedClassId);
  const subjects = getSubjectsForClass(selectedClass);
  const classStudents = students.filter(s => s.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name));

  const getSubjectMT = (studentId: string, subjectId: string, period: string) => {
    return calculateMT(studentId, subjectId, period, getGrade, selectedClass?.level);
  };

  const getSubjectMFD = (studentId: string, subjectId: string) => {
    return calculateAnnual(studentId, subjectId, getGrade, selectedClass?.level);
  };

  const getTrimesterAvg = (studentId: string, period: string) => {
    if (subjects.length === 0) return 0;
    const sum = subjects.reduce((acc, subject) => acc + getSubjectMT(studentId, subject, period), 0);
    return sum / subjects.length;
  };

  const handleExportExcel = () => {
    if (!selectedClass) return;
    
    const data = classStudents.map((student, index) => {
      const row: any = {
        'Nº': index + 1,
        'Nome do Aluno': student.name
      };
      
      subjects.forEach(subject => {
        const m1 = getSubjectMT(student.id, subject, '1º Trimestre');
        const m2 = getSubjectMT(student.id, subject, '2º Trimestre');
        const m3 = getSubjectMT(student.id, subject, '3º Trimestre');
        const mfd = calculateAnnual(student.id, subject, getGrade, selectedClass?.level);
        
        row[`${subject} - MT1`] = m1.toFixed(1);
        row[`${subject} - MT2`] = m2.toFixed(1);
        row[`${subject} - MT3`] = m3.toFixed(1);
        row[`${subject} - MFD`] = mfd.toFixed(1);
      });
      
      const mt1 = getTrimesterAvg(student.id, '1º Trimestre');
      const mt2 = getTrimesterAvg(student.id, '2º Trimestre');
      const mt3 = getTrimesterAvg(student.id, '3º Trimestre');
      const mfdTotal = (mt1 + mt2 + mt3) / 3;
      
      row['Média Total MT1'] = mt1.toFixed(1);
      row['Média Total MT2'] = mt2.toFixed(1);
      row['Média Total MT3'] = mt3.toFixed(1);
      row['Média Final (MFD)'] = mfdTotal.toFixed(1);
      row['Estado'] = getEstado(student, mfdTotal);
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pauta Final');
    XLSX.writeFile(workbook, `Pauta_Final_${selectedClass.name.replace(/ /g, '_')}.xlsx`);
  };

  const getEstado = (student: Student, mfd: number) => {
    if (student.enrollmentStatus === 'Desistente') return 'Desistente';
    const { threshold } = getGradeScale(selectedClass?.level || '');
    return mfd >= threshold ? 'Apto' : 'N/Apto';
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Selecionar Turma</p>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-transparent font-black text-neutral-900 outline-none appearance-none cursor-pointer"
          >
            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.level}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const aptos = classStudents.filter(s => {
                const mt1 = getTrimesterAvg(s.id, '1º Trimestre');
                const mt2 = getTrimesterAvg(s.id, '2º Trimestre');
                const mt3 = getTrimesterAvg(s.id, '3º Trimestre');
                const mfd = (mt1 + mt2 + mt3) / 3;
                return getEstado(s, mfd) === 'Apto';
              });
              if (aptos.length > 0) {
                onIssueCertificate(aptos[0].id, aptos.map(s => s.id));
              } else {
                showToast('Nenhum aluno apto para emissão de certificado.', 'info');
              }
            }}
            className="bg-amber-50 text-amber-600 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-amber-100 transition-all active:scale-95"
          >
            <Award size={20} />
            Emitir Certificados (Aptos)
          </button>
          <button 
            onClick={() => {
              if (selectedClass) {
                generateUnifiedClassPautasPDF(selectedClass, classStudents, getGrade, schoolSettings, showToast);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md shadow-blue-200"
            title="Exportar PDF unificado contendo pautas de todas as disciplinas da turma para arquivo impresso"
          >
            <FileText size={20} />
            PDF Unificado (Arquivo Impresso)
          </button>
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-50 text-emerald-600 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all active:scale-95"
          >
            <FileSpreadsheet size={20} />
            Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200"
          >
            <Printer size={20} />
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden p-8 sm:p-12">
        <OfficialHeader 
          settings={schoolSettings} 
          setSettings={setSchoolSettings} 
          extraInfo={{ classe: selectedClass?.level, periodo: 'Anual' }}
        />
        <div className="border-b border-neutral-100 bg-neutral-50/30 rounded-3xl p-8 mb-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight uppercase">Pauta Final de Aproveitamento</h2>
            <div className="flex items-center justify-center gap-4 text-sm font-bold text-neutral-500 uppercase tracking-widest">
              <span>Turma: {selectedClass?.name}</span>
              <span className="w-1 h-1 bg-neutral-300 rounded-full" />
              <span>Nível: {selectedClass?.level}</span>
              <span className="w-1 h-1 bg-neutral-300 rounded-full" />
              <span>Ano Lectivo: {schoolSettings.anoLectivo}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th rowSpan={2} className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest sticky left-0 bg-neutral-50/50 z-20 border-r border-neutral-100">Aluno</th>
                {subjects.map(s => (
                  <th key={s} colSpan={4} className="px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-b border-r border-neutral-100">{s}</th>
                ))}
                <th colSpan={5} className="px-6 py-3 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center bg-emerald-50/50 border-b border-neutral-100">Resumo Final</th>
                <th rowSpan={2} className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center border-b border-neutral-100">Acção</th>
              </tr>
              <tr className="bg-neutral-50/30 border-b border-neutral-100">
                {subjects.map(s => (
                  <React.Fragment key={`${s}-sub`}>
                    <th className="px-2 py-3 text-[9px] font-black text-neutral-400 text-center border-r border-neutral-100">MT1</th>
                    <th className="px-2 py-3 text-[9px] font-black text-neutral-400 text-center border-r border-neutral-100">MT2</th>
                    <th className="px-2 py-3 text-[9px] font-black text-neutral-400 text-center border-r border-neutral-100">MT3</th>
                    <th className="px-2 py-3 text-[9px] font-black text-neutral-900 text-center border-r border-neutral-100 bg-neutral-100/30">MFD</th>
                  </React.Fragment>
                ))}
                <th className="px-4 py-3 text-[9px] font-black text-neutral-400 text-center border-r border-neutral-100">MT1</th>
                <th className="px-4 py-3 text-[9px] font-black text-neutral-400 text-center border-r border-neutral-100">MT2</th>
                <th className="px-4 py-3 text-[9px] font-black text-neutral-400 text-center border-r border-neutral-100">MT3</th>
                <th className="px-4 py-3 text-[9px] font-black text-emerald-700 text-center border-r border-neutral-100 bg-emerald-100/20">MFD</th>
                <th className="px-6 py-3 text-[9px] font-black text-neutral-900 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {classStudents.map(student => {
                const mt1_global = getTrimesterAvg(student.id, '1º Trimestre');
                const mt2_global = getTrimesterAvg(student.id, '2º Trimestre');
                const mt3_global = getTrimesterAvg(student.id, '3º Trimestre');
                const mfd_global = (mt1_global + mt2_global + mt3_global) / 3;
                const estado = getEstado(student, mfd_global);

                return (
                  <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-neutral-50/50 z-10 border-r border-neutral-100">
                      <p className="text-xs font-black text-neutral-900 truncate max-w-[180px]">{student.name}</p>
                    </td>
                    {subjects.map(subject => {
                      const s1 = getSubjectMT(student.id, subject, '1º Trimestre');
                      const s2 = getSubjectMT(student.id, subject, '2º Trimestre');
                      const s3 = getSubjectMT(student.id, subject, '3º Trimestre');
                      const smfd = calculateAnnual(student.id, subject, getGrade, selectedClass?.level);
                      return (
                        <React.Fragment key={`${student.id}-${subject}`}>
                          <td className="px-2 py-4 text-center text-[10px] font-bold border-r border-neutral-50">
                            <span className={s1 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{s1.toFixed(1)}</span>
                          </td>
                          <td className="px-2 py-4 text-center text-[10px] font-bold border-r border-neutral-50">
                            <span className={s2 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{s2.toFixed(1)}</span>
                          </td>
                          <td className="px-2 py-4 text-center text-[10px] font-bold border-r border-neutral-50">
                            <span className={s3 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{s3.toFixed(1)}</span>
                          </td>
                          <td className="px-2 py-4 text-center text-[10px] font-black bg-neutral-50/30 border-r border-neutral-50">
                            <span className={smfd >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{smfd.toFixed(1)}</span>
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="px-4 py-4 text-center text-[10px] font-bold border-r border-neutral-50">
                      <span className={mt1_global >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{mt1_global.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-[10px] font-bold border-r border-neutral-50">
                      <span className={mt2_global >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{mt2_global.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-[10px] font-bold border-r border-neutral-50">
                      <span className={mt3_global >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{mt3_global.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-4 text-center bg-emerald-50/20 border-r border-neutral-50">
                      <span className={cn(
                        "text-xs font-black",
                        mfd_global >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"
                      )}>{mfd_global.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md inline-block min-w-[60px]",
                        estado === 'Apto' ? "bg-emerald-100 text-emerald-700" : 
                        estado === 'N/Apto' ? "bg-rose-100 text-rose-700" : 
                        "bg-neutral-100 text-neutral-600"
                      )}>
                        {estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {estado === 'Apto' && (
                          <button 
                            onClick={() => onIssueCertificate(student.id)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                            title="Emitir Certificado"
                          >
                            <Award size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Espaço de Assinaturas e Data */}
        <div className="mt-10 pt-8 border-t border-neutral-100 print:mt-6 print:pt-4 space-y-6 px-4 sm:px-6 lg:px-8 text-xs print:text-[9px]">
          <div className="flex justify-end text-neutral-800 font-bold uppercase tracking-wide">
            <span>Em _________________________, aos _____ de _________________ de 20____</span>
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center mt-6 print:grid-cols-3">
            <div className="flex flex-col items-center">
              <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Professor</span>
              <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
              <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Subdirector Pedagógico</span>
              <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
              <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Director da Escola</span>
              <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
              <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoletimView({ students, classes, grades, getGrade, schoolSettings, setSchoolSettings, currentUser }: { 
  students: Student[],
  classes: Class[],
  grades: Grade[],
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  schoolSettings: SchoolSettings,
  setSchoolSettings: (s: SchoolSettings) => void,
  currentUser?: SystemUser | null
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (currentUser?.role === 'Aluno' && students.length > 0) {
      const s = students.find(x => x.id === currentUser.studentId || x.name === currentUser.name);
      return s ? s.id : students[0].id;
    }
    return currentUser?.role === 'Aluno' && students.length > 0 ? students[0].id : '';
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.bi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedClass = classes.find(c => c.id === selectedStudent?.classId);
  const subjects = getSubjectsForClass(selectedClass);

  const handleExportExcel = () => {
    if (!selectedStudent || !selectedClass) return;
    
    const data = subjects.map(subject => {
      const m1 = calculateMT(selectedStudent.id, subject, '1º Trimestre', getGrade, selectedClass?.level);
      const m2 = calculateMT(selectedStudent.id, subject, '2º Trimestre', getGrade, selectedClass?.level);
      const m3 = calculateMT(selectedStudent.id, subject, '3º Trimestre', getGrade, selectedClass?.level);
      const mfd = calculateAnnual(selectedStudent.id, subject, getGrade, selectedClass?.level);
      
      return {
        'Disciplina': subject,
        'MT1': m1.toFixed(1),
        'MT2': m2.toFixed(1),
        'MT3': m3.toFixed(1),
        'MFD': mfd.toFixed(1),
        'Observação': mfd >= getGradeScale(selectedClass?.level || '').threshold ? 'Apto' : 'N/Apto'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Boletim');
    XLSX.writeFile(workbook, `Boletim_${selectedStudent.name.replace(/ /g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-8">
      {!selectedStudentId ? (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm max-w-2xl mx-auto">
          {currentUser?.role === 'Aluno' && students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500 font-medium">Ainda não está associado a nenhum registo de aluno. Por favor, contacte a secretaria.</p>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-black text-neutral-900 mb-6">Pesquisar Aluno</h3>
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Nome ou BI do aluno..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredStudents.map(student => (
                  <button 
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-emerald-50 border border-neutral-100 rounded-2xl transition-all group"
                  >
                    <div className="text-left">
                      <p className="text-sm font-black text-neutral-900 group-hover:text-emerald-700">{student.name}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{student.bi}</p>
                    </div>
                    <ChevronRight size={18} className="text-neutral-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            {currentUser?.role !== 'Aluno' ? (
              <button 
                onClick={() => setSelectedStudentId('')}
                className="flex items-center gap-2 text-neutral-500 font-bold hover:text-neutral-900 transition-colors"
              >
                <ChevronRight className="rotate-180" size={20} />
                Voltar à Pesquisa
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-50 text-emerald-600 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all active:scale-95"
              >
                <FileSpreadsheet size={20} />
                Excel
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200"
              >
                <Printer size={20} />
                Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 lg:p-12 rounded-[40px] border border-neutral-200 shadow-sm print:p-0 print:m-0 print:shadow-none print:border-none print:w-[210mm] print:h-[297mm] print:mx-auto">
            <OfficialHeader 
              settings={schoolSettings} 
              setSettings={setSchoolSettings} 
              extraInfo={{ classe: selectedClass?.level, periodo: 'Anual' }}
            />
            <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-8 mb-8 print:mb-4 print:gap-4">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 print:w-20 print:h-20 rounded-3xl bg-neutral-100 border-4 border-white shadow-sm overflow-hidden ring-1 ring-neutral-200">
                  <img src={`https://picsum.photos/seed/${selectedStudent?.id}/200/200`} alt={selectedStudent?.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-3xl print:text-xl font-black text-neutral-900 tracking-tight">{selectedStudent?.name}</h3>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{selectedClass?.name} • {selectedClass?.level}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg w-fit">BI: {selectedStudent?.bi}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg w-fit">{selectedStudent?.enrollmentStatus}</p>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col justify-center">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ano Lectivo</p>
                <p className="text-2xl font-black text-neutral-900">{schoolSettings.anoLectivo}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 print:mb-4 bg-neutral-50/50 p-6 sm:p-8 print:p-4 rounded-3xl border border-neutral-100">
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Data de Nascimento</p>
                <p className="text-sm font-bold text-neutral-900">{selectedStudent?.birthDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Gênero</p>
                <p className="text-sm font-bold text-neutral-900">{selectedStudent?.gender === 'M' ? 'Masculino' : 'Feminino'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Data de Matrícula</p>
                <p className="text-sm font-bold text-neutral-900">{selectedStudent?.enrollmentDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Encarregado de Educação</p>
                <p className="text-sm font-bold text-neutral-900">{selectedStudent?.guardianName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Contacto do Encarregado</p>
                <p className="text-sm font-bold text-neutral-900">{selectedStudent?.guardianPhone}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Turma / Período</p>
                <p className="text-sm font-bold text-neutral-900">{selectedClass?.name} / {selectedClass?.shift}</p>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-neutral-100 mb-8 print:mb-4">
              <table className="w-full text-left border-collapse min-w-[600px] print:min-w-0">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest print:text-[8px] print:tracking-normal">Disciplina</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center print:text-[8px] print:tracking-normal">1º Trim</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center print:text-[8px] print:tracking-normal">2º Trim</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center print:text-[8px] print:tracking-normal">3º Trim</th>
                    <th className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center bg-neutral-50/80 print:text-[8px] print:tracking-normal">Média Anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {subjects.map(subject => {
                    const m1 = calculateMT(selectedStudentId, subject, '1º Trimestre', getGrade, selectedClass?.level);
                    const m2 = calculateMT(selectedStudentId, subject, '2º Trimestre', getGrade, selectedClass?.level);
                    const m3 = calculateMT(selectedStudentId, subject, '3º Trimestre', getGrade, selectedClass?.level);
                    const annual = calculateAnnual(selectedStudentId, subject, getGrade, selectedClass?.level);

                    return (
                      <tr key={subject} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-sm print:text-[10px] font-black text-neutral-900">{subject}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-center text-sm print:text-[10px] font-bold">
                          <span className={m1 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{m1.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-center text-sm print:text-[10px] font-bold">
                          <span className={m2 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{m2.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-center text-sm print:text-[10px] font-bold">
                          <span className={m3 >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"}>{m3.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 print:px-2 print:py-2 text-center bg-neutral-50/30 print:bg-transparent">
                          <span className={cn(
                            "text-sm print:text-[10px] font-black",
                            annual >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"
                          )}>{annual.toFixed(1)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(() => {
              const mfd_global = subjects.reduce((acc, sub) => {
                return acc + calculateAnnual(selectedStudentId, sub, getGrade, selectedClass?.level);
              }, 0) / (subjects.length || 1);

              return (
                <div className="grid grid-cols-3 gap-4 sm:gap-6 print:gap-4">
                  <div className="p-4 sm:p-6 print:p-4 rounded-3xl bg-neutral-50 border border-neutral-100">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 print:mb-0 print:text-[8px]">Resultado Final</p>
                    <p className={cn(
                      "text-xl sm:text-2xl font-black print:text-lg",
                      mfd_global >= getGradeScale(selectedClass?.level || '').threshold ? "text-neutral-900" : "text-rose-600"
                    )}>
                      {mfd_global >= getGradeScale(selectedClass?.level || '').threshold ? 'Aprovado' : 'Reprovado'}
                    </p>
                  </div>
                  <div className="p-4 sm:p-6 print:p-4 rounded-3xl bg-neutral-50 border border-neutral-100">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 print:mb-0 print:text-[8px]">Assiduidade</p>
                    <p className="text-xl sm:text-2xl font-black text-neutral-900 print:text-lg">95%</p>
                  </div>
                  <div className="p-4 sm:p-6 print:p-4 rounded-3xl bg-neutral-50 border border-neutral-100">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 print:mb-0 print:text-[8px]">Comportamento</p>
                    <p className="text-xl sm:text-2xl font-black text-neutral-900 print:text-lg">Bom</p>
                  </div>
                </div>
              );
            })()}

            {/* Espaço de Assinaturas e Data */}
            <div className="mt-10 pt-8 border-t border-neutral-100 print:mt-6 print:pt-4 space-y-6 px-4 sm:px-6 lg:px-8 text-xs print:text-[9px]">
              <div className="flex justify-end text-neutral-800 font-bold uppercase tracking-wide">
                <span>Em _________________________, aos _____ de _________________ de 20____</span>
              </div>
              
              <div className="grid grid-cols-3 gap-6 text-center mt-6 print:grid-cols-3">
                <div className="flex flex-col items-center">
                  <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Professor</span>
                  <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
                  <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Subdirector Pedagógico</span>
                  <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
                  <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-black text-neutral-900 uppercase tracking-wider text-sm print:text-[10px]">O Director da Escola</span>
                  <div className="w-full max-w-[200px] border-b border-dashed border-neutral-300 mt-12 print:mt-8"></div>
                  <span className="text-neutral-400 mt-2 font-medium">(Assinatura legível)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatesView({ students, classes, templates, onUpdateTemplates, schoolSettings, initialStudentId, initialTab, initialBulkIds, getGrade }: {
  students: Student[],
  classes: Class[],
  templates: CertificateTemplate[],
  onUpdateTemplates?: (t: CertificateTemplate[]) => void,
  schoolSettings: SchoolSettings,
  initialStudentId?: string,
  initialTab?: 'list' | 'editor' | 'issue',
  initialBulkIds?: string[],
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number
}) {
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'issue'>(initialTab || 'list');
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(templates[0] || null);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string>(initialStudentId || '');
  const [bulkIds, setBulkIds] = useState<string[]>(initialBulkIds || []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialStudentId) setPreselectedStudentId(initialStudentId);
    if (initialBulkIds) setBulkIds(initialBulkIds);
  }, [initialTab, initialStudentId, initialBulkIds]);

  const handleDeleteTemplate = (id: string) => {
    onUpdateTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-8">
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Modelos de Certificados</h3>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Gira os seus modelos de diplomas e certificados</p>
            </div>
            <button 
              onClick={() => {
                setSelectedTemplate(null);
                setActiveTab('editor');
              }}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Plus size={20} />
              Novo Modelo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template.id} className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-md transition-all group">
                <div className="aspect-[1.414/1] bg-neutral-100 rounded-2xl mb-4 overflow-hidden border border-neutral-100 relative">
                  <img src={template.backgroundImage} alt={template.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedTemplate(template);
                        setActiveTab('issue');
                      }}
                      className="p-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all"
                      title="Emitir Certificado"
                    >
                      <Award size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedTemplate(template);
                        setActiveTab('editor');
                      }}
                      className="p-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                      title="Editar Modelo"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-3 bg-white text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <h4 className="font-black text-neutral-900">{template.name}</h4>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{template.fields.length} campos configurados</p>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-neutral-200">
                <Award size={48} className="text-neutral-200 mx-auto mb-4" />
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Nenhum modelo de certificado encontrado</p>
                <button 
                  onClick={() => setActiveTab('editor')}
                  className="mt-4 text-emerald-600 font-black hover:underline"
                >
                  Criar o primeiro modelo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'editor' && (
        <TemplateEditor 
          template={selectedTemplate} 
          onSave={(t) => {
            if (selectedTemplate) {
              onUpdateTemplates(templates.map(item => item.id === t.id ? t : item));
            } else {
              onUpdateTemplates([...templates, t]);
            }
            setActiveTab('list');
          }}
          onCancel={() => setActiveTab('list')}
        />
      )}

      {activeTab === 'issue' && selectedTemplate && (
        <CertificateIssuer 
          template={selectedTemplate}
          students={students}
          classes={classes}
          schoolSettings={schoolSettings}
          onBack={() => setActiveTab('list')}
          initialStudentId={preselectedStudentId}
          initialBulkIds={bulkIds}
          getGrade={getGrade}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel }: {
  template: CertificateTemplate | null,
  onSave: (t: CertificateTemplate) => void,
  onCancel: () => void
}) {
  const [name, setName] = useState(template?.name || '');
  const [backgroundImage, setBackgroundImage] = useState(template?.backgroundImage || '');
  const [fields, setFields] = useState(template?.fields || []);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addField = (type: CertificateTemplate['fields'][0]['type']) => {
    const newField: CertificateTemplate['fields'][0] = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: type === 'custom' ? 'Novo Texto' : 
             type === 'studentName' ? 'Nome do Aluno' :
             type === 'className' ? 'Turma' :
             type === 'level' ? 'Classe' : 
             type === 'date' ? 'Data' :
             type === 'gradeSubject' ? 'Nota de Matemática' :
             type === 'gradeAverage' ? 'Média de Notas' : 'Resultado Final',
      x: 50,
      y: 50,
      fontSize: 24,
      fontWeight: 'bold',
      color: '#000000',
      text: type === 'custom' ? 'Texto Personalizado' : 
            type === 'gradeSubject' ? 'Matemática' : undefined
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<CertificateTemplate['fields'][0]>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  return (
    <div className="bg-white rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[800px]">
      {/* Sidebar Editor */}
      <div className="w-full lg:w-80 border-r border-neutral-100 flex flex-col bg-neutral-50/50">
        <div className="p-6 border-b border-neutral-100 bg-white">
          <h4 className="text-lg font-black text-neutral-900 tracking-tight">Configurar Modelo</h4>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Desenhe o seu certificado</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome do Modelo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Certificado de Mérito"
              className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>

          {!backgroundImage ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Fundo do Certificado</label>
              <label className="flex flex-col items-center justify-center w-full h-32 bg-white border-2 border-dashed border-neutral-200 rounded-2xl cursor-pointer hover:bg-neutral-50 transition-all group">
                <Upload className="text-neutral-300 group-hover:text-emerald-500 transition-colors" size={24} />
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-2">Upload Imagem</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Dados Gerais</label>
                  <div className="flex gap-1">
                    <button onClick={() => addField('studentName')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Nome do Aluno"><Users size={14} /></button>
                    <button onClick={() => addField('className')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Turma"><Layers size={14} /></button>
                    <button onClick={() => addField('date')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Data"><CalendarDays size={14} /></button>
                    <button onClick={() => addField('custom')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Texto Fixo"><FileText size={14} /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Notas (Pauta/Boletim)</label>
                  <div className="flex gap-1">
                    <button onClick={() => addField('gradeSubject')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Nota de Disciplina"><BookOpen size={14} /></button>
                    <button onClick={() => addField('gradeAverage')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Média Anual"><TrendingUp size={14} /></button>
                    <button onClick={() => addField('gradeResult')} className="p-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-600 hover:text-emerald-600 transition-all" title="Resultado Final"><Award size={14} /></button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {fields.map(field => (
                  <button 
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={cn(
                      "w-full p-3 flex items-center justify-between rounded-xl border transition-all text-left",
                      selectedFieldId === field.id ? "bg-emerald-50 border-emerald-200" : "bg-white border-neutral-100 hover:border-neutral-200"
                    )}
                  >
                    <div>
                      <p className="text-xs font-black text-neutral-900">{field.label}</p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">X: {Math.round(field.x)}% Y: {Math.round(field.y)}%</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="text-neutral-300 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                  </button>
                ))}
              </div>

              {selectedFieldId && (
                <div className="p-4 bg-white border border-neutral-100 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Propriedades</h5>
                    <button onClick={() => setSelectedFieldId(null)} className="text-neutral-400 hover:text-neutral-900"><X size={14} /></button>
                  </div>
                  
                  {fields.find(f => f.id === selectedFieldId)?.type === 'custom' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Texto</label>
                      <input 
                        type="text" 
                        value={fields.find(f => f.id === selectedFieldId)?.text || ''}
                        onChange={(e) => updateField(selectedFieldId, { text: e.target.value })}
                        className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold outline-none"
                      />
                    </div>
                  )}

                  {fields.find(f => f.id === selectedFieldId)?.type === 'gradeSubject' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Disciplina (Pauta/Boletim)</label>
                      <input 
                        type="text" 
                        value={fields.find(f => f.id === selectedFieldId)?.text || ''}
                        onChange={(e) => updateField(selectedFieldId, { 
                          text: e.target.value,
                          label: `Nota de ${e.target.value}`
                        })}
                        placeholder="Ex: Matemática, Física"
                        className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Tamanho Fonte</label>
                      <input 
                        type="number" 
                        value={fields.find(f => f.id === selectedFieldId)?.fontSize || 24}
                        onChange={(e) => updateField(selectedFieldId, { fontSize: Number(e.target.value) })}
                        className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Cor</label>
                      <input 
                        type="color" 
                        value={fields.find(f => f.id === selectedFieldId)?.color || '#000000'}
                        onChange={(e) => updateField(selectedFieldId, { color: e.target.value })}
                        className="w-full h-8 p-1 bg-neutral-50 border border-neutral-200 rounded-lg outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Peso da Fonte</label>
                    <select 
                      value={fields.find(f => f.id === selectedFieldId)?.fontWeight || 'bold'}
                      onChange={(e) => updateField(selectedFieldId, { fontWeight: e.target.value })}
                      className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Médio</option>
                      <option value="bold">Negrito</option>
                      <option value="black">Preto (Extra Negrito)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-100 bg-white flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 text-neutral-500 font-bold hover:text-neutral-900 transition-colors text-sm">Cancelar</button>
          <button 
            onClick={() => onSave({ id: template?.id || Math.random().toString(36).substr(2, 9), name, backgroundImage, fields })}
            disabled={!name || !backgroundImage}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Canvas Preview */}
      <div className="flex-1 bg-neutral-100 p-8 flex items-center justify-center overflow-hidden relative">
        {!backgroundImage ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Upload className="text-neutral-300" size={32} />
            </div>
            <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Aguardando upload do modelo...</p>
          </div>
        ) : (
          <div 
            className="relative bg-white shadow-2xl border border-neutral-200 overflow-hidden"
            style={{ 
              width: '100%', 
              maxWidth: '800px', 
              aspectRatio: '1.414/1',
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
            onClick={(e) => {
              if (selectedFieldId) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                updateField(selectedFieldId, { x, y });
              }
            }}
          >
            {fields.map(field => (
              <div 
                key={field.id}
                className={cn(
                  "absolute cursor-move select-none whitespace-nowrap px-2 py-1 rounded border border-transparent transition-all",
                  selectedFieldId === field.id ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20" : "hover:border-neutral-300"
                )}
                style={{ 
                  left: `${field.x}%`, 
                  top: `${field.y}%`, 
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${field.fontSize}px`,
                  fontWeight: field.fontWeight,
                  color: field.color,
                  fontFamily: 'serif'
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
              >
                {field.type === 'custom' ? field.text : field.label}
              </div>
            ))}
          </div>
        )}
        <div className="absolute bottom-6 right-6 bg-neutral-900/80 backdrop-blur text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
          Clique no campo e depois no certificado para posicionar
        </div>
      </div>
    </div>
  );
}

function CertificateIssuer({ template, students, classes, schoolSettings, onBack, initialStudentId, initialBulkIds, getGrade }: {
  template: CertificateTemplate,
  students: Student[],
  classes: Class[],
  schoolSettings: SchoolSettings,
  onBack: () => void,
  initialStudentId?: string,
  initialBulkIds?: string[],
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(!!initialBulkIds && initialBulkIds.length > 0);
  const [bulkIds, setBulkIds] = useState<string[]>(initialBulkIds || []);
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedClass = classes.find(c => c.id === selectedStudent?.classId);

  const [certificateStyle, setCertificateStyle] = useState<'official' | 'custom'>('official');
  const [sidebarTab, setSidebarTab] = useState<'student' | 'details' | 'grades'>('student');

  const [certInfo, setCertInfo] = useState({
    directorName: 'Matos Enoque António',
    schoolName: 'Escola Pré-Universitária de Luanda (PUNIV)',
    schoolLocation: 'da Ingombota',
    naturalidade: 'Luanda',
    municipio: 'Kilamba Kiaxi',
    provincia: 'Luanda',
    fatherName: 'Alexandre Muela',
    motherName: 'Madalena Nzela Tchunanga',
    biIssuer: 'Luanda',
    biIssueDate: '24 de Junho de 2021',
    biValidDate: '23 de Junho de 2026',
    anoLectivo: schoolSettings.anoLectivo || '2023/2024',
    termoPauta: '18 FB/12',
    curso: 'Ciências Físicas e Biológicas',
    resultado: 'Apta',
    dataEmissao: '22 de Abril de 2026',
    subdirectorName: 'Mariano Quimbulo Baptista',
    birthDate: '05 de abril de 1997',
  });

  const [certGrades, setCertGrades] = useState<Record<string, Record<string, { c10: string, c11: string, c12: string }>>>({});

  const officialSubjects = {
    formacaoGeral: [
      { key: 'port', label: 'Língua Portuguesa' },
      { key: 'lng_est', label: 'Inglês / Francês' },
      { key: 'mat', label: 'Matemática' },
      { key: 'inf', label: 'Informática' },
      { key: 'fil', label: 'Filosofia' },
      { key: 'ed_fis', label: 'Educação Física' }
    ],
    formacaoEspecifica: [
      { key: 'bio', label: 'Biologia' },
      { key: 'fis', label: 'Física' },
      { key: 'qui', label: 'Química' },
      { key: 'geo', label: 'Geologia' }
    ],
    opcao: [
      { key: 'psi', label: 'Psicologia' },
      { key: 'geom_desc', label: 'Geom.ª Descritiva' }
    ]
  };

  useEffect(() => {
    if (!selectedStudent) return;
    
    // Auto-update student details if available
    setCertInfo(prev => ({
      ...prev,
      bi: selectedStudent.bi || '',
      birthDate: selectedStudent.birthDate || '05 de abril de 1997',
      anoLectivo: schoolSettings.anoLectivo || '2023/2024',
      curso: selectedClass?.course || 'Ciências Físicas e Biológicas',
    }));

    if (!certGrades[selectedStudent.id]) {
      const studentGrades: Record<string, { c10: string, c11: string, c12: string }> = {};
      const allSubjects = [
        ...officialSubjects.formacaoGeral,
        ...officialSubjects.formacaoEspecifica,
        ...officialSubjects.opcao
      ];
      
      const classSubjects = getSubjectsForClass(selectedClass);
      
      allSubjects.forEach(sub => {
        const dbSubject = classSubjects.find(s => 
          s.toLowerCase().includes(sub.label.toLowerCase()) || 
          sub.label.toLowerCase().includes(s.toLowerCase())
        );
        
        let gradeVal = '--------';
        if (dbSubject) {
          const mfd = calculateAnnual(selectedStudent.id, dbSubject, getGrade, selectedClass?.level);
          if (mfd > 0) {
            gradeVal = `${Math.round(mfd)} Valores`;
          }
        }
        
        const is10 = selectedClass?.level.includes('10ª');
        const is11 = selectedClass?.level.includes('11ª');
        const is12 = selectedClass?.level.includes('12ª');
        
        studentGrades[sub.key] = {
          c10: is10 ? gradeVal : '--------',
          c11: is11 ? gradeVal : '--------',
          c12: is12 ? gradeVal : '--------'
        };
      });
      
      setCertGrades(prev => ({
        ...prev,
        [selectedStudent.id]: studentGrades
      }));
    }
  }, [selectedStudentId, selectedClass, schoolSettings]);

  const resolveFieldValue = (student: Student | undefined, sClass: Class | undefined, type: string, customText?: string) => {
    if (!student) return '';
    if (type === 'studentName') return student.name;
    if (type === 'className') return sClass?.name || '';
    if (type === 'level') return sClass?.level || '';
    if (type === 'date') return new Date().toLocaleDateString('pt-PT');
    if (type === 'custom') return customText || '';
    
    if (type === 'gradeSubject') {
      if (!sClass) return '--------';
      const subjectName = customText || 'Matemática';
      const classSubjects = getSubjectsForClass(sClass);
      const dbSubject = classSubjects.find(s => 
        s.toLowerCase() === subjectName.toLowerCase() || 
        s.toLowerCase().includes(subjectName.toLowerCase()) ||
        subjectName.toLowerCase().includes(s.toLowerCase())
      ) || subjectName;
      const annual = calculateAnnual(student.id, dbSubject, getGrade, sClass.level);
      return annual > 0 ? `${Math.round(annual)} Valores` : '--------';
    }
    
    if (type === 'gradeAverage') {
      if (!sClass) return '--------';
      const classSubjects = getSubjectsForClass(sClass);
      if (classSubjects.length === 0) return '--------';
      const mfd_global = classSubjects.reduce((acc, sub) => {
        return acc + calculateAnnual(student.id, sub, getGrade, sClass.level);
      }, 0) / classSubjects.length;
      return `${mfd_global.toFixed(1)} Valores`;
    }
    
    if (type === 'gradeResult') {
      if (!sClass) return '--------';
      const classSubjects = getSubjectsForClass(sClass);
      if (classSubjects.length === 0) return '--------';
      const mfd_global = classSubjects.reduce((acc, sub) => {
        return acc + calculateAnnual(student.id, sub, getGrade, sClass.level);
      }, 0) / classSubjects.length;
      const threshold = getGradeScale(sClass.level || '').threshold;
      return mfd_global >= threshold ? 'Aprovado' : 'Reprovado';
    }
    
    return '';
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.bi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFieldValue = (type: string, customText?: string) => {
    return resolveFieldValue(selectedStudent, selectedClass, type, customText);
  };

  const updateGradeValue = (subKey: string, field: 'c10' | 'c11' | 'c12', val: string) => {
    if (!selectedStudent) return;
    setCertGrades(prev => {
      const current = prev[selectedStudent.id] || {};
      const subObj = current[subKey] || { c10: '--------', c11: '--------', c12: '--------' };
      return {
        ...prev,
        [selectedStudent.id]: {
          ...current,
          [subKey]: {
            ...subObj,
            [field]: val
          }
        }
      };
    });
  };

  const renderOfficialCertificate = (student: Student, sClass: Class | undefined) => {
    const sGrades = certGrades[student.id] || {};
    const getGradeValue = (subKey: string) => {
      return sGrades[subKey] || { c10: '--------', c11: '--------', c12: '--------' };
    };

    return (
      <div 
        id={`cert-${student.id}`}
        className="print-certificate-target bg-white text-neutral-900 font-serif relative border-[12px] border-double border-red-600 flex flex-col justify-between select-text"
        style={{
          width: '100%',
          maxWidth: '210mm',
          height: '297mm',
          padding: '14mm',
          boxSizing: 'border-box',
          margin: '0 auto',
          backgroundColor: 'white'
        }}
      >
        {/* Top Header */}
        <div className="flex flex-col items-center text-center space-y-0.5">
          <img 
            src={schoolSettings.logoBase64 || "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png"} 
            alt="Logomarca da Escola" 
            className="w-12 h-12 object-contain mb-1"
            referrerPolicy="no-referrer"
          />
          <h2 contentEditable suppressContentEditableWarning className="text-[10px] font-bold uppercase tracking-wider text-neutral-800 leading-none outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-0.5 rounded transition-all">{schoolSettings.republica || "República de Angola"}</h2>
          <h3 contentEditable suppressContentEditableWarning className="text-[9px] font-medium text-neutral-700 leading-none outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-0.5 rounded transition-all">{schoolSettings.direccaoMunicipal || "Ministério da Educação"}</h3>
          <h4 contentEditable suppressContentEditableWarning className="text-[9px] font-bold uppercase tracking-widest text-neutral-800 leading-none outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-0.5 rounded transition-all">{schoolSettings.nomeEscola || "Ensino Geral"}</h4>
        </div>

        {/* Certificate Title */}
        <div className="text-center my-2">
          <h1 contentEditable suppressContentEditableWarning className="text-xl font-black text-red-600 tracking-wider uppercase font-serif outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-0.5 rounded transition-all">Certificado de Habilitações</h1>
        </div>

        {/* Certificate Text Body */}
        <div className="text-[9px] leading-relaxed text-justify text-neutral-800 px-2 space-y-1.5">
          <p contentEditable suppressContentEditableWarning className="outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-1 rounded transition-all">
            <span className="font-bold uppercase">{certInfo.directorName}</span>, Director (a) da <span className="font-bold">{certInfo.schoolName}</span> {certInfo.schoolLocation}, declara em cumprimento do despacho no requerimento que fica arquivado nesta secretaria que, <span className="font-bold text-red-600 uppercase">{student.name}</span>, natural de <span className="font-bold">{certInfo.naturalidade}</span>, Município de <span className="font-bold">{certInfo.municipio}</span>, Província de <span className="font-bold">{certInfo.provincia}</span>, Filho de <span className="font-bold">{certInfo.fatherName}</span> e de <span className="font-bold">{certInfo.motherName}</span>, nascido aos <span className="font-bold">{student.birthDate || certInfo.birthDate}</span>, portador do B.I. nº <span className="font-bold">{student.bi}</span>, passado pelo arquivo de identificação de <span className="font-bold">{certInfo.biIssuer}</span>, aos <span className="font-bold">{certInfo.biIssueDate}</span>, válido até <span className="font-bold">{certInfo.biValidDate}</span>.
          </p>
          <p contentEditable suppressContentEditableWarning className="outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-1 rounded transition-all">
            <span className="font-bold">Concluiu</span> nesta escola <span className="font-bold">{certInfo.schoolName}</span> ano lectivo de <span className="font-bold">{certInfo.anoLectivo}</span>, no termo e pauta nº <span className="font-bold">{certInfo.termoPauta}</span> no Curso de <span className="font-bold italic">{sClass?.course || certInfo.curso}</span>. Como resultado final de <span className="font-bold">{certInfo.resultado}</span> e Obteve as Seguintes Classificações:
          </p>
        </div>

        {/* Grades Table */}
        <div className="px-2 my-1.5">
          <table className="w-full text-[8px] border-collapse border-2 border-black">
            <thead>
              <tr className="bg-neutral-50 font-bold text-center">
                <th className="border border-black p-1 text-left w-2/5">DISCIPLINAS</th>
                <th className="border border-black p-1 w-1/5">10ª Classe</th>
                <th className="border border-black p-1 w-1/5">11ª Classe</th>
                <th className="border border-black p-1 w-1/5">12ª Classe</th>
              </tr>
            </thead>
            <tbody>
              {/* Formação Geral */}
              <tr className="bg-neutral-100 font-bold text-[7.5px]">
                <td colSpan={4} className="border border-black p-0.5 px-1 text-left uppercase tracking-wide font-sans">Formação Geral</td>
              </tr>
              {officialSubjects.formacaoGeral.map(sub => {
                const gr = getGradeValue(sub.key);
                return (
                  <tr key={sub.key} className="hover:bg-neutral-50">
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 px-1 font-bold text-left uppercase text-[7px] outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{sub.label}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c10}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c11}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c12}</td>
                  </tr>
                );
              })}

              {/* Formação Específica */}
              <tr className="bg-neutral-100 font-bold text-[7.5px]">
                <td colSpan={4} className="border border-black p-0.5 px-1 text-left uppercase tracking-wide font-sans">Formação Específica</td>
              </tr>
              {officialSubjects.formacaoEspecifica.map(sub => {
                const gr = getGradeValue(sub.key);
                return (
                  <tr key={sub.key} className="hover:bg-neutral-50">
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 px-1 font-bold text-left uppercase text-[7px] outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{sub.label}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c10}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c11}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c12}</td>
                  </tr>
                );
              })}

              {/* Opção */}
              <tr className="bg-neutral-100 font-bold text-[7.5px]">
                <td colSpan={4} className="border border-black p-0.5 px-1 text-left uppercase tracking-wide font-sans">Opção</td>
              </tr>
              {officialSubjects.opcao.map(sub => {
                const gr = getGradeValue(sub.key);
                return (
                  <tr key={sub.key} className="hover:bg-neutral-50">
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 px-1 font-bold text-left uppercase text-[7px] outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{sub.label}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c10}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c11}</td>
                    <td contentEditable suppressContentEditableWarning className="border border-black p-0.5 text-center font-medium outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60">{gr.c12}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Certificate Footer Text */}
        <div className="text-[9px] leading-relaxed text-justify text-neutral-800 px-2 mt-1">
          <p contentEditable suppressContentEditableWarning className="outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 p-1 rounded transition-all">
            Por ser verdade e me ter sido solicitado e assim constar nos documentos arquivados passou-se o presente certificado que por mim vai assinado e autenticado com selo branco em uso neste estabelecimento de ensino. Escola <span className="font-bold">{certInfo.schoolName}</span> {certInfo.schoolLocation}, aos <span className="font-bold">{certInfo.dataEmissao}</span>.
          </p>
        </div>

        {/* Signatures Block */}
        <div className="grid grid-cols-2 gap-6 text-center px-4 mt-3 relative">
          <div className="flex flex-col items-center">
            <span contentEditable suppressContentEditableWarning className="font-bold text-[8.5px] uppercase tracking-wider text-neutral-800 outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 px-1 rounded">O Subdirector Pedagógico</span>
            <div className="w-full max-w-[150px] border-b border-dashed border-neutral-400 mt-8"></div>
            <span contentEditable suppressContentEditableWarning className="text-neutral-900 mt-1 text-[8.5px] font-bold uppercase outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 px-1 rounded">{certInfo.subdirectorName}</span>
            <span contentEditable suppressContentEditableWarning className="text-neutral-400 text-[6.5px] italic outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 px-1 rounded">(Assinatura legível)</span>
          </div>
          <div className="flex flex-col items-center relative">
            <span contentEditable suppressContentEditableWarning className="font-bold text-[8.5px] uppercase tracking-wider text-neutral-800 outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 px-1 rounded">O Director Geral</span>
            <div className="w-full max-w-[150px] border-b border-dashed border-neutral-400 mt-8"></div>
            <span contentEditable suppressContentEditableWarning className="text-neutral-900 mt-1 text-[8.5px] font-bold uppercase outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 px-1 rounded">{certInfo.directorName}</span>
            <span contentEditable suppressContentEditableWarning className="text-neutral-400 text-[6.5px] italic outline-none hover:bg-neutral-50/80 focus:bg-amber-50/60 px-1 rounded">(Assinatura legível)</span>
            
            {/* Visual Stamp Area */}
            <div className="absolute right-0 bottom-[-5px] w-16 h-16 border-2 border-blue-600/20 rounded-full flex items-center justify-center text-blue-600/30 font-mono text-[5.5px] uppercase tracking-tighter rotate-12 select-none pointer-events-none">
              <div className="text-center scale-90 leading-none">
                <p className="font-bold">PUNIV</p>
                <p className="text-[4px]">MINISTÉRIO EDUCAÇÃO</p>
                <p className="font-bold text-[5px]">SELO BRANCO</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 font-bold hover:text-neutral-900 transition-colors">
          <ChevronRight className="rotate-180" size={20} />
          Voltar aos Modelos
        </button>
        <div className="flex gap-3">
          {bulkIds.length > 0 && (
            <button 
              onClick={() => {
                setIsBulkMode(true);
                setTimeout(() => window.print(), 500);
              }}
              className="bg-amber-600 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-amber-700 transition-all active:scale-95 shadow-xl shadow-amber-100 animate-pulse"
            >
              <Award size={20} />
              Imprimir Todos ({bulkIds.length})
            </button>
          )}
          <button 
            onClick={() => {
              setIsBulkMode(false);
              setTimeout(() => window.print(), 100);
            }}
            disabled={!selectedStudentId}
            className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200 disabled:opacity-50"
          >
            <Printer size={20} />
            Imprimir Seleccionado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm h-fit space-y-6">
          {/* Tabs header */}
          <div className="flex border-b border-neutral-100 pb-2">
            <button
              onClick={() => setSidebarTab('student')}
              className={cn(
                "flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-colors",
                sidebarTab === 'student' ? "text-emerald-600 border-b-2 border-emerald-600" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              Aluno
            </button>
            <button
              onClick={() => setSidebarTab('details')}
              className={cn(
                "flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-colors",
                sidebarTab === 'details' ? "text-emerald-600 border-b-2 border-emerald-600" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              Parâmetros
            </button>
            <button
              onClick={() => setSidebarTab('grades')}
              disabled={!selectedStudentId}
              className={cn(
                "flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-40",
                sidebarTab === 'grades' ? "text-emerald-600 border-b-2 border-emerald-600" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              Notas A4
            </button>
          </div>

          {sidebarTab === 'student' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-neutral-900 tracking-tight uppercase">Seleccionar Aluno</h4>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar aluno..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredStudents.map(student => (
                  <button 
                    key={student.id}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setSidebarTab('details');
                    }}
                    className={cn(
                      "w-full p-4 flex items-center justify-between rounded-2xl transition-all text-left",
                      selectedStudentId === student.id ? "bg-emerald-50 border-emerald-200 border" : "bg-neutral-50 border-transparent border hover:bg-neutral-100"
                    )}
                  >
                    <div>
                      <p className="text-sm font-black text-neutral-900">{student.name}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{student.bi}</p>
                    </div>
                    {selectedStudentId === student.id && <Check size={18} className="text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sidebarTab === 'details' && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <h4 className="text-sm font-black text-neutral-900 tracking-tight uppercase">Parâmetros do Certificado</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Director(a) Geral</label>
                  <input
                    type="text"
                    value={certInfo.directorName}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, directorName: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Subdirector(a) Pedagógico</label>
                  <input
                    type="text"
                    value={certInfo.subdirectorName}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, subdirectorName: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Nome da Instituição</label>
                  <input
                    type="text"
                    value={certInfo.schoolName}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, schoolName: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Localização (ex: da Ingombota)</label>
                  <input
                    type="text"
                    value={certInfo.schoolLocation}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, schoolLocation: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Curso de Habilitação</label>
                  <input
                    type="text"
                    value={certInfo.curso}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, curso: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Termo e Pauta Nº</label>
                  <input
                    type="text"
                    value={certInfo.termoPauta}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, termoPauta: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Ano Lectivo</label>
                  <input
                    type="text"
                    value={certInfo.anoLectivo}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, anoLectivo: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Natural de</label>
                    <input
                      type="text"
                      value={certInfo.naturalidade}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, naturalidade: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Município de</label>
                    <input
                      type="text"
                      value={certInfo.municipio}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, municipio: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Província de</label>
                    <input
                      type="text"
                      value={certInfo.provincia}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, provincia: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Resultado</label>
                    <input
                      type="text"
                      value={certInfo.resultado}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, resultado: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Nome do Pai</label>
                  <input
                    type="text"
                    value={certInfo.fatherName}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, fatherName: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Nome da Mãe</label>
                  <input
                    type="text"
                    value={certInfo.motherName}
                    onChange={(e) => setCertInfo(prev => ({ ...prev, motherName: e.target.value }))}
                    className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">BI Emitido em</label>
                    <input
                      type="text"
                      value={certInfo.biIssuer}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, biIssuer: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Emitido aos</label>
                    <input
                      type="text"
                      value={certInfo.biIssueDate}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, biIssueDate: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Válido até</label>
                    <input
                      type="text"
                      value={certInfo.biValidDate}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, biValidDate: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Data de Emissão</label>
                    <input
                      type="text"
                      value={certInfo.dataEmissao}
                      onChange={(e) => setCertInfo(prev => ({ ...prev, dataEmissao: e.target.value }))}
                      className="w-full px-4 py-2 mt-1 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'grades' && selectedStudentId && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-neutral-900 tracking-tight uppercase">Classificações do Aluno</h4>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-bold">Valores</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-bold leading-normal">Configure as notas oficiais para este certificado A4.</p>
              
              <div className="space-y-4 divide-y divide-neutral-100 pt-2">
                {[
                  ...officialSubjects.formacaoGeral,
                  ...officialSubjects.formacaoEspecifica,
                  ...officialSubjects.opcao
                ].map(sub => {
                  const studentGrades = certGrades[selectedStudentId] || {};
                  const grade = studentGrades[sub.key] || { c10: '--------', c11: '--------', c12: '--------' };
                  return (
                    <div key={sub.key} className="pt-3 first:pt-0 space-y-2">
                      <span className="text-xs font-black text-neutral-800 uppercase block">{sub.label}</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase">10ª Classe</label>
                          <input
                            type="text"
                            value={grade.c10}
                            onChange={(e) => updateGradeValue(sub.key, 'c10', e.target.value)}
                            className="w-full px-2 py-1.5 mt-0.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase">11ª Classe</label>
                          <input
                            type="text"
                            value={grade.c11}
                            onChange={(e) => updateGradeValue(sub.key, 'c11', e.target.value)}
                            className="w-full px-2 py-1.5 mt-0.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase">12ª Classe</label>
                          <input
                            type="text"
                            value={grade.c12}
                            onChange={(e) => updateGradeValue(sub.key, 'c12', e.target.value)}
                            className="w-full px-2 py-1.5 mt-0.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Certificate Style Selector */}
          <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-2xl">
            <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Estilo de Impressão:</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCertificateStyle('official')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black transition-all",
                  certificateStyle === 'official' ? "bg-red-600 text-white shadow-sm" : "bg-white text-neutral-600 hover:bg-neutral-100"
                )}
              >
                Modelo Oficial de Angola (A4)
              </button>
              <button 
                onClick={() => setCertificateStyle('custom')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black transition-all",
                  certificateStyle === 'custom' ? "bg-neutral-900 text-white shadow-sm" : "bg-white text-neutral-600 hover:bg-neutral-100"
                )}
              >
                Modelo Customizado (Paisagem)
              </button>
            </div>
          </div>

          {/* Automatic & Direct Editable Hint Banner */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-4 flex items-start gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">Certificados Gerados Automaticamente & Editáveis</p>
              <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                Os dados e notas do aluno são <span className="font-bold">preenchidos de forma automática</span> pelo sistema. Para além do formulário lateral, <span className="font-bold">pode clicar em qualquer texto, tabela ou nota diretamente no certificado abaixo para editá-lo</span> livremente antes de imprimir!
              </p>
            </div>
          </div>

          {isBulkMode ? (
            <div className="space-y-8 print:space-y-0">
              {bulkIds.map(id => {
                const student = students.find(s => s.id === id);
                const sClass = classes.find(c => c.id === student?.classId);
                if (!student) return null;
                
                if (certificateStyle === 'official') {
                  return (
                    <div key={id} className="bg-white p-4 rounded-[40px] border border-neutral-200 shadow-sm overflow-x-auto print:p-0 print:border-none print:shadow-none print:break-after-page">
                      {renderOfficialCertificate(student, sClass)}
                    </div>
                  );
                }

                return (
                  <div key={id} className="bg-white p-4 rounded-[40px] border border-neutral-200 shadow-sm overflow-hidden print-certificate-target print:p-0 print:border-none print:shadow-none print:break-after-page">
                    <div 
                      className="relative mx-auto"
                      style={{ 
                        width: '100%', 
                        aspectRatio: '1.414/1',
                        backgroundImage: `url(${template.backgroundImage})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    >
                      {template.fields.map(field => {
                        const val = resolveFieldValue(student, sClass, field.type, field.text);

                        return (
                          <div 
                            key={field.id}
                            className="absolute whitespace-nowrap"
                            style={{ 
                              left: `${field.x}%`, 
                              top: `${field.y}%`, 
                              transform: 'translate(-50%, -50%)',
                              fontSize: `${field.fontSize}px`,
                              fontWeight: field.fontWeight,
                              color: field.color,
                              fontFamily: 'serif'
                            }}
                          >
                            {val}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            selectedStudentId && (
              <div className="bg-white p-4 rounded-[40px] border border-neutral-200 shadow-sm overflow-x-auto">
                {certificateStyle === 'official' ? (
                  renderOfficialCertificate(selectedStudent, selectedClass)
                ) : (
                  <div className="print-certificate-target print:p-0 print:border-none print:shadow-none min-w-[600px]">
                    <div 
                      className="relative mx-auto"
                      style={{ 
                        width: '100%', 
                        aspectRatio: '1.414/1',
                        backgroundImage: `url(${template.backgroundImage})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    >
                      {template.fields.map(field => (
                        <div 
                          key={field.id}
                          className="absolute whitespace-nowrap"
                          style={{ 
                            left: `${field.x}%`, 
                            top: `${field.y}%`, 
                            transform: 'translate(-50%, -50%)',
                            fontSize: `${field.fontSize}px`,
                            fontWeight: field.fontWeight,
                            color: field.color,
                            fontFamily: 'serif'
                          }}
                        >
                          {getFieldValue(field.type, field.text)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
          
          {!selectedStudentId && !isBulkMode && (
            <div className="p-12 text-center bg-neutral-50 rounded-[32px] border border-dashed border-neutral-200">
              <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Seleccione um aluno para visualizar o certificado</p>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-certificate-target, .print-certificate-target * { visibility: visible; }
          .print-certificate-target {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            padding: 14mm !important;
            box-sizing: border-box !important;
            border: 12px double #dc2626 !important;
            background: white !important;
            margin: 0;
          }
          .print-certificate-target .relative {
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function TeacherPortalView({ 
  teacher, 
  students, 
  classes, 
  grades, 
  onUpdateGrades,
  getGrade,
  schoolSettings,
  setSchoolSettings,
  showToast,
  onLogout,
  onExportPDF,
  currentUser
}: { 
  teacher: Teacher, 
  students: Student[], 
  classes: Class[], 
  grades: Grade[],
  onUpdateGrades: (g: Grade[]) => void,
  getGrade: (studentId: string, subjectId: string, period: string, type?: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3') => number,
  schoolSettings: any,
  setSchoolSettings: (s: any) => void,
  showToast: (m: string, t?: 'success' | 'error') => void,
  onLogout: () => void,
  onExportPDF?: (cls: Class, paperSize?: 'A4' | 'A3' | 'A5') => void,
  currentUser: any,
  schoolName?: string
}) {
  const [activeTab, setActiveTab] = useState<'notas' | 'listas' | 'mini-pauta' | 'pauta'>('notas');
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(teacher.assignments[0] || null);
  const [selectedPeriod, setSelectedPeriod] = useState<Grade['period']>('1º Trimestre');
  
  const currentClass = classes.find(c => c.id === selectedAssignment?.classId);
  const classStudents = students.filter(s => s.classId === selectedAssignment?.classId);
  const teacherClasses = classes.filter(c => teacher.assignments.some(a => a.classId === c.id));

  const handleGradeChange = (studentId: string, type: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT', value: number) => {
    if (!selectedAssignment) return;
    
    let newGrades = [...grades];
    const newValue = Math.min(getGradeScale(currentClass?.level || '').max, Math.max(0, value));

    const setSingleGrade = (t: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT', val: number) => {
      const idx = newGrades.findIndex(g => 
        g.studentId === studentId && 
        g.subjectId === selectedAssignment.subject && 
        g.period === selectedPeriod && 
        g.type === t
      );
      if (idx > -1) {
        newGrades[idx] = { ...newGrades[idx], value: val };
      } else {
        newGrades.push({
          studentId,
          subjectId: selectedAssignment.subject,
          period: selectedPeriod,
          type: t,
          value: val
        });
      }
    };

    setSingleGrade(type, newValue);

    if (['AC1', 'AC2', 'AC3'].includes(type)) {
      const getVal = (t: 'AC1' | 'AC2' | 'AC3') => {
        if (t === type) return newValue;
        const item = newGrades.find(g => g.studentId === studentId && g.subjectId === selectedAssignment.subject && g.period === selectedPeriod && g.type === t);
        return item ? item.value : (getGrade(studentId, selectedAssignment.subject, selectedPeriod, t) || 0);
      };
      const ac1 = getVal('AC1');
      const ac2 = getVal('AC2');
      const ac3 = getVal('AC3');
      const macVal = Number(((ac1 + ac2 + ac3) / 3).toFixed(1));
      setSingleGrade('MAC', macVal);
    }

    onUpdateGrades(newGrades);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-8 py-6 flex items-center justify-between sticky top-0 z-30 shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-200 shrink-0">
            {teacher.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Portal do Professor</h1>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Bem-vindo, Prof. {teacher.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {(['notas', 'listas', 'mini-pauta', 'pauta'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-neutral-900 text-white shadow-md shadow-neutral-200"
                  : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {tab === 'notas' ? 'Lançar Notas' :
               tab === 'listas' ? 'Listas da Turma' :
               tab === 'mini-pauta' ? 'Mini Pautas' : 'Pautas'}
            </button>
          ))}
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-600 rounded-2xl font-black hover:bg-neutral-200 transition-all active:scale-95 shrink-0"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Sair do Portal</span>
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        {activeTab === 'listas' && (
          <ListsView 
            classes={teacherClasses} 
            students={students} 
            selectedClassId={teacherClasses[0]?.id || ''} 
            onClassChange={() => {}} 
            setActiveView={() => {}} 
            schoolSettings={schoolSettings} 
            setSchoolSettings={setSchoolSettings} 
            onExportPDF={onExportPDF}
          />
        )}

        {activeTab === 'mini-pauta' && (
          <MiniPautasView 
            classes={teacherClasses} 
            students={students} 
            grades={grades} 
            onUpdateGrades={onUpdateGrades} 
            getGrade={getGrade} 
            schoolSettings={schoolSettings} 
            setSchoolSettings={setSchoolSettings}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeTab === 'pauta' && (
          <PautaFinalView 
            classes={teacherClasses} 
            students={students} 
            grades={grades} 
            getGrade={getGrade} 
            schoolSettings={schoolSettings} 
            setSchoolSettings={setSchoolSettings} 
            onIssueCertificate={() => {}} 
            showToast={showToast} 
            currentUser={currentUser}
          />
        )}

        {activeTab === 'notas' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Seleccionar Turma e Disciplina</label>
                <div className="grid grid-cols-1 gap-3">
                  {teacher.assignments.map((assignment, idx) => {
                    const cls = classes.find(c => c.id === assignment.classId);
                    const isActive = selectedAssignment === assignment;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedAssignment(assignment)}
                        className={cn(
                          "p-6 rounded-[24px] border text-left transition-all group relative overflow-hidden",
                          isActive 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100" 
                            : "bg-white border-neutral-200 text-neutral-600 hover:border-emerald-200 hover:bg-emerald-50/30"
                        )}
                      >
                        <div className="relative z-10">
                          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isActive ? "text-emerald-100" : "text-neutral-400")}>
                            {cls?.level} - {cls?.shift}
                          </p>
                          <h4 className="text-xl font-black tracking-tight">{assignment.subject}</h4>
                          <p className={cn("text-sm font-bold mt-1", isActive ? "text-emerald-50" : "text-neutral-500")}>
                            {cls?.name} • Sala {cls?.room}
                          </p>
                        </div>
                        {isActive && (
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-8 -mt-8" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Seleccionar Período</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['1º Trimestre', '2º Trimestre', '3º Trimestre', 'Exame'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={cn(
                        "p-6 rounded-[24px] border font-black transition-all",
                        selectedPeriod === period 
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-neutral-200" 
                          : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      )}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedAssignment ? (
              <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-neutral-900 tracking-tight">Lançamento de Notas</h3>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
                      {selectedAssignment.subject} | {currentClass?.name} | {selectedPeriod}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                      Escala: 0 - {getGradeScale(currentClass?.level || '').max}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="px-3 py-3 text-center">Nº</th>
                        <th className="px-4 py-3">Estudante</th>
                        <th className="px-2 py-3 text-center">AC1</th>
                        <th className="px-2 py-3 text-center">AC2</th>
                        <th className="px-2 py-3 text-center">AC3</th>
                        <th className="px-3 py-3 text-center bg-emerald-50/50 text-emerald-800">MAC</th>
                        <th className="px-3 py-3 text-center">NPT</th>
                        <th className="px-3 py-3 text-center bg-blue-50/50 text-blue-800">Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {classStudents.sort((a, b) => a.name.localeCompare(b.name)).map((student, idx) => {
                        const getVal = (type: 'AC1' | 'AC2' | 'AC3' | 'MAC' | 'NPT') => {
                          const found = grades.find(g => g.studentId === student.id && g.subjectId === selectedAssignment.subject && g.period === selectedPeriod && g.type === type);
                          if (found) return found.value;
                          if (type === 'MAC') {
                            const ac1 = grades.find(g => g.studentId === student.id && g.subjectId === selectedAssignment.subject && g.period === selectedPeriod && g.type === 'AC1')?.value ?? 0;
                            const ac2 = grades.find(g => g.studentId === student.id && g.subjectId === selectedAssignment.subject && g.period === selectedPeriod && g.type === 'AC2')?.value ?? 0;
                            const ac3 = grades.find(g => g.studentId === student.id && g.subjectId === selectedAssignment.subject && g.period === selectedPeriod && g.type === 'AC3')?.value ?? 0;
                            if (ac1 || ac2 || ac3) return Number(((ac1 + ac2 + ac3) / 3).toFixed(1));
                          }
                          return 0;
                        };

                        const ac1 = getVal('AC1');
                        const ac2 = getVal('AC2');
                        const ac3 = getVal('AC3');
                        const mac = getVal('MAC');
                        const npt = getVal('NPT');
                        const media = (mac + npt) / 2;
                        const threshold = getGradeScale(currentClass?.level || '').threshold;
                        const maxVal = getGradeScale(currentClass?.level || '').max;

                        return (
                          <tr key={student.id} className="hover:bg-neutral-50/30 transition-colors">
                            <td className="px-3 py-3 text-center text-sm font-bold text-neutral-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-neutral-900 tracking-tight text-sm">{student.name}</p>
                              <p className="text-[10px] font-bold text-neutral-400 uppercase">{student.bi}</p>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input 
                                type="number" 
                                min="0" max={maxVal} step="0.1"
                                value={ac1}
                                onChange={(e) => handleGradeChange(student.id, 'AC1', Number(e.target.value))}
                                className={cn("w-14 text-center py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all", ac1 >= threshold ? "text-neutral-900" : "text-rose-600")}
                                title="Avaliação Contínua 1"
                              />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input 
                                type="number" 
                                min="0" max={maxVal} step="0.1"
                                value={ac2}
                                onChange={(e) => handleGradeChange(student.id, 'AC2', Number(e.target.value))}
                                className={cn("w-14 text-center py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all", ac2 >= threshold ? "text-neutral-900" : "text-rose-600")}
                                title="Avaliação Contínua 2"
                              />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input 
                                type="number" 
                                min="0" max={maxVal} step="0.1"
                                value={ac3}
                                onChange={(e) => handleGradeChange(student.id, 'AC3', Number(e.target.value))}
                                className={cn("w-14 text-center py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all", ac3 >= threshold ? "text-neutral-900" : "text-rose-600")}
                                title="Avaliação Contínua 3"
                              />
                            </td>
                            <td className="px-2 py-3 text-center bg-emerald-50/20">
                              <input 
                                type="number" 
                                min="0" max={maxVal} step="0.1"
                                value={mac}
                                onChange={(e) => handleGradeChange(student.id, 'MAC', Number(e.target.value))}
                                className={cn("w-16 text-center py-2 bg-emerald-100/50 border border-emerald-300 rounded-xl font-black text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all", mac >= threshold ? "text-emerald-950 font-black" : "text-rose-600 font-black")}
                                title="Média de Avaliação Contínua"
                              />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input 
                                type="number" 
                                min="0" max={maxVal} step="0.1"
                                value={npt}
                                onChange={(e) => handleGradeChange(student.id, 'NPT', Number(e.target.value))}
                                className={cn("w-16 text-center py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-black text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all", npt >= threshold ? "text-neutral-900" : "text-rose-600")}
                              />
                            </td>
                            <td className="px-3 py-3 text-center bg-blue-50/20">
                              <div className={cn(
                                "w-12 h-10 mx-auto rounded-xl flex items-center justify-center font-black text-sm",
                                media >= threshold ? "bg-blue-100/60 text-blue-950" : "bg-rose-100/60 text-rose-700"
                              )}>
                                {media.toFixed(1)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-6 sm:p-8 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                    As notas são guardadas automaticamente no sistema central.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check size={18} />
                      <span className="text-sm font-black">Sincronizado</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-20 text-center bg-white rounded-[32px] border border-dashed border-neutral-200">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap size={24} className="text-neutral-300" />
                </div>
                <p className="text-neutral-500 font-bold">Nenhuma atribuição seleccionada</p>
                <p className="text-xs text-neutral-400 mt-1">Seleccione uma turma e disciplina acima para começar a lançar notas.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
