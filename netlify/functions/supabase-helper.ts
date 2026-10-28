import { createClient } from '@supabase/supabase-js';

// Supabase configuration details with robust environment variable fallbacks
// Sanitize Supabase URL to strip any /rest/v1 or trailing slashes
export function sanitizeSupabaseUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return 'https://fhrgnhhuolordpilluak.supabase.co';
  let clean = url.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  return clean || 'https://fhrgnhhuolordpilluak.supabase.co';
}

const rawSupabaseUrl = 
  process.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  'https://fhrgnhhuolordpilluak.supabase.co';

export const SUPABASE_URL = sanitizeSupabaseUrl(rawSupabaseUrl);

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

// Helper: Clean school ID to avoid invalid foreign key constraints
function cleanSchoolId(id?: string | null): string | null {
  if (!id || typeof id !== 'string' || id.trim() === '') return null;
  return id.trim();
}

async function ensureSchoolExists(schoolId?: string | null) {
  const cleanId = cleanSchoolId(schoolId) || 's1';
  try {
    const { data: existing } = await supabase.from('escolas').select('id').eq('id', cleanId).maybeSingle();
    if (!existing) {
      await supabase.from('escolas').upsert({
        id: cleanId,
        name: cleanId === 's1' ? 'Escola Principal' : 'Escola ' + cleanId,
        status: 'Activo'
      });
    }
  } catch (err) {
    console.warn('Aviso ao assegurar escola no Supabase:', err);
  }
}

async function ensureClassExists(classId?: string | null, schoolId?: string | null, className?: string | null) {
  if (!classId || typeof classId !== 'string' || classId.trim() === '') return null;
  const cleanCId = classId.trim();
  const cleanSId = cleanSchoolId(schoolId) || 's1';
  try {
    const { data: existing } = await supabase.from('turmas').select('id').eq('id', cleanCId).maybeSingle();
    if (!existing) {
      await ensureSchoolExists(cleanSId);
      await supabase.from('turmas').upsert({
        id: cleanCId,
        name: className || `Turma ${cleanCId}`,
        level: '7ª Classe',
        shift: 'Manhã',
        school_id: cleanSId
      }, { onConflict: 'id' });
    }
    return cleanCId;
  } catch (err) {
    console.warn('Aviso ao assegurar turma no Supabase:', err);
    return cleanCId;
  }
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
    schoolId: s.school_id || 's1',
    residentialZone: s.residential_zone || ''
  };
}

// Helper: Fetch all rows across pagination (bypasses PostgREST 1000-row limit)
async function fetchAllTableRows(table: string, select: string = '*') {
  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) {
      console.warn(`Aviso ao ler página de ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

// Pull complete database data from Supabase
export async function pullFromSupabase() {
  try {
    const [
      escolas,
      turmas,
      alunos,
      professores,
      pautas,
      pagamentos,
      despesas,
      utilizadores,
      comunicados,
      auditLogs
    ] = await Promise.all([
      fetchAllTableRows('escolas'),
      fetchAllTableRows('turmas'),
      fetchAllTableRows('alunos'),
      fetchAllTableRows('professores'),
      fetchAllTableRows('pautas'),
      fetchAllTableRows('pagamentos'),
      fetchAllTableRows('despesas'),
      fetchAllTableRows('utilizadores'),
      fetchAllTableRows('comunicados'),
      fetchAllTableRows('audit_logs')
    ]);

    let rawGradesData = pautas;
    if (rawGradesData.length === 0) {
      try {
        const rawNotas = await fetchAllTableRows('notas');
        if (rawNotas.length > 0) {
          rawGradesData = rawNotas;
        }
      } catch (e) {}
    }

    return {
      schools: escolas.map(s => ({
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
      classes: turmas.map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        course: c.course,
        shift: c.shift,
        room: c.room,
        capacity: c.capacity,
        subjects: Array.isArray(c.subjects) ? c.subjects : [],
        schoolId: c.school_id || 's1'
      })),
      students: alunos.map(mapStudentFromSupabase),
      teachers: professores.map(t => ({
        id: t.id,
        name: t.name,
        specialization: t.specialization,
        phone: t.phone,
        assignments: Array.isArray(t.assignments) ? t.assignments : [],
        portalToken: t.portal_token,
        schoolId: t.school_id || 's1'
      })),
      grades: rawGradesData.map(g => ({
        studentId: g.student_id,
        subjectId: g.subject_id,
        period: g.period,
        type: g.type,
        value: parseFloat(g.value),
        notaExame: g.nota_exame !== null && g.nota_exame !== undefined ? parseFloat(g.nota_exame) : undefined,
        schoolId: g.school_id || 's1'
      })),
      payments: pagamentos.map(p => ({
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
        schoolId: p.school_id || 's1'
      })),
      expenses: despesas.map(e => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amount: parseFloat(e.amount),
        date: e.date,
        receiptNumber: e.receipt_number,
        schoolId: e.school_id || 's1'
      })),
      users: utilizadores.map(u => {
        let assignedClassIds: string[] = [];
        let assignments: any[] = [];
        let assignedSubjects: string[] = [];

        if (Array.isArray(u.assigned_class_ids)) {
          assignedClassIds = u.assigned_class_ids;
        } else if (u.assigned_class_ids && typeof u.assigned_class_ids === 'object') {
          assignedClassIds = u.assigned_class_ids.classIds || u.assigned_class_ids.assignedClassIds || [];
          assignments = u.assigned_class_ids.assignments || [];
          assignedSubjects = u.assigned_class_ids.assignedSubjects || [];
        }

        if (u.role === 'Professor' && assignments.length === 0) {
          const matchingProf = professores.find((p: any) => p.id === u.id || p.name?.toLowerCase() === u.name?.toLowerCase());
          if (matchingProf && Array.isArray(matchingProf.assignments)) {
            assignments = matchingProf.assignments;
            if (assignedClassIds.length === 0) {
              assignedClassIds = Array.from(new Set(matchingProf.assignments.map((a: any) => a.classId)));
            }
          }
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          status: u.status,
          lastLogin: u.last_login,
          schoolId: u.school_id || '',
          assignedClassIds,
          assignments: assignments.length > 0 ? assignments : undefined,
          assignedSubjects: assignedSubjects.length > 0 ? assignedSubjects : undefined,
          avatarUrl: u.avatar_url,
          studentId: u.student_id
        };
      }),
      announcements: comunicados.map(a => {
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
      auditLogs: auditLogs.map(al => ({
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
        const targetSchoolId = cleanSchoolId(data.schoolId) || 's1';
        await ensureSchoolExists(targetSchoolId);
        
        // Ensure class exists in turmas table so class_id is NEVER lost
        if (data.classId) {
          await ensureClassExists(data.classId, targetSchoolId, data.className || data.turmaName);
        }

        const payload = mapStudentToSupabase(data);
        if (!payload.school_id) {
          payload.school_id = targetSchoolId;
        }

        let { error } = await supabase.from('alunos').upsert(payload, { onConflict: 'id' });
        if (error) {
          console.warn('Tentando upsert de aluno com fallback de class_id:', error.message);
          payload.class_id = null;
          const { error: err2 } = await supabase.from('alunos').upsert(payload, { onConflict: 'id' });
          if (err2) {
            payload.school_id = null;
            const { error: err3 } = await supabase.from('alunos').upsert(payload, { onConflict: 'id' });
            if (err3) throw err3;
          }
        }
        break;
      }
      case 'IMPORTAR_ALUNOS': {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const targetSchoolId = cleanSchoolId(list[0]?.schoolId) || 's1';
          await ensureSchoolExists(targetSchoolId);

          // Pre-ensure all unique classes exist in turmas table so foreign keys never fail
          const uniqueClasses = new Map<string, string>();
          for (const s of list) {
            if (s.classId) {
              uniqueClasses.set(s.classId, s.className || s.turmaName || `Turma ${s.classId}`);
            }
          }
          for (const [cid, cname] of uniqueClasses.entries()) {
            await ensureClassExists(cid, targetSchoolId, cname);
          }

          const payloads = list.map(s => {
            const p = mapStudentToSupabase(s);
            if (!p.school_id) p.school_id = targetSchoolId;
            return p;
          });

          // Upsert in batches of 50
          for (let i = 0; i < payloads.length; i += 50) {
            const chunk = payloads.slice(i, i + 50);
            let { error } = await supabase.from('alunos').upsert(chunk, { onConflict: 'id' });
            if (error) {
              console.warn('Aviso no upsert em lote de alunos. A tentar registo a registo...', error.message);
              for (const student of chunk) {
                try {
                  const { error: singleErr } = await supabase.from('alunos').upsert(student, { onConflict: 'id' });
                  if (singleErr) {
                    await supabase.from('alunos').upsert({ ...student, class_id: null }, { onConflict: 'id' });
                  }
                } catch (e) {
                  console.error('Falha ao importar aluno individual:', e);
                }
              }
            }
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
        await ensureSchoolExists(data.schoolId || 's1');
        const targetSchoolId = cleanSchoolId(data.schoolId) || 's1';
        const payload = {
          id: data.id,
          name: data.name,
          level: data.level,
          course: data.course || null,
          shift: data.shift,
          room: data.room,
          capacity: data.capacity,
          subjects: data.subjects || [],
          school_id: targetSchoolId
        };
        const { error } = await supabase.from('turmas').upsert(payload);
        if (error) {
          await ensureSchoolExists('s1');
          payload.school_id = 's1';
          const { error: err2 } = await supabase.from('turmas').upsert(payload);
          if (err2) throw err2;
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
        const list = Array.isArray(data) ? data : (data ? [data] : []);
        if (list.length > 0) {
          const targetSchoolId = cleanSchoolId(list[0]?.schoolId) || 's1';
          await ensureSchoolExists(targetSchoolId);

          const payloads = list.map((g: any) => {
            const item: any = {
              student_id: g.studentId || g.student_id,
              subject_id: g.subjectId || g.subject_id,
              period: g.period,
              type: g.type,
              value: typeof g.value === 'number' ? g.value : parseFloat(g.value || '0'),
              school_id: cleanSchoolId(g.schoolId || g.school_id) || targetSchoolId
            };
            if (g.notaExame !== undefined && g.notaExame !== null) {
              item.nota_exame = typeof g.notaExame === 'number' ? g.notaExame : parseFloat(g.notaExame);
            } else if (g.nota_exame !== undefined && g.nota_exame !== null) {
              item.nota_exame = typeof g.nota_exame === 'number' ? g.nota_exame : parseFloat(g.nota_exame);
            }
            return item;
          }).filter(p => p.student_id && p.subject_id && p.period && p.type);

          if (payloads.length === 0) break;

          // Ensure all students referenced in grades exist in 'alunos' table so foreign key constraint never fails
          try {
            const uniqueStudentIds = Array.from(new Set(payloads.map(p => p.student_id)));
            const { data: existingStudents } = await supabase.from('alunos').select('id').in('id', uniqueStudentIds);
            const existingSet = new Set((existingStudents || []).map((s: any) => s.id));
            const missingStudents = uniqueStudentIds.filter(id => !existingSet.has(id));

            if (missingStudents.length > 0) {
              const stubs = missingStudents.map(id => ({
                id,
                name: 'Estudante ' + id,
                bi: 'N/A',
                enrollment_status: 'Matriculado',
                school_id: targetSchoolId
              }));
              await supabase.from('alunos').upsert(stubs, { onConflict: 'id', ignoreDuplicates: true });
            }
          } catch (studentErr) {
            console.warn('Aviso ao verificar alunos das notas:', studentErr);
          }

          // 1. Try batch upsert on pautas
          let { error } = await supabase.from('pautas').upsert(payloads, { onConflict: 'student_id,subject_id,period,type' });

          // If error indicates 'nota_exame' column does not exist, retry without nota_exame!
          if (error && error.message && error.message.includes('nota_exame')) {
            const cleanPayloads = payloads.map(({ nota_exame, ...rest }) => rest);
            const resClean = await supabase.from('pautas').upsert(cleanPayloads, { onConflict: 'student_id,subject_id,period,type' });
            error = resClean.error;
          }

          if (error) {
            // Also try on 'notas' table/view if pautas doesn't exist
            if (error.message && (error.message.includes('relation "pautas" does not exist') || error.code === '42P01')) {
              const { error: notasErr } = await supabase.from('notas').upsert(payloads, { onConflict: 'student_id,subject_id,period,type' });
              if (!notasErr) break;
            }

            console.warn('Tentando upsert de notas com school_id nulo:', error.message);
            const safePayloads = payloads.map(p => {
              const { nota_exame, ...rest } = p;
              return { ...rest, school_id: null };
            });
            const { error: err2 } = await supabase.from('pautas').upsert(safePayloads, { onConflict: 'student_id,subject_id,period,type' });

            // 2. Fallback to individual insertion
            if (err2) {
              console.warn('Tentando gravação resiliente de notas registo a registo...', err2.message);
              for (const item of payloads) {
                try {
                  const { nota_exame, ...cleanItem } = item;
                  await supabase.from('pautas').upsert({ ...cleanItem, school_id: null }, { onConflict: 'student_id,subject_id,period,type' });
                } catch (singleErr) {
                  console.error('Falha ao gravar nota individual:', singleErr);
                }
              }
            }
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
          assigned_class_ids: (data.assignments && data.assignments.length > 0) ? {
            classIds: data.assignedClassIds || [],
            assignments: data.assignments || [],
            assignedSubjects: data.assignedSubjects || []
          } : (data.assignedClassIds || []),
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
        nota_exame: g.notaExame !== undefined ? g.notaExame : (g.type === 'Exame' || g.period === 'Exame' ? g.value : null),
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
        assigned_class_ids: (u.assignments && u.assignments.length > 0) ? {
          classIds: u.assignedClassIds || [],
          assignments: u.assignments,
          assignedSubjects: u.assignedSubjects || []
        } : (u.assignedClassIds || []),
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
