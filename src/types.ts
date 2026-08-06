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
  period: '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | 'Exame';
  type: 'MAC' | 'NPT' | 'AC1' | 'AC2' | 'AC3';
  value: number;
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

