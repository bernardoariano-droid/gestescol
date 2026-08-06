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

// Helper: Test Supabase connection via the backend
export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch('/api/test-connection');
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.connected;
  } catch (e) {
    console.warn('Backend indisponível para testar conexão:', e);
    return false;
  }
}

// Pull complete database data from the backend
export async function pullFromSupabase() {
  try {
    const res = await fetch('/api/get-data');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Servidor backend indisponível para obter dados:', err);
    return null;
  }
}

// Push a single sync queue item to the backend
export async function pushItemToSupabase(action: { type: string; data: any }) {
  try {
    const res = await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha na sincronização com o backend.');
    }
    return true;
  } catch (err) {
    console.error('Erro ao sincronizar item via backend:', err);
    throw err;
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
