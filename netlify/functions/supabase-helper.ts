import { createClient } from '@supabase/supabase-js';

// Supabase configuration details with robust environment variable fallbacks
export const SUPABASE_URL = 
  process.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  'https://fhrgnhhuolordpilluak.supabase.co';

export const SUPABASE_ANON_KEY = 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  'sb_publishable_v2rgrQIuuNzaHflL9qwyNg_24LB85yZ';

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Helper: Clean school ID to avoid invalid foreign key constraints (e.g. 's1')
function cleanSchoolId(id?: string | null): string | null {
  if (!id || typeof id !== 'string' || id.trim() === '' || id.trim() === 's1') return null;
  return id.trim();
}

// Helper: Test Supabase connection
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('escolas').select('count', { count: 'exact', head: true });
    if (error) {
      console.warn('Conexão ao Supabase com erro:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Falha ao ligar ao Supabase:', e);
    return false;
  }
}

// Map Local Student model to Supabase schema format
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

// Map Supabase Student schema format to Local Student model
function mapStudentFromSupabase(s: any) {
  return {
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
  };
}

// Pull complete database data from Supabase
export async function pullFromSupabase() {
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
      schools: (escolasRes.data || []).map(s => ({
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
      classes: (turmasRes.data || []).map(c => ({
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
      students: (alunosRes.data || []).map(mapStudentFromSupabase),
      teachers: (professoresRes.data || []).map(t => ({
        id: t.id,
        name: t.name,
        specialization: t.specialization,
        phone: t.phone,
        assignments: Array.isArray(t.assignments) ? t.assignments : [],
        portalToken: t.portal_token,
        schoolId: t.school_id || ''
      })),
      grades: (pautasRes.data || []).map(g => ({
        studentId: g.student_id,
        subjectId: g.subject_id,
        period: g.period,
        type: g.type,
        value: parseFloat(g.value),
        schoolId: g.school_id || ''
      })),
      payments: (pagamentosRes.data || []).map(p => ({
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
      expenses: (despesasRes.data || []).map(e => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amount: parseFloat(e.amount),
        date: e.date,
        receiptNumber: e.receipt_number,
        schoolId: e.school_id || ''
      })),
      users: (utilizadoresRes.data || []).map(u => ({
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
      announcements: (comunicadosRes.data || []).map(a => {
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
      auditLogs: (auditRes.data || []).map(al => ({
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
    console.error('Erro ao ler dados do Supabase:', err);
    return null;
  }
}

// Push a single sync queue item to Supabase
export async function pushItemToSupabase(action: { type: string; data: any }) {
  try {
    const { type, data } = action;
    
    switch (type) {
      case 'CADASTRAR_ALUNO':
      case 'ACTUALIZAR_ALUNO': {
        const payload = mapStudentToSupabase(data);
        const { error } = await supabase.from('alunos').upsert(payload);
        if (error) {
          // If foreign key constraint failed on class_id or school_id, fallback to null
          if (error.message.includes('class_id') || error.message.includes('school_id')) {
            payload.class_id = null;
            payload.school_id = null;
            const { error: err2 } = await supabase.from('alunos').upsert(payload);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'IMPORTAR_ALUNOS': {
        if (Array.isArray(data)) {
          const payloads = data.map(mapStudentToSupabase);
          const { error } = await supabase.from('alunos').upsert(payloads);
          if (error) {
            // Fallback: clear class_id & school_id if constraints fail
            const safePayloads = payloads.map(p => ({ ...p, class_id: null, school_id: null }));
            const { error: err2 } = await supabase.from('alunos').upsert(safePayloads);
            if (err2) throw err2;
          }
        }
        break;
      }
      case 'ELIMINAR_ALUNO': {
        const { error } = await supabase.from('alunos').delete().eq('id', data.id);
        if (error) throw error;
        break;
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
        break;
      }
      case 'ELIMINAR_TURMA': {
        const { error } = await supabase.from('turmas').delete().eq('id', data.id);
        if (error) throw error;
        break;
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
        break;
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
        break;
      }
      case 'ELIMINAR_PROFESSOR': {
        const { error } = await supabase.from('professores').delete().eq('id', data.id);
        if (error) throw error;
        break;
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
        break;
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
        break;
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
        break;
      }
      case 'ELIMINAR_PAGAMENTO': {
        const { error } = await supabase.from('pagamentos').delete().eq('id', data.id);
        if (error) throw error;
        break;
      }
      case 'REGISTAR_DESPESA':
      case 'ACTUALIZAR_DESPESA': {
        const payload = {
          id: data.id,
          description: data.description,
          category: data.category || null,
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
        break;
      }
      case 'ELIMINAR_DESPESA': {
        const { error } = await supabase.from('despesas').delete().eq('id', data.id);
        if (error) throw error;
        break;
      }
      case 'CADASTRAR_UTILIZADOR':
      case 'ACTUALIZAR_UTILIZADOR': {
        const payload = {
          id: data.id,
          name: data.name,
          email: data.email,
          password: data.password || null,
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
        break;
      }
      case 'ELIMINAR_UTILIZADOR': {
        const { error } = await supabase.from('utilizadores').delete().eq('id', data.id);
        if (error) throw error;
        break;
      }
      case 'CRIAR_ESCOLA':
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
          status: data.status,
          republica: data.republica || null,
          governo_provincia: data.governoProvincia || null,
          administracao_municipal: data.administracaoMunicipal || null,
          direccao_municipal: data.direccaoMunicipal || null,
          ano_lectivo: data.anoLectivo || null,
          subscription: data.subscription || null
        };
        const { error } = await supabase.from('escolas').upsert(payload);
        if (error) throw error;
        break;
      }
      case 'ELIMINAR_ESCOLA': {
        const { error } = await supabase.from('escolas').delete().eq('id', data.id);
        if (error) throw error;
        break;
      }
      case 'CRIAR_COMUNICADO': {
        const targetAudienceValue = (data.targetAudience === 'specific_users' || data.targetAudience === 'specific_role' || (data.targetUserIds && data.targetUserIds.length > 0) || data.targetRole)
          ? JSON.stringify({ audience: data.targetAudience, userIds: data.targetUserIds || [], role: data.targetRole || null })
          : data.targetAudience;

        const payload = {
          id: data.id,
          title: data.title,
          content: data.content || null,
          date: data.date,
          sender_id: data.senderId,
          sender_name: data.senderName,
          sender_role: data.senderRole,
          target_audience: targetAudienceValue,
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
        break;
      }
      case 'ELIMINAR_COMUNICADO': {
        const { error } = await supabase.from('comunicados').delete().eq('id', data.id);
        if (error) throw error;
        break;
      }
      case 'REGISTAR_AUDIT_LOG': {
        const payload = {
          id: data.id,
          user_id: data.userId,
          user_name: data.userName,
          user_email: data.userEmail,
          user_role: data.userRole,
          action: data.action,
          timestamp: data.timestamp,
          details: data.details || null
        };
        const { error } = await supabase.from('audit_logs').upsert(payload);
        if (error) throw error;
        break;
      }
      default:
        console.warn(`Tipo de ação desconhecido: ${type}`);
    }
    return true;
  } catch (err: any) {
    console.error(`Erro na ação de sincronização [${action.type}]:`, err?.message || err);
    throw err;
  }
}

// Clear all database tables via backend
export async function clearAllSupabaseData() {
  try {
    await supabase.from('audit_logs').delete().neq('id', '0');
    await supabase.from('comunicados').delete().neq('id', '0');
    await supabase.from('pautas').delete().neq('id', -1);
    await supabase.from('pagamentos').delete().neq('id', '0');
    await supabase.from('despesas').delete().neq('id', '0');
    await supabase.from('alunos').delete().neq('id', '0');
    await supabase.from('professores').delete().neq('id', '0');
    await supabase.from('turmas').delete().neq('id', '0');
    await supabase.from('utilizadores').delete().neq('id', '0');
    await supabase.from('escolas').delete().neq('id', '0');
    return true;
  } catch (err) {
    console.error('Erro ao limpar base de dados no Supabase:', err);
    throw err;
  }
}

// Perform a high-speed bulk server-side upsert backup of all collections
export async function performFullBackup(data: {
  schools: any[];
  classes: any[];
  students: any[];
  teachers: any[];
  grades: any[];
  payments: any[];
  expenses: any[];
  users: any[];
  announcements: any[];
  auditLogs: any[];
}) {
  try {
    // 1. Export Schools
    if (data.schools && data.schools.length > 0) {
      const payloads = data.schools.map((s: any) => ({
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
      }));
      await supabase.from('escolas').upsert(payloads);
    }

    // 2. Export Classes
    if (data.classes && data.classes.length > 0) {
      const payloads = data.classes.map((c: any) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        course: c.course || null,
        shift: c.shift,
        room: c.room,
        capacity: c.capacity,
        subjects: c.subjects || [],
        school_id: cleanSchoolId(c.schoolId)
      }));
      const { error } = await supabase.from('turmas').upsert(payloads);
      if (error) {
        const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
        await supabase.from('turmas').upsert(safePayloads);
      }
    }

    // 3. Export Students
    if (data.students && data.students.length > 0) {
      const payloads = data.students.map(mapStudentToSupabase);
      const { error } = await supabase.from('alunos').upsert(payloads);
      if (error) {
        const safePayloads = payloads.map(p => ({ ...p, class_id: null, school_id: null }));
        await supabase.from('alunos').upsert(safePayloads);
      }
    }

    // 4. Export Teachers
    if (data.teachers && data.teachers.length > 0) {
      const payloads = data.teachers.map((t: any) => ({
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
        await supabase.from('professores').upsert(safePayloads);
      }
    }

    // 5. Export Grades
    if (data.grades && data.grades.length > 0) {
      const payloads = data.grades.map((g: any) => ({
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
        await supabase.from('pautas').upsert(safePayloads, { onConflict: 'student_id,subject_id,period,type' });
      }
    }

    // 6. Export Payments
    if (data.payments && data.payments.length > 0) {
      const payloads = data.payments.map((p: any) => ({
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
        school_id: cleanSchoolId(p.schoolId)
      }));
      const { error } = await supabase.from('pagamentos').upsert(payloads);
      if (error) {
        const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
        await supabase.from('pagamentos').upsert(safePayloads);
      }
    }

    // 7. Export Expenses
    if (data.expenses && data.expenses.length > 0) {
      const payloads = data.expenses.map((e: any) => ({
        id: e.id,
        description: e.description,
        category: e.category || null,
        amount: e.amount,
        date: e.date,
        receipt_number: e.receiptNumber || null,
        school_id: cleanSchoolId(e.schoolId)
      }));
      const { error } = await supabase.from('despesas').upsert(payloads);
      if (error) {
        const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
        await supabase.from('despesas').upsert(safePayloads);
      }
    }

    // 8. Export Users
    if (data.users && data.users.length > 0) {
      const payloads = data.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password || null,
        role: u.role,
        status: u.status,
        last_login: u.lastLogin || null,
        school_id: cleanSchoolId(u.schoolId),
        assigned_class_ids: u.assignedClassIds || [],
        avatar_url: u.avatarUrl || null,
        student_id: u.studentId || null
      }));
      const { error } = await supabase.from('utilizadores').upsert(payloads);
      if (error) {
        const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
        await supabase.from('utilizadores').upsert(safePayloads);
      }
    }

    // 9. Export Announcements
    if (data.announcements && data.announcements.length > 0) {
      const payloads = data.announcements.map((a: any) => ({
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
        school_id: cleanSchoolId(a.schoolId)
      }));
      const { error } = await supabase.from('comunicados').upsert(payloads);
      if (error) {
        const safePayloads = payloads.map(p => ({ ...p, school_id: null }));
        await supabase.from('comunicados').upsert(safePayloads);
      }
    }

    // 10. Export Audit Logs
    if (data.auditLogs && data.auditLogs.length > 0) {
      const payloads = data.auditLogs.map((al: any) => ({
        id: al.id,
        user_id: al.userId,
        user_name: al.userName,
        user_email: al.userEmail,
        user_role: al.userRole,
        action: al.action,
        timestamp: al.timestamp,
        details: al.details || null
      }));
      await supabase.from('audit_logs').upsert(payloads);
    }

    return true;
  } catch (err) {
    console.error('Erro ao efetuar cópia de segurança total no Supabase:', err);
    throw err;
  }
}
