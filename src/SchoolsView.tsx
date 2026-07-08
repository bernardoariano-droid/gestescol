import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  User, 
  Check, 
  X,
  Lock,
  UserRound,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { School, SystemUser } from './types';

interface SchoolsViewProps {
  schools: School[];
  onAddSchool: (school: School, admin: SystemUser) => void;
  onUpdateSchool: (school: School) => void;
  onDeleteSchool: (id: string) => void;
  users: SystemUser[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser: any;
}

export function SchoolsView({ 
  schools, 
  onAddSchool, 
  onUpdateSchool, 
  onDeleteSchool,
  users,
  showToast,
  currentUser
}: SchoolsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.nif && s.nif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSchoolAdmin = (schoolId: string) => {
    return users.find(u => u.schoolId === schoolId && u.role === 'Administrador');
  };

  const getSchoolUserCount = (schoolId: string) => {
    return users.filter(u => u.schoolId === schoolId).length;
  };

  const isSuperAdmin = currentUser?.role === 'Super-Administrador';

  return (
    <div className="space-y-8">
      {/* Top action bar */}
      <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar instituição / escola..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
          />
        </div>
        {isSuperAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200"
          >
            <Plus size={20} />
            Cadastrar Escola
          </button>
        )}
      </div>

      {/* Schools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.map(school => {
          const admin = getSchoolAdmin(school.id);
          return (
            <div key={school.id} className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Building2 size={24} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    school.status === 'Activo' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  }`}>
                    {school.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <h4 className="text-lg font-black text-neutral-900 tracking-tight leading-snug">{school.name}</h4>
                  <p className="text-xs font-bold text-neutral-400 flex items-center gap-2">
                    <UserRound size={12} />
                    {getSchoolUserCount(school.id)} Utilizadores
                  </p>
                  <p className="text-xs font-bold text-neutral-400 flex items-center gap-2">
                    <FileText size={12} />
                    NIF: {school.nif || 'Não informado'}
                  </p>
                  {school.address && (
                    <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                      <MapPin size={12} className="shrink-0" />
                      {school.address}
                    </p>
                  )}
                  {school.phone && (
                    <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                      <Phone size={12} />
                      {school.phone}
                    </p>
                  )}
                  {school.email && (
                    <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                      <Mail size={12} />
                      {school.email}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-50 space-y-2 mb-6">
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Director Geral</p>
                    <p className="text-xs font-bold text-neutral-700">{school.directorName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Administrador Associado</p>
                    <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mt-0.5">
                      <User size={12} />
                      {admin ? `${admin.name} (${admin.email})` : 'Nenhum administrador associado'}
                    </p>
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ano Lectivo</p>
                    <p className="text-xs font-bold text-neutral-900">{school.anoLectivo || '2023/2024'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingSchool(school)}
                      className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => onDeleteSchool(school.id)}
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add School Modal */}
      {isAdding && (
        <AddSchoolModal 
          onClose={() => setIsAdding(false)}
          onSave={(school, admin) => {
            onAddSchool(school, admin);
            setIsAdding(false);
          }}
          showToast={showToast}
        />
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <EditSchoolModal 
          school={editingSchool}
          onClose={() => setEditingSchool(null)}
          onSave={(school) => {
            onUpdateSchool(school);
            setEditingSchool(null);
          }}
        />
      )}
    </div>
  );
}

interface AddSchoolModalProps {
  onClose: () => void;
  onSave: (school: School, admin: SystemUser) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

function AddSchoolModal({ onClose, onSave, showToast }: AddSchoolModalProps) {
  const [schoolData, setSchoolData] = useState<Partial<School>>({
    name: '',
    nif: '',
    address: '',
    phone: '',
    email: '',
    directorName: '',
    subdirectorName: '',
    status: 'Activo',
    republica: 'República de Angola',
    governoProvincia: 'Governo da Província do Cuanza-Sul',
    administracaoMunicipal: 'Administração Municipal',
    direccaoMunicipal: 'Direcção Municipal da Educação',
    anoLectivo: '2023/2024'
  });

  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [step, setStep] = useState<1 | 2>(1);

  const handleNext = () => {
    if (!schoolData.name) {
      showToast('O Nome da Escola é obrigatório.', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminData.name || !adminData.email || !adminData.password) {
      showToast('Todos os campos do Administrador são obrigatórios.', 'error');
      return;
    }

    const schoolId = 's_' + Math.random().toString(36).substr(2, 9);
    
    const finalSchool: School = {
      id: schoolId,
      name: schoolData.name || '',
      nif: schoolData.nif,
      address: schoolData.address,
      phone: schoolData.phone,
      email: schoolData.email,
      directorName: schoolData.directorName,
      subdirectorName: schoolData.subdirectorName,
      status: schoolData.status as 'Activo' | 'Inactivo',
      republica: schoolData.republica,
      governoProvincia: schoolData.governoProvincia,
      administracaoMunicipal: schoolData.administracaoMunicipal,
      direccaoMunicipal: schoolData.direccaoMunicipal,
      anoLectivo: schoolData.anoLectivo
    };

    const finalAdmin: SystemUser = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      name: adminData.name,
      email: adminData.email,
      password: adminData.password,
      role: 'Administrador',
      status: 'Activo',
      schoolId: schoolId
    };

    onSave(finalSchool, finalAdmin);
    showToast('Escola e Administrador registados com sucesso!', 'success');
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden my-8"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
              Cadastrar Nova Escola
            </h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
              Passo {step} de 2: {step === 1 ? 'Detalhes da Instituição' : 'Administrador da Escola'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-neutral-400 hover:text-neutral-900 shadow-sm">
            <X size={24} />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-6 sm:p-8 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome da Escola *</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                <input 
                  type="text" 
                  value={schoolData.name}
                  onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Ex: Escola Secundária de Benguela"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">NIF da Escola</label>
                <input 
                  type="text" 
                  value={schoolData.nif}
                  onChange={(e) => setSchoolData({ ...schoolData, nif: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Ex: 500123456"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Contacto Telefónico</label>
                <input 
                  type="text" 
                  value={schoolData.phone}
                  onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Ex: 923000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Endereço da Instituição</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                <input 
                  type="text" 
                  value={schoolData.address}
                  onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Bairro Central, Província..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Email Geral</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                <input 
                  type="email" 
                  value={schoolData.email}
                  onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="contacto@escola.ao"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Director Geral</label>
                <input 
                  type="text" 
                  value={schoolData.directorName}
                  onChange={(e) => setSchoolData({ ...schoolData, directorName: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Nome do Director"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Subdirector Pedagógico</label>
                <input 
                  type="text" 
                  value={schoolData.subdirectorName}
                  onChange={(e) => setSchoolData({ ...schoolData, subdirectorName: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Nome do Subdirector"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-4">
              <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Configurações Administrativas do Ministério</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Governo Provincial</label>
                  <input 
                    type="text" 
                    value={schoolData.governoProvincia}
                    onChange={(e) => setSchoolData({ ...schoolData, governoProvincia: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Administração Municipal</label>
                  <input 
                    type="text" 
                    value={schoolData.administracaoMunicipal}
                    onChange={(e) => setSchoolData({ ...schoolData, administracaoMunicipal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Direcção Municipal</label>
                  <input 
                    type="text" 
                    value={schoolData.direccaoMunicipal}
                    onChange={(e) => setSchoolData({ ...schoolData, direccaoMunicipal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Ano Lectivo Actual</label>
                  <input 
                    type="text" 
                    value={schoolData.anoLectivo}
                    onChange={(e) => setSchoolData({ ...schoolData, anoLectivo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800">
              <ShieldAlert className="shrink-0" size={20} />
              <p className="text-xs font-medium leading-relaxed">
                Este utilizador será o <strong>Administrador Principal</strong> da escola e poderá criar outros utilizadores (como professores, alunos, financeiro e secretários) com acessos definidos.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome do Administrador</label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                <input 
                  type="text" 
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Ex: Dr. António Manuel"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">E-mail Institucional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                <input 
                  type="email" 
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="admin.escola@edugest.ao"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Palavra-passe de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                <input 
                  type="password" 
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                  placeholder="Defina uma palavra-passe segura"
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 bg-neutral-50/50 border-t border-neutral-100 flex gap-4">
          {step === 1 ? (
            <>
              <button 
                onClick={onClose}
                className="flex-1 py-4 text-neutral-500 font-black text-sm hover:text-neutral-900 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleNext}
                className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-black text-sm hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-neutral-200"
              >
                Próximo
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 text-neutral-500 font-black text-sm hover:text-neutral-900 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={handleSubmit}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-200"
              >
                Salvar Escola
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface EditSchoolModalProps {
  school: School;
  onClose: () => void;
  onSave: (school: School) => void;
}

function EditSchoolModal({ school, onClose, onSave }: EditSchoolModalProps) {
  const [formData, setFormData] = useState<School>({ ...school });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden my-8"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
              Editar Instituição
            </h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
              Atualize as informações da escola
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-neutral-400 hover:text-neutral-900 shadow-sm">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nome da Escola *</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">NIF da Escola</label>
              <input 
                type="text" 
                value={formData.nif || ''}
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Telefone</label>
              <input 
                type="text" 
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Endereço</label>
            <input 
              type="text" 
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Email Geral</label>
            <input 
              type="email" 
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Director Geral</label>
              <input 
                type="text" 
                value={formData.directorName || ''}
                onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Subdirector Pedagógico</label>
              <input 
                type="text" 
                value={formData.subdirectorName || ''}
                onChange={(e) => setFormData({ ...formData, subdirectorName: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Ano Lectivo</label>
              <input 
                type="text" 
                value={formData.anoLectivo || ''}
                onChange={(e) => setFormData({ ...formData, anoLectivo: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Estado</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/5"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-neutral-50/50 border-t border-neutral-100 flex gap-4 mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-neutral-500 font-black text-sm hover:text-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-200"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
