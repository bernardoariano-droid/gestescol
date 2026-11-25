export type SubscriptionPlan = 'Mensal' | 'Trimestral' | 'Anual';
export type SubscriptionStatus = 'Activa' | 'Expirada' | 'Pendente';

export type School = {
  id: string;
  name: string;
  nif?: string;
  address?: string;
  phone?: string;
  email?: string;
  directorName?: string;
  subdirectorName?: string;
  status: 'Activo' | 'Inactivo';
  republica?: string;
  governoProvincia?: string;
  administracaoMunicipal?: string;
  direccaoMunicipal?: string;
  anoLectivo?: string;
  logoBase64?: string;
  subscription?: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string;
  };
};

export type Student = {
  id: string;
  name: string;
  bi: string;
  birthDate: string;
  gender: 'M' | 'F';
  guardianName: string;
  guardianPhone: string;
  classId: string;
  enrollmentStatus: 'Matriculado' | 'Confirmado' | 'Pendente' | 'Desistente';
  enrollmentDate: string;
  schoolId?: string;
  residentialZone?: string;
};

export type Class = {
  id: string;
  name: string; // e.g., 10ª Classe - A
  level: string; // e.g., 10ª Classe
  course?: 'Geral' | 'Ciências Físicas e Biológicas' | 'Ciências Jurídicas e Económicas' | 'Ciências Sociais';
  shift: 'Manhã' | 'Tarde' | 'Noite';
  room: string;
  capacity: number;
  subjects?: string[];
  schoolId?: string;
};

export type Subject = {
  id: string;
  name: string;
  teacherId: string;
  schoolId?: string;
};

export type Grade = {
  studentId: string;
  subjectId: string;
  period: '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | 'Exame' | 'Recurso';
  type: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3' | 'Exame' | 'REC';
  value: number;
  notaExame?: number;
  notaRecurso?: number;
  schoolId?: string;
};

export type Payment = {
  id: string;
  studentId: string;
  month?: string; // e.g., "Janeiro", "Fevereiro"
  service: string; // e.g., "Propina", "Uniforme", "Transporte"
  amount: number;
  fine?: number;
  discount?: number;
  date: string;
  status: 'Pago' | 'Pendente' | 'Atrasado';
  receiptNumber: string;
  schoolId?: string;
};

export type TeacherAssignment = {
  classId: string;
  subject: string;
};

export type Teacher = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  assignments: TeacherAssignment[];
  portalToken?: string;
  schoolId?: string;
};

export type CertificateTemplate = {
  id: string;
  name: string;
  backgroundImage: string; // base64
  fields: {
    id: string;
    type: 'studentName' | 'className' | 'level' | 'date' | 'custom' | 'gradeSubject' | 'gradeAverage' | 'gradeResult';
    label: string;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    fontSize: number;
    fontWeight: string;
    color: string;
    text?: string; // for custom type or subject name for gradeSubject
  }[];
  schoolId?: string;
};

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Super-Administrador' | 'Administrador' | 'Secretário' | 'Professor' | 'Financeiro' | 'Aluno';
  status: 'Activo' | 'Inactivo';
  lastLogin?: string;
  schoolId?: string;
  assignedClassIds?: string[];
  assignedSubjects?: string[];
  assignments?: TeacherAssignment[];
  phone?: string;
  specialization?: string;
  avatarUrl?: string;
  studentId?: string;
};

export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  receiptNumber?: string;
  schoolId?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  date: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  targetAudience: 'all_admins' | 'school_users' | 'specific_users' | 'specific_role';
  targetUserIds?: string[];
  targetRole?: string;
  schoolId?: string;
};

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  timestamp: string;
  details?: string;
};

export interface SchoolSettings {
  republica: string;
  governoProvincia: string;
  administracaoMunicipal: string;
  direccaoMunicipal: string;
  nomeEscola: string;
  anoLectivo: string;
  directorName?: string;
  subdirectorName?: string;
  insigniaUrl?: string;
  carimboUrl?: string;
}

export type PedagogicalCriteria = {
  id: string;
  schoolId: string;
  subsystem: 'Ensino Geral' | 'Ensino Secundário Técnico-Profissional' | 'Formação de Professores' | 'Educação de Adultos (EJA)';
  educationLevel: 'Ensino Primário' | 'Iº Ciclo do Ensino Secundário' | 'IIº Ciclo do Ensino Secundário' | 'Ensino Técnico-Profissional' | 'Educação de Adultos (EJA)';
  levelOrClass: string;
  course?: string;
  academicYear: string;
  evaluationPeriod: 'Anual / Final' | '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | 'Exames';
  curriculumPlan: string;
  isActive?: boolean;
  activatedAt?: string;
  
  // 1. Critérios de Aprovação
  approval: {
    minGeneralAverage: number;
    minSubjectGrade: number;
    maxDeficienciesAllowed: number;
    directApprovalConditions: string;
    examApprovalConditions: string;
    recursoApprovalConditions: string;
    roundingRule: 'matematico' | 'truncatura' | 'teto';
    minAttendancePercentage: number;
    maxUnjustifiedAbsences: number;
  };

  // 2. Critérios de Reprovação
  reprobation: {
    belowMinAverageReprobes: boolean;
    maxNegativeSubjectsToReprove: number;
    criticalSubjects: string[];
    examFailConditions: string;
    recursoFailConditions: string;
    failByAbsences: boolean;
    maxAbsencePercentage: number;
  };

  // 3. Critérios de Transição
  transition: {
    allowsConditionalTransition: boolean;
    maxDeficienciesForTransition: number;
    terminalClassesNoTransition: string[];
    deficiencyResolutionDeadline: string;
    notes: string;
  };

  // 4. Critérios de Desistência
  abandonment: {
    riskAbsenceCount: number;
    riskConsecutiveDays: number;
    confirmedDropAbsenceCount: number;
    notifyGuardiansOnRisk: boolean;
    administrativeConfirmationRequired: boolean;
  };

  // 5. Exames de Recurso
  recurso: {
    eligibleClasses: string[];
    eligibleSubjectsType: 'all' | 'specific';
    eligibleSubjects: string[];
    minAccessGrade: number;
    maxAccessGrade: number;
    maxSubjectsAllowed: number;
    finalGradeFormula: 'recurso_direct' | 'ponderada_40_60' | 'media_simples';
    minPassingGrade: number;
    definitiveFailConditions: string;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
  };

  updatedAt: string;
  updatedBy: string;
  updatedByEmail: string;
  version: number;
};

export type CriteriaHistoryLog = {
  id: string;
  schoolId: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  userRole: string;
  summary: string;
  details: string;
  criteriaSnapshot: PedagogicalCriteria;
};


