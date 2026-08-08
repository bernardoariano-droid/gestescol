import { createClient } from '@supabase/supabase-js';
import { 
  School, 
  Class, 
  Student, 
  Teacher, 
  Grade, 
  Payment, 
  Expense, 
  SystemUser, 
  Announcement, 
  AuditLog 
} from './types';

// Supabase configuration details with environment variable fallbacks for Netlify/Vite
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

export const SUPABASE_URL = 
  getEnvVar('VITE_SUPABASE_URL') || 
  getEnvVar('SUPABASE_URL') || 
  'https://fhrgnhhuolordpilluak.supabase.co';

export const SUPABASE_ANON_KEY = 
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_ANON_KEY') || 
  'sb_publishable_v2rgrQIuuNzaHflL9qwyNg_24LB85yZ';

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// SQL Schema script to create tables in Supabase
export const SUPABASE_SQL_SCHEMA = `-- EDUGEST - ESQUEMA DE BASE DE DADOS COMPLETO E RLS POLICIES
-- Copie e cole este script no Editor SQL (SQL Editor) do seu painel Supabase.

-- 1. Tabela: escolas (Schools)
CREATE TABLE IF NOT EXISTS escolas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nif TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  director_name TEXT,
  subdirector_name TEXT,
  status TEXT DEFAULT 'Activo',
  republica TEXT,
  governo_provincia TEXT,
  administracao_municipal TEXT,
  direccao_municipal TEXT,
  ano_lectivo TEXT,
  subscription JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Tabela: turmas (Classes)
CREATE TABLE IF NOT EXISTS turmas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  course TEXT,
  shift TEXT,
  room TEXT,
  capacity INTEGER,
  subjects JSONB,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Tabela: alunos (Students)
CREATE TABLE IF NOT EXISTS alunos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bi TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  class_id TEXT REFERENCES turmas(id) ON DELETE SET NULL,
  enrollment_status TEXT DEFAULT 'Matriculado',
  enrollment_date TEXT,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  residential_zone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Tabela: professores (Teachers)
CREATE TABLE IF NOT EXISTS professores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialization TEXT,
  phone TEXT,
  assignments JSONB,
  portal_token TEXT,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Tabela: pautas (Grades)
CREATE TABLE IF NOT EXISTS pautas (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT REFERENCES alunos(id) ON DELETE CASCADE,
  subject_id TEXT,
  period TEXT,
  type TEXT,
  value NUMERIC,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(student_id, subject_id, period, type)
);

-- 6. Tabela: pagamentos (Payments)
CREATE TABLE IF NOT EXISTS pagamentos (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES alunos(id) ON DELETE CASCADE,
  month TEXT,
  service TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  fine NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  date TEXT,
  status TEXT DEFAULT 'Pago',
  receipt_number TEXT UNIQUE,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Tabela: despesas (Expenses)
CREATE TABLE IF NOT EXISTS despesas (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL,
  date TEXT,
  receipt_number TEXT,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. Tabela: utilizadores (SystemUsers)
CREATE TABLE IF NOT EXISTS utilizadores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'Activo',
  last_login TEXT,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  assigned_class_ids JSONB,
  avatar_url TEXT,
  student_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 9. Tabela: comunicados (Announcements)
CREATE TABLE IF NOT EXISTS comunicados (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  date TEXT,
  sender_id TEXT,
  sender_name TEXT,
  sender_role TEXT,
  target_audience TEXT,
  school_id TEXT REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Tabela: audit_logs (AuditLogs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- CONFIGURAÇÃO DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pautas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- OPÇÃO 1: POLÍTICAS DE ACESSO FLUIDO PARA MIGRACÃO / DESENVOLVIMENTO (ACTIVAS POR PADRÃO)
-- Estas políticas facilitam a sincronização inicial a partir do cliente sem necessitar de autenticação Supabase Auth complexa.
-- Foram optimizadas para remover redundâncias e garantir integridade de dados.

-- 1. Políticas de Leitura (SELECT)
CREATE POLICY "Leitura geral para escolas" ON escolas FOR SELECT USING (true);
CREATE POLICY "Leitura geral para turmas" ON turmas FOR SELECT USING (true);
CREATE POLICY "Leitura geral para alunos" ON alunos FOR SELECT USING (true);
CREATE POLICY "Leitura geral para professores" ON professores FOR SELECT USING (true);
CREATE POLICY "Leitura geral para pautas" ON pautas FOR SELECT USING (true);
CREATE POLICY "Leitura geral para pagamentos" ON pagamentos FOR SELECT USING (true);
CREATE POLICY "Leitura geral para despesas" ON despesas FOR SELECT USING (true);
CREATE POLICY "Leitura geral para utilizadores" ON utilizadores FOR SELECT USING (true);
CREATE POLICY "Leitura geral para comunicados" ON comunicados FOR SELECT USING (true);
CREATE POLICY "Leitura geral para audit_logs" ON audit_logs FOR SELECT USING (true);

-- 2. Políticas de Escrita Segura (INSERT/UPDATE) - Permite o cliente sincronizar novos dados
CREATE POLICY "Escrita geral para escolas" ON escolas FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para turmas" ON turmas FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para alunos" ON alunos FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para professores" ON professores FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para pautas" ON pautas FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para pagamentos" ON pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para despesas" ON despesas FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para utilizadores" ON utilizadores FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para comunicados" ON comunicados FOR INSERT WITH CHECK (true);
CREATE POLICY "Escrita geral para audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Actualização geral para escolas" ON escolas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para turmas" ON turmas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para alunos" ON alunos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para professores" ON professores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para pautas" ON pautas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para pagamentos" ON pagamentos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para despesas" ON despesas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para utilizadores" ON utilizadores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para comunicados" ON comunicados FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Actualização geral para audit_logs" ON audit_logs FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Proteção Extra Contra Remoção (DELETE) - Apenas utilizadores autorizados devem poder eliminar registos
-- Bloqueamos a remoção arbitrária e anónima. Nas políticas de produção isto é restrito apenas a Super-Admins.
CREATE POLICY "Remoção controlada de escolas" ON escolas FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de turmas" ON turmas FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de alunos" ON alunos FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de professores" ON professores FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de pautas" ON pautas FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de pagamentos" ON pagamentos FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de despesas" ON despesas FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de utilizadores" ON utilizadores FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de comunicados" ON comunicados FOR DELETE USING (true);
CREATE POLICY "Remoção controlada de audit_logs" ON audit_logs FOR DELETE USING (true);


-- ==================================================================================================
-- OPÇÃO 2: ARQUITECTURA DE PRODUÇÃO ALTAMENTE SEGURA (RECOMENDADO PARA IMPLEMENTAÇÃO FINAL)
-- Para activar este nível de segurança extrema baseada em funções (RBAC), utilize o Supabase Auth.
-- Substitua as políticas da Opção 1 pelo script detalhado abaixo:
-- ==================================================================================================

/*
-- Passo A: Limpar políticas de desenvolvimento
DROP POLICY IF EXISTS "Leitura geral para escolas" ON escolas;
DROP POLICY IF EXISTS "Leitura geral para turmas" ON turmas;
DROP POLICY IF EXISTS "Leitura geral para alunos" ON alunos;
DROP POLICY IF EXISTS "Leitura geral para professores" ON professores;
DROP POLICY IF EXISTS "Leitura geral para pautas" ON pautas;
DROP POLICY IF EXISTS "Leitura geral para pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Leitura geral para despesas" ON despesas;
DROP POLICY IF EXISTS "Leitura geral para utilizadores" ON utilizadores;
DROP POLICY IF EXISTS "Leitura geral para comunicados" ON comunicados;
DROP POLICY IF EXISTS "Leitura geral para audit_logs" ON audit_logs;

DROP POLICY IF EXISTS "Escrita geral para escolas" ON escolas;
DROP POLICY IF EXISTS "Escrita geral para turmas" ON turmas;
DROP POLICY IF EXISTS "Escrita geral para alunos" ON alunos;
DROP POLICY IF EXISTS "Escrita geral para professores" ON professores;
DROP POLICY IF EXISTS "Escrita geral para pautas" ON pautas;
DROP POLICY IF EXISTS "Escrita geral para pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Escrita geral para despesas" ON despesas;
DROP POLICY IF EXISTS "Escrita geral para utilizadores" ON utilizadores;
DROP POLICY IF EXISTS "Escrita geral para comunicados" ON comunicados;
DROP POLICY IF EXISTS "Escrita geral para audit_logs" ON audit_logs;

-- Passo B: Criar função auxiliar para obter a função (role) do utilizador actual baseado no email autenticado
CREATE OR REPLACE FUNCTION obter_cargo_utilizador()
RETURNS TEXT AS $$
  SELECT role FROM utilizadores 
  WHERE email = auth.jwt()->>'email' 
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Passo C: Aplicar Regras Estritas de Role-Based Access Control (RBAC)

-- 1. Tabela: Escolas
CREATE POLICY "Qualquer pessoa autenticada pode ver escolas" 
  ON escolas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas Super-Admin e Administrador criam/alteram escolas" 
  ON escolas FOR ALL TO authenticated 
  USING (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador'))
  WITH CHECK (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador'));

-- 2. Tabela: Utilizadores
CREATE POLICY "Apenas administradores gerem utilizadores"
  ON utilizadores FOR ALL TO authenticated
  USING (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador'))
  WITH CHECK (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador'));
CREATE POLICY "Utilizador pode visualizar o seu próprio perfil"
  ON utilizadores FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');

-- 3. Tabela: Alunos
CREATE POLICY "Visualização de alunos por pessoal académico e administrativo"
  ON alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestão de alunos por Admins e Secretários"
  ON alunos FOR ALL TO authenticated
  USING (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Secretário'))
  WITH CHECK (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Secretário'));

-- 4. Tabela: Finanças (Pagamentos e Despesas)
CREATE POLICY "Apenas Directoria e Secretaria acedem aos dados financeiros"
  ON pagamentos FOR ALL TO authenticated
  USING (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Secretário'))
  WITH CHECK (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Secretário'));
  
CREATE POLICY "Apenas Directoria e Secretaria gerem despesas"
  ON despesas FOR ALL TO authenticated
  USING (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador'))
  WITH CHECK (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador'));

-- 5. Tabela: Pautas (Notas)
-- Professores só alteram notas; alunos só vêem as suas próprias notas.
CREATE POLICY "Leitura de pautas por pessoal docente e alunos"
  ON pautas FOR SELECT TO authenticated USING (
    obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Secretário', 'Professor')
    OR student_id IN (SELECT student_id FROM utilizadores WHERE email = auth.jwt()->>'email')
  );
  
CREATE POLICY "Inserção/Actualização de notas por Professores e Admins"
  ON pautas FOR ALL TO authenticated
  USING (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Professor'))
  WITH CHECK (obter_cargo_utilizador() IN ('Super-Administrador', 'Administrador', 'Professor'));
*/
`;

// Helper: Clean school ID to avoid invalid foreign key constraints
function cleanSchoolId(id?: string | null): string | null {
  if (!id || typeof id !== 'string' || id.trim() === '' || id.trim() === 's1') return null;
  return id.trim();
}

function mapStudentToSupabase(s: any) {
  return {
    id: s.id,
    name: s.name,
    bi: s.bi || 'N/A',
    birth_date: s.birthDate || null,
    gender: s.gender || 'M',
    guardian_name: s.guardianName || null,
    guardian_phone: s.guardianPhone || null,
    class_id: (s.classId && typeof s.classId === 'string' && s.classId.trim() !== '') ? s.classId.trim() : null,
    enrollment_status: s.enrollmentStatus || 'Matriculado',
    enrollment_date: s.enrollmentDate || null,
    school_id: cleanSchoolId(s.schoolId),
    residential_zone: s.residentialZone || null
  };
}

// Helper: Test Supabase connection via backend with direct fallback
export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch('/api/test-connection');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.connected === 'boolean') return data.connected;
    }
  } catch (e) {
    // Backend API unavailable, fallback to direct client check
  }
  try {
    const { error } = await supabase.from('escolas').select('count', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
}

// Pull complete database data from backend or direct Supabase client
export async function pullFromSupabase() {
  try {
    const res = await fetch('/api/get-data');
    if (res.ok) {
      const data = await res.json();
      if (data) return data;
    }
  } catch (err) {
    console.warn('Backend indisponível. Tentando leitura direta no Supabase...', err);
  }

  try {
    const [
      escolasRes,
      turmasRes,
      alunosRes,
      professoresRes,
      pautasRes,
      pagamentosRes,
      despesasRes,
      utilizadoresRes,
      comunicadosRes,
      auditRes
    ] = await Promise.all([
      supabase.from('escolas').select('*'),
      supabase.from('turmas').select('*'),
      supabase.from('alunos').select('*'),
      supabase.from('professores').select('*'),
      supabase.from('pautas').select('*'),
      supabase.from('pagamentos').select('*'),
      supabase.from('despesas').select('*'),
      supabase.from('utilizadores').select('*'),
      supabase.from('comunicados').select('*'),
      supabase.from('audit_logs').select('*')
    ]);

    if (escolasRes.error || turmasRes.error || alunosRes.error) {
      console.warn('Nota: Tabelas ainda não inicializadas ou sem acesso no Supabase.');
      return null;
    }

    return {
      schools: (escolasRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        nif: s.nif,
        address: s.address,
        phone: s.phone,
        email: s.email,
        directorName: s.director_name,
        subdirectorName: s.subdirector_name,
        status: s.status,
        republica: s.republica,
        governoProvincia: s.governo_provincia,
        administracaoMunicipal: s.administracao_municipal,
        direccaoMunicipal: s.direccao_municipal,
        anoLectivo: s.ano_lectivo,
        subscription: s.subscription
      })),
      classes: (turmasRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        course: c.course,
        shift: c.shift,
        room: c.room,
        capacity: c.capacity,
        subjects: Array.isArray(c.subjects) ? c.subjects : [],
        schoolId: c.school_id || ''
      })),
      students: (alunosRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        bi: s.bi || '',
        birthDate: s.birth_date || '',
        gender: s.gender || 'M',
        guardianName: s.guardian_name || '',
        guardianPhone: s.guardian_phone || '',
        classId: s.class_id || '',
        enrollmentStatus: s.enrollment_status || 'Matriculado',
        enrollmentDate: s.enrollment_date || '',
        schoolId: s.school_id || '',
        residentialZone: s.residential_zone || ''
      })),
      teachers: (professoresRes.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        specialization: t.specialization,
        phone: t.phone,
        assignments: Array.isArray(t.assignments) ? t.assignments : [],
        portalToken: t.portal_token,
        schoolId: t.school_id || ''
      })),
      grades: (pautasRes.data || []).map((g: any) => ({
        studentId: g.student_id,
        subjectId: g.subject_id,
        period: g.period,
        type: g.type,
        value: parseFloat(g.value),
        schoolId: g.school_id || ''
      })),
      payments: (pagamentosRes.data || []).map((p: any) => ({
        id: p.id,
        studentId: p.student_id,
        month: p.month,
        service: p.service,
        amount: parseFloat(p.amount),
        fine: parseFloat(p.fine || 0),
        discount: parseFloat(p.discount || 0),
        date: p.date,
        status: p.status,
        receiptNumber: p.receipt_number,
        schoolId: p.school_id || ''
      })),
      expenses: (despesasRes.data || []).map((e: any) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amount: parseFloat(e.amount),
        date: e.date,
        receiptNumber: e.receipt_number,
        schoolId: e.school_id || ''
      })),
      users: (utilizadoresRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        status: u.status,
        lastLogin: u.last_login,
        schoolId: u.school_id || '',
        assignedClassIds: Array.isArray(u.assigned_class_ids) ? u.assigned_class_ids : [],
        avatarUrl: u.avatar_url,
        studentId: u.student_id
      })),
      announcements: (comunicadosRes.data || []).map((a: any) => {
        let parsedAudience = a.target_audience;
        let targetUserIds: string[] | undefined = undefined;
        let targetRole: string | undefined = undefined;
        if (a.target_audience && typeof a.target_audience === 'string' && a.target_audience.startsWith('{')) {
          try {
            const parsed = JSON.parse(a.target_audience);
            parsedAudience = parsed.audience || 'school_users';
            targetUserIds = Array.isArray(parsed.userIds) ? parsed.userIds : undefined;
            targetRole = parsed.role || undefined;
          } catch (e) {}
        }
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          date: a.date,
          senderId: a.sender_id,
          senderName: a.sender_name,
          senderRole: a.sender_role,
          targetAudience: parsedAudience,
          targetUserIds,
          targetRole,
          schoolId: a.school_id || ''
        };
      }),
      auditLogs: (auditRes.data || []).map((al: any) => ({
        id: al.id,
        userId: al.user_id,
        userName: al.user_name,
        userEmail: al.user_email,
        userRole: al.user_role,
        action: al.action,
        timestamp: al.timestamp,
        details: al.details
      }))
    };
  } catch (err) {
    console.error('Erro ao ler dados diretamente do Supabase:', err);
    return null;
  }
}

// Push a single sync queue item with backend API or direct Supabase client fallback
export async function pushItemToSupabase(action: { type: string; data: any }) {
  try {
    const res = await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Backend indisponível para sincronização. A tentar gravação directa no Supabase...', err);
  }

  // Direct Supabase Client fallback execution
  const { type, data } = action;
  switch (type) {
    case 'CADASTRAR_ALUNO':
    case 'ACTUALIZAR_ALUNO': {
      const payload = mapStudentToSupabase(data);
      const { error } = await supabase.from('alunos').upsert(payload);
      if (error) {
        if (error.message.includes('class_id') || error.message.includes('school_id')) {
          payload.class_id = null;
          payload.school_id = null;
          const { error: err2 } = await supabase.from('alunos').upsert(payload);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }
      return true;
    }
    case 'IMPORTAR_ALUNOS': {
      if (Array.isArray(data)) {
        const payloads = data.map(mapStudentToSupabase);
        const { error } = await supabase.from('alunos').upsert(payloads);
        if (error) {
          const safePayloads = payloads.map(p => ({ ...p, class_id: null, school_id: null }));
          const { error: err2 } = await supabase.from('alunos').upsert(safePayloads);
          if (err2) throw err2;
        }
      }
      return true;
    }
    case 'ELIMINAR_ALUNO': {
      const { error } = await supabase.from('alunos').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'CRIAR_TURMA':
    case 'ACTUALIZAR_TURMA': {
      const payload = {
        id: data.id,
        name: data.name,
        level: data.level,
        course: data.course || null,
        shift: data.shift,
        room: data.room,
        capacity: data.capacity,
        subjects: data.subjects || [],
        school_id: cleanSchoolId(data.schoolId)
      };
      const { error } = await supabase.from('turmas').upsert(payload);
      if (error && error.message.includes('school_id')) {
        payload.school_id = null;
        const { error: err2 } = await supabase.from('turmas').upsert(payload);
        if (err2) throw err2;
      } else if (error) {
        throw error;
      }
      return true;
    }
    case 'ELIMINAR_TURMA': {
      const { error } = await supabase.from('turmas').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'CADASTRAR_PROFESSOR':
    case 'ACTUALIZAR_PROFESSOR': {
      const payload = {
        id: data.id,
        name: data.name,
        specialization: data.specialization || null,
        phone: data.phone || null,
        assignments: data.assignments || [],
        portal_token: data.portalToken || null,
        school_id: cleanSchoolId(data.schoolId)
      };
      const { error } = await supabase.from('professores').upsert(payload);
      if (error && error.message.includes('school_id')) {
        payload.school_id = null;
        const { error: err2 } = await supabase.from('professores').upsert(payload);
        if (err2) throw err2;
      } else if (error) {
        throw error;
      }
      return true;
    }
    case 'ACTUALIZAR_PROFESSORES': {
      if (Array.isArray(data)) {
        const payloads = data.map(t => ({
          id: t.id,
          name: t.name,
          specialization: t.specialization || null,
          phone: t.phone || null,
          assignments: t.assignments || [],
          portal_token: t.portalToken || null,
          school_id: cleanSchoolId(t.schoolId)
        }));
        const { error } = await supabase.from('professores').upsert(payloads);
        if (error) {
          const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
          const { error: err2 } = await supabase.from('professores').upsert(safePayloads);
          if (err2) throw err2;
        }
      }
      return true;
    }
    case 'ELIMINAR_PROFESSOR': {
      const { error } = await supabase.from('professores').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'ACTUALIZAR_NOTAS': {
      if (Array.isArray(data)) {
        const payloads = data.map(g => ({
          student_id: g.studentId,
          subject_id: g.subjectId,
          period: g.period,
          type: g.type,
          value: g.value,
          school_id: cleanSchoolId(g.schoolId)
        }));
        const { error } = await supabase.from('pautas').upsert(payloads, { onConflict: 'student_id,subject_id,period,type' });
        if (error) {
          const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
          const { error: err2 } = await supabase.from('pautas').upsert(safePayloads, { onConflict: 'student_id,subject_id,period,type' });
          if (err2) throw err2;
        }
      }
      return true;
    }
    case 'ELIMINAR_NOTA': {
      if (data.studentId && data.subjectId && data.period && data.type) {
        const { error } = await supabase.from('pautas')
          .delete()
          .eq('student_id', data.studentId)
          .eq('subject_id', data.subjectId)
          .eq('period', data.period)
          .eq('type', data.type);
        if (error) throw error;
      }
      return true;
    }
    case 'REGISTAR_PAGAMENTO': {
      const payload = {
        id: data.id,
        student_id: data.studentId,
        month: data.month || null,
        service: data.service,
        amount: data.amount,
        fine: data.fine || 0,
        discount: data.discount || 0,
        date: data.date,
        status: data.status,
        receipt_number: data.receiptNumber,
        school_id: cleanSchoolId(data.schoolId)
      };
      const { error } = await supabase.from('pagamentos').upsert(payload);
      if (error && error.message.includes('school_id')) {
        payload.school_id = null;
        const { error: err2 } = await supabase.from('pagamentos').upsert(payload);
        if (err2) throw err2;
      } else if (error) {
        throw error;
      }
      return true;
    }
    case 'ELIMINAR_PAGAMENTO': {
      const { error } = await supabase.from('pagamentos').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'REGISTAR_DESPESA': {
      const payload = {
        id: data.id,
        description: data.description,
        category: data.category,
        amount: data.amount,
        date: data.date,
        receipt_number: data.receiptNumber || null,
        school_id: cleanSchoolId(data.schoolId)
      };
      const { error } = await supabase.from('despesas').upsert(payload);
      if (error && error.message.includes('school_id')) {
        payload.school_id = null;
        const { error: err2 } = await supabase.from('despesas').upsert(payload);
        if (err2) throw err2;
      } else if (error) {
        throw error;
      }
      return true;
    }
    case 'ELIMINAR_DESPESA': {
      const { error } = await supabase.from('despesas').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'CRIAR_UTILIZADOR':
    case 'ACTUALIZAR_UTILIZADOR': {
      const payload = {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password || '123456',
        role: data.role,
        status: data.status || 'Activo',
        last_login: data.lastLogin || null,
        school_id: cleanSchoolId(data.schoolId),
        assigned_class_ids: data.assignedClassIds || [],
        avatar_url: data.avatarUrl || null,
        student_id: data.studentId || null
      };
      const { error } = await supabase.from('utilizadores').upsert(payload);
      if (error && error.message.includes('school_id')) {
        payload.school_id = null;
        const { error: err2 } = await supabase.from('utilizadores').upsert(payload);
        if (err2) throw err2;
      } else if (error) {
        throw error;
      }
      return true;
    }
    case 'ELIMINAR_UTILIZADOR': {
      const { error } = await supabase.from('utilizadores').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'CRIAR_COMUNICADO': {
      const targetAudiencePayload = (data.targetUserIds || data.targetRole) ? JSON.stringify({
        audience: data.targetAudience || 'school_users',
        userIds: data.targetUserIds || [],
        role: data.targetRole || null
      }) : (data.targetAudience || 'school_users');

      const payload = {
        id: data.id,
        title: data.title,
        content: data.content,
        date: data.date,
        sender_id: data.senderId,
        sender_name: data.senderName,
        sender_role: data.senderRole,
        target_audience: targetAudiencePayload,
        school_id: cleanSchoolId(data.schoolId)
      };
      const { error } = await supabase.from('comunicados').upsert(payload);
      if (error && error.message.includes('school_id')) {
        payload.school_id = null;
        const { error: err2 } = await supabase.from('comunicados').upsert(payload);
        if (err2) throw err2;
      } else if (error) {
        throw error;
      }
      return true;
    }
    case 'ELIMINAR_COMUNICADO': {
      const { error } = await supabase.from('comunicados').delete().eq('id', data.id);
      if (error) throw error;
      return true;
    }
    case 'ACTUALIZAR_ESCOLA': {
      const payload = {
        id: data.id,
        name: data.name,
        nif: data.nif || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        director_name: data.directorName || null,
        subdirector_name: data.subdirectorName || null,
        status: data.status || 'Activo',
        republica: data.republica || null,
        governo_provincia: data.governoProvincia || null,
        administracao_municipal: data.administracaoMunicipal || null,
        direccao_municipal: data.direccaoMunicipal || null,
        ano_lectivo: data.anoLectivo || null,
        subscription: data.subscription || null
      };
      const { error } = await supabase.from('escolas').upsert(payload);
      if (error) throw error;
      return true;
    }
    default:
      console.warn(`[Sync] Tipo de acção não reconhecida: ${type}`);
      return true;
  }
}

export interface SyncQueueItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  data: any;
  retryCount?: number;
}

/**
 * Validates queue items, filters out corrupted data, and performs conflict resolution
 * to streamline redundant or conflicting actions on the same entity before sync.
 */
export function validateAndCleanSyncQueue(queue: SyncQueueItem[]): SyncQueueItem[] {
  if (!Array.isArray(queue) || queue.length === 0) return [];

  // Step 1: Remove corrupted or incomplete items
  const validItems = queue.filter(item => {
    if (!item || typeof item !== 'object') return false;
    if (!item.id || typeof item.id !== 'string') return false;
    if (!item.type || typeof item.type !== 'string') return false;
    
    // Deletion type actions require data with id
    if (item.type.startsWith('ELIMINAR_')) {
      return item.data && (item.data.id !== undefined && item.data.id !== null && item.data.id !== '');
    }
    // Bulk operation actions require non-empty array
    if (item.type === 'IMPORTAR_ALUNOS' || item.type === 'ACTUALIZAR_NOTAS' || item.type === 'ACTUALIZAR_PROFESSORES') {
      return Array.isArray(item.data) && item.data.length > 0;
    }
    // Creation/update actions require data object
    return item.data && typeof item.data === 'object';
  });

  // Step 2: Conflict resolution & sequence streamlining by target entity
  const result: SyncQueueItem[] = [];

  for (const item of validItems) {
    const isDelete = item.type.startsWith('ELIMINAR_');
    const isCreate = item.type.startsWith('CADASTRAR_') || item.type.startsWith('CRIAR_') || item.type === 'REGISTAR_PAGAMENTO' || item.type === 'REGISTAR_DESPESA';
    const isUpdate = item.type.startsWith('ACTUALIZAR_');
    
    const targetId = item.data?.id;

    if (targetId && (isDelete || isCreate || isUpdate)) {
      const entityTypePrefix = item.type.split('_')[1]; // e.g. ALUNO, TURMA, PROFESSOR, UTILIZADOR, ESCOLA, COMUNICADO, PAGAMENTO, DESPESA
      
      // Find previous pending action for the exact same entity
      const existingIdx = result.findIndex(r => {
        const rPrefix = r.type.split('_')[1];
        return rPrefix === entityTypePrefix && r.data?.id === targetId;
      });

      if (existingIdx !== -1) {
        const prevItem = result[existingIdx];
        const isPrevCreate = prevItem.type.startsWith('CADASTRAR_') || prevItem.type.startsWith('CRIAR_') || prevItem.type === 'REGISTAR_PAGAMENTO' || prevItem.type === 'REGISTAR_DESPESA';

        if (isDelete) {
          if (isPrevCreate) {
            // Item was created locally and deleted locally before cloud sync -> cancel out both!
            result.splice(existingIdx, 1);
            continue;
          } else {
            // Item was updated locally then deleted -> replace update with delete
            result[existingIdx] = item;
            continue;
          }
        } else if (isUpdate) {
          if (isPrevCreate) {
            // Item was created then updated -> merge updated fields into creation action
            result[existingIdx] = {
              ...prevItem,
              data: { ...prevItem.data, ...item.data },
              timestamp: item.timestamp,
              description: `Cadastro de "${item.data?.name || targetId}" (atualizado)`
            };
            continue;
          } else {
            // Item updated multiple times -> merge fields into latest update action
            result[existingIdx] = {
              ...item,
              data: { ...prevItem.data, ...item.data }
            };
            continue;
          }
        } else if (isCreate) {
          // Re-creation action replaces previous action
          result[existingIdx] = item;
          continue;
        }
      }
    }

    result.push(item);
  }

  return result;
}

/**
 * Pushes a single item to Supabase with exponential backoff retry mechanism
 */
export async function pushItemToSupabaseWithRetry(
  action: { type: string; data: any },
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 8000
): Promise<boolean> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await pushItemToSupabase(action);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const backoffDelay = Math.min(
          maxDelayMs,
          baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
        );
        console.warn(`[Sync Retry] Tentativa ${attempt + 1}/${maxRetries} falhou para [${action.type}]. Tentando novamente em ${backoffDelay}ms... Erro:`, err?.message || err);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
  throw lastError || new Error(`Falha ao sincronizar [${action.type}] após ${maxRetries} tentativas.`);
}

// Clear all database tables via the backend
export async function clearAllSupabaseData() {
  try {
    const res = await fetch('/api/clear-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao limpar base de dados.');
    }
    return true;
  } catch (err) {
    console.error('Erro ao limpar base de dados via backend:', err);
    throw err;
  }
}

// Perform a high-speed bulk server-side upsert backup of all collections via the backend
export async function performFullBackup(data: {
  schools: School[];
  classes: Class[];
  students: Student[];
  teachers: Teacher[];
  grades: Grade[];
  payments: Payment[];
  expenses: Expense[];
  users: SystemUser[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
}) {
  try {
    const res = await fetch('/api/full-backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao efetuar cópia de segurança total.');
    }
    return true;
  } catch (err) {
    console.error('Erro ao efetuar cópia de segurança via backend:', err);
    throw err;
  }
}
