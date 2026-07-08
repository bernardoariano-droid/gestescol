import { Student, Class, Teacher, Payment, SystemUser, Expense, School } from './types';

export const INITIAL_SCHOOLS: School[] = [
  {
    id: 's1',
    name: 'Escola Primária e Secundária do Waku-Kungo',
    nif: '500123456',
    address: 'Waku-Kungo, Cuanza-Sul',
    phone: '923000001',
    email: 'escola.waku@edugest.ao',
    directorName: 'Matos Enoque António',
    subdirectorName: 'Mariano Quimbulo Baptista',
    status: 'Activo',
    republica: 'República de Angola',
    governoProvincia: 'Governo da Província do Cuanza-Sul',
    administracaoMunicipal: 'Administração Municipal do Waku-Kungo',
    direccaoMunicipal: 'Direcção Municipal da Educação',
    anoLectivo: '2023/2024'
  },
  {
    id: 's2',
    name: 'Escola Pré-Universitária de Luanda (PUNIV)',
    nif: '500123999',
    address: 'Ingombota, Luanda',
    phone: '911222333',
    email: 'escola.puniv@edugest.ao',
    directorName: 'António Francisco',
    subdirectorName: 'Maria Domingos',
    status: 'Activo',
    republica: 'República de Angola',
    governoProvincia: 'Governo da Província de Luanda',
    administracaoMunicipal: 'Administração Municipal de Luanda',
    direccaoMunicipal: 'Direcção Provincial da Educação de Luanda',
    anoLectivo: '2023/2024'
  }
];

export const INITIAL_CLASSES: Class[] = [
  // Ensino Primário
  { id: 'p1a', name: '1ª Classe - A', level: '1ª Classe', shift: 'Manhã', room: 'Sala 01', capacity: 35, schoolId: 's1' },
  { id: 'p1b', name: '1ª Classe - B', level: '1ª Classe', shift: 'Manhã', room: 'Sala 02', capacity: 35, schoolId: 's1' },
  { id: 'p1c', name: '1ª Classe - C', level: '1ª Classe', shift: 'Tarde', room: 'Sala 01', capacity: 35, schoolId: 's1' },
  { id: 'p1d', name: '1ª Classe - D', level: '1ª Classe', shift: 'Tarde', room: 'Sala 02', capacity: 35, schoolId: 's1' },
  
  { id: 'p2a', name: '2ª Classe - A', level: '2ª Classe', shift: 'Manhã', room: 'Sala 03', capacity: 35, schoolId: 's1' },
  { id: 'p2b', name: '2ª Classe - B', level: '2ª Classe', shift: 'Manhã', room: 'Sala 04', capacity: 35, schoolId: 's1' },
  { id: 'p2c', name: '2ª Classe - C', level: '2ª Classe', shift: 'Tarde', room: 'Sala 03', capacity: 35, schoolId: 's1' },
  { id: 'p2d', name: '2ª Classe - D', level: '2ª Classe', shift: 'Tarde', room: 'Sala 04', capacity: 35, schoolId: 's1' },
  
  { id: 'p3a', name: '3ª Classe - A', level: '3ª Classe', shift: 'Manhã', room: 'Sala 05', capacity: 35, schoolId: 's1' },
  { id: 'p3b', name: '3ª Classe - B', level: '3ª Classe', shift: 'Manhã', room: 'Sala 06', capacity: 35, schoolId: 's1' },
  { id: 'p3c', name: '3ª Classe - C', level: '3ª Classe', shift: 'Tarde', room: 'Sala 05', capacity: 35, schoolId: 's1' },
  { id: 'p3d', name: '3ª Classe - D', level: '3ª Classe', shift: 'Tarde', room: 'Sala 06', capacity: 35, schoolId: 's1' },
  
  { id: 'p4a', name: '4ª Classe - A', level: '4ª Classe', shift: 'Manhã', room: 'Sala 07', capacity: 35, schoolId: 's1' },
  { id: 'p4b', name: '4ª Classe - B', level: '4ª Classe', shift: 'Manhã', room: 'Sala 08', capacity: 35, schoolId: 's1' },
  { id: 'p4c', name: '4ª Classe - C', level: '4ª Classe', shift: 'Tarde', room: 'Sala 07', capacity: 35, schoolId: 's1' },
  { id: 'p4d', name: '4ª Classe - D', level: '4ª Classe', shift: 'Tarde', room: 'Sala 08', capacity: 35, schoolId: 's1' },
  
  { id: 'p5a', name: '5ª Classe - A', level: '5ª Classe', shift: 'Manhã', room: 'Sala 09', capacity: 35, schoolId: 's1' },
  { id: 'p5b', name: '5ª Classe - B', level: '5ª Classe', shift: 'Manhã', room: 'Sala 10', capacity: 35, schoolId: 's1' },
  { id: 'p5c', name: '5ª Classe - C', level: '5ª Classe', shift: 'Tarde', room: 'Sala 09', capacity: 35, schoolId: 's1' },
  { id: 'p5d', name: '5ª Classe - D', level: '5ª Classe', shift: 'Tarde', room: 'Sala 10', capacity: 35, schoolId: 's1' },
  
  { id: 'p6a', name: '6ª Classe - A', level: '6ª Classe', shift: 'Manhã', room: 'Sala 11', capacity: 35, schoolId: 's1' },
  { id: 'p6b', name: '6ª Classe - B', level: '6ª Classe', shift: 'Manhã', room: 'Sala 12', capacity: 35, schoolId: 's1' },
  { id: 'p6c', name: '6ª Classe - C', level: '6ª Classe', shift: 'Tarde', room: 'Sala 11', capacity: 35, schoolId: 's1' },
  { id: 'p6d', name: '6ª Classe - D', level: '6ª Classe', shift: 'Tarde', room: 'Sala 12', capacity: 35, schoolId: 's1' },

  // I Ciclo do Ensino Secundário
  { id: 'c7', name: '7ª Classe - A', level: '7ª Classe', shift: 'Manhã', room: 'Sala 13', capacity: 40, schoolId: 's1' },
  { id: 'c8', name: '8ª Classe - A', level: '8ª Classe', shift: 'Manhã', room: 'Sala 14', capacity: 40, schoolId: 's1' },
  { id: 'c9', name: '9ª Classe - A', level: '9ª Classe', shift: 'Manhã', room: 'Sala 15', capacity: 40, schoolId: 's1' },

  // EJA - Módulos e Etapas
  { id: 'eja_m1', name: 'EJA - Módulo 1', level: 'EJA', shift: 'Noite', room: 'Sala 16', capacity: 30, schoolId: 's1' },
  { id: 'eja_m2', name: 'EJA - Módulo 2', level: 'EJA', shift: 'Noite', room: 'Sala 17', capacity: 30, schoolId: 's1' },
  { id: 'eja_m3', name: 'EJA - Módulo 3', level: 'EJA', shift: 'Noite', room: 'Sala 18', capacity: 30, schoolId: 's1' },
  { id: 'eja_e1', name: 'EJA - Etapa 1', level: 'EJA', shift: 'Noite', room: 'Sala 19', capacity: 30, schoolId: 's1' },
  { id: 'eja_e2', name: 'EJA - Etapa 2', level: 'EJA', shift: 'Noite', room: 'Sala 20', capacity: 30, schoolId: 's1' },
  { id: 'eja_e3', name: 'EJA - Etapa 3', level: 'EJA', shift: 'Noite', room: 'Sala 21', capacity: 30, schoolId: 's1' },

  // II Ciclo (Existing)
  { id: 'c10', name: '10ª Classe - A', level: '10ª Classe', course: 'Ciências Físicas e Biológicas', shift: 'Manhã', room: 'Sala 22', capacity: 40, schoolId: 's1' },
  { id: 'c11', name: '11ª Classe - A', level: '11ª Classe', course: 'Ciências Jurídicas e Económicas', shift: 'Manhã', room: 'Sala 23', capacity: 35, schoolId: 's1' },
  { id: 'c12', name: '12ª Classe - A', level: '12ª Classe', course: 'Ciências Sociais', shift: 'Manhã', room: 'Sala 24', capacity: 30, schoolId: 's1' },
];

export const INITIAL_TEACHERS: Teacher[] = [
  { 
    id: 't1', 
    name: 'António Manuel', 
    specialization: 'Matemática', 
    phone: '923000111', 
    assignments: [
      { classId: 'p1a', subject: 'Matemática' },
      { classId: 'p2a', subject: 'Matemática' }
    ],
    portalToken: 'token123',
    schoolId: 's1'
  },
  { 
    id: 't2', 
    name: 'Maria José', 
    specialization: 'Língua Portuguesa', 
    phone: '931222333', 
    assignments: [
      { classId: 'p1a', subject: 'Língua Portuguesa' }
    ],
    portalToken: 'token456',
    schoolId: 's1'
  }
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_USERS: SystemUser[] = [
  { id: 'super1', name: 'Super Administrador', email: 'super@edugest.ao', password: 'super', role: 'Super-Administrador', status: 'Activo' },
  { id: 'u1', name: 'Administrador Waku Kungo', email: 'admin@edugest.ao', password: 'admin', role: 'Administrador', status: 'Activo', schoolId: 's1' },
  { id: 'u2', name: 'Secretária Maria', email: 'maria@edugest.ao', password: 'maria', role: 'Secretário', status: 'Activo', schoolId: 's1' },
  { id: 'u3', name: 'Admin PUNIV', email: 'admin.puniv@edugest.ao', password: 'puniv', role: 'Administrador', status: 'Activo', schoolId: 's2' },
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'exp1', description: 'Papelaria e Consumíveis', category: 'Material', amount: 45000, date: '2026-06-15', schoolId: 's1' },
  { id: 'exp2', description: 'Manutenção de Ar Condicionado', category: 'Manutenção', amount: 120000, date: '2026-06-20', schoolId: 's1' },
  { id: 'exp3', description: 'Eletricidade e Água', category: 'Serviços', amount: 85000, date: '2026-06-25', schoolId: 's1' }
];
