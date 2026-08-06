import React, { useState } from 'react';
import { Announcement, SystemUser } from './types';
import { Megaphone, Plus, Trash2, X, Users, Send, Building, Search, UserCheck, UserX, CheckSquare, Square, ChevronDown, ChevronUp, User, ShieldCheck, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnnouncementsViewProps {
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  currentUser: SystemUser;
  currentSchoolId?: string;
  users: SystemUser[];
  showToast: (message: string, type?: 'success' | 'error') => void;
  queueSyncAction?: (type: string, description: string, data?: any) => Promise<void>;
}

export function AnnouncementsView({ announcements, setAnnouncements, currentUser, currentSchoolId, users, showToast, queueSyncAction }: AnnouncementsViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all_admins' | 'school_users' | 'specific_role' | 'specific_users'>('school_users');
  const [targetRole, setTargetRole] = useState<string>('Professor');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('todos');
  const [expandedRecipientsId, setExpandedRecipientsId] = useState<string | null>(null);

  const canSend = ['Super-Administrador', 'Administrador', 'Secretário'].includes(currentUser.role);

  // Filter available school users
  const schoolUsers = users.filter(u => {
    if (currentUser.role === 'Super-Administrador' && !currentSchoolId) return true;
    return !currentSchoolId || u.schoolId === currentSchoolId;
  });

  const filteredUsers = schoolUsers.filter(u => {
    const matchesRole = userRoleFilter === 'todos' || u.role === userRoleFilter;
    const matchesQuery = !userSearchQuery.trim() || 
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesRole && matchesQuery;
  });

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredUsers.map(u => u.id));
    setSelectedUserIds(prev => prev.filter(id => !filteredIdsSet.has(id)));
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      showToast('Por favor, preencha o título e o conteúdo.', 'error');
      return;
    }

    if (targetAudience === 'specific_users' && selectedUserIds.length === 0) {
      showToast('Por favor, selecione pelo menos um utilizador destinatário.', 'error');
      return;
    }

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toISOString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      targetAudience,
      targetRole: targetAudience === 'specific_role' ? targetRole : undefined,
      targetUserIds: targetAudience === 'specific_users' ? selectedUserIds : undefined,
      schoolId: (currentUser.role === 'Super-Administrador' && targetAudience === 'all_admins') ? undefined : currentSchoolId,
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setIsAdding(false);
    setTitle('');
    setContent('');
    setSelectedUserIds([]);
    setUserSearchQuery('');
    setTargetAudience('school_users');
    
    let destDesc = 'Todos os Utilizadores da Escola';
    if (targetAudience === 'all_admins') destDesc = 'Administradores do Sistema';
    if (targetAudience === 'specific_role') destDesc = `Papel: ${targetRole}`;
    if (targetAudience === 'specific_users') destDesc = `${selectedUserIds.length} Utilizadores Selecionados`;

    showToast(`Comunicado enviado com sucesso (${destDesc}).`, 'success');
    if (queueSyncAction) {
      queueSyncAction('CRIAR_COMUNICADO', `Criação do comunicado "${newAnnouncement.title}"`, newAnnouncement);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este comunicado?')) {
      setAnnouncements(announcements.filter(a => a.id !== id));
      showToast('Comunicado eliminado com sucesso.', 'success');
      if (queueSyncAction) {
        queueSyncAction('ELIMINAR_COMUNICADO', `Eliminação do comunicado ID: ${id}`, { id });
      }
    }
  };

  // Filter announcements for the current user
  const visibleAnnouncements = announcements.filter(a => {
    // Super admin or the creator of the announcement can always see it
    if (currentUser.role === 'Super-Administrador' || a.senderId === currentUser.id) return true;
    
    // School check
    const isSameSchool = !a.schoolId || a.schoolId === currentSchoolId;
    if (!isSameSchool) return false;

    if (a.targetAudience === 'all_admins') {
      return currentUser.role === 'Administrador';
    }

    if (a.targetAudience === 'school_users') {
      return true;
    }

    if (a.targetAudience === 'specific_role') {
      return currentUser.role === a.targetRole;
    }

    if (a.targetAudience === 'specific_users') {
      return Array.isArray(a.targetUserIds) && a.targetUserIds.includes(currentUser.id);
    }

    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Megaphone className="text-blue-600" />
            Comunicados
          </h2>
          <p className="text-neutral-500 mt-1">Envie avisos gerais ou dirija mensagens para utilizadores específicos</p>
        </div>
        {canSend && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus size={20} />
            Novo Comunicado
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl shadow-md border border-neutral-200 mb-6"
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Megaphone size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Criar Novo Comunicado</h3>
                  <p className="text-xs text-neutral-500">Defina o título, o conteúdo e selecione o público-alvo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAdding(false)} 
                className="text-neutral-400 hover:text-neutral-900 p-2 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Título do Comunicado</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião Geral de Encarregados de Educação"
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Conteúdo da Mensagem</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva aqui a informação detalhada do comunicado..."
                  rows={5}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Audience Selection Section */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-4">
                <label className="block text-sm font-bold text-neutral-800 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Destinatários (Público-Alvo)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentUser.role === 'Super-Administrador' && (
                    <button
                      type="button"
                      onClick={() => setTargetAudience('all_admins')}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all flex items-start gap-3",
                        targetAudience === 'all_admins' 
                          ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 font-semibold text-amber-900" 
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                      )}
                    >
                      <ShieldCheck size={20} className={targetAudience === 'all_admins' ? "text-amber-600 shrink-0 mt-0.5" : "text-neutral-400 shrink-0 mt-0.5"} />
                      <div>
                        <div className="text-sm font-bold">Todos os Administradores</div>
                        <div className="text-xs text-neutral-500 font-normal">Apenas administradores de escolas</div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTargetAudience('school_users')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all flex items-start gap-3",
                      targetAudience === 'school_users' 
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 font-semibold text-blue-900" 
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    )}
                  >
                    <Building size={20} className={targetAudience === 'school_users' ? "text-blue-600 shrink-0 mt-0.5" : "text-neutral-400 shrink-0 mt-0.5"} />
                    <div>
                      <div className="text-sm font-bold">Toda a Escola</div>
                      <div className="text-xs text-neutral-500 font-normal">Todos os utilizadores da instituição</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('specific_role')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all flex items-start gap-3",
                      targetAudience === 'specific_role' 
                        ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20 font-semibold text-purple-900" 
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    )}
                  >
                    <Users size={20} className={targetAudience === 'specific_role' ? "text-purple-600 shrink-0 mt-0.5" : "text-neutral-400 shrink-0 mt-0.5"} />
                    <div>
                      <div className="text-sm font-bold">Por Função / Papel</div>
                      <div className="text-xs text-neutral-500 font-normal">Professores, Alunos ou Secretários</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('specific_users')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all flex items-start gap-3",
                      targetAudience === 'specific_users' 
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 font-semibold text-emerald-900" 
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    )}
                  >
                    <UserCheck size={20} className={targetAudience === 'specific_users' ? "text-emerald-600 shrink-0 mt-0.5" : "text-neutral-400 shrink-0 mt-0.5"} />
                    <div>
                      <div className="text-sm font-bold">Escolher Utilizadores</div>
                      <div className="text-xs text-neutral-500 font-normal">Selecionar pessoas específicas da lista</div>
                    </div>
                  </button>
                </div>

                {/* Specific Role Dropdown */}
                {targetAudience === 'specific_role' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Selecione a Função Destinatária</label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full sm:w-72 p-3 bg-white border border-neutral-300 rounded-xl font-bold text-neutral-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="Professor">Professores</option>
                      <option value="Aluno">Alunos</option>
                      <option value="Secretário">Secretários</option>
                      <option value="Financeiro">Equipa Financeira</option>
                      <option value="Administrador">Administradores</option>
                    </select>
                  </motion.div>
                )}

                {/* Specific Users Picker */}
                {targetAudience === 'specific_users' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        Selecionar Utilizadores ({selectedUserIds.length} selecionados)
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                        >
                          <CheckSquare size={14} /> Selecionar Visíveis ({filteredUsers.length})
                        </button>
                        <span className="text-neutral-300">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllFiltered}
                          className="text-neutral-500 hover:text-neutral-800 font-bold px-2 py-1 rounded hover:bg-neutral-100 transition-colors flex items-center gap-1"
                        >
                          <Square size={14} /> Desmarcar
                        </button>
                      </div>
                    </div>

                    {/* Filter and Search controls */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Pesquisar por nome, email ou função..."
                          className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="p-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 outline-none"
                      >
                        <option value="todos">Todas as Funções</option>
                        <option value="Professor">Professores</option>
                        <option value="Aluno">Alunos</option>
                        <option value="Secretário">Secretários</option>
                        <option value="Financeiro">Financeiro</option>
                        <option value="Administrador">Administradores</option>
                      </select>
                    </div>

                    {/* User Checkbox List */}
                    <div className="max-h-60 overflow-y-auto bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100 p-1">
                      {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-neutral-400">
                          Nenhum utilizador encontrado com os filtros atuais.
                        </div>
                      ) : (
                        filteredUsers.map(u => {
                          const isSelected = selectedUserIds.includes(u.id);
                          return (
                            <label
                              key={u.id}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-neutral-50 select-none",
                                isSelected ? "bg-emerald-50/60" : ""
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleUserSelection(u.id)}
                                  className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 shrink-0"
                                />
                                <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
                                  {u.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 truncate">
                                  <div className="text-xs font-bold text-neutral-800 truncate">{u.name}</div>
                                  <div className="text-[11px] text-neutral-400 truncate">{u.email}</div>
                                </div>
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ml-2",
                                u.role === 'Administrador' ? "bg-amber-100 text-amber-800" :
                                u.role === 'Professor' ? "bg-blue-100 text-blue-800" :
                                u.role === 'Aluno' ? "bg-emerald-100 text-emerald-800" :
                                "bg-neutral-100 text-neutral-700"
                              )}>
                                {u.role}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!title.trim() || !content.trim() || (targetAudience === 'specific_users' && selectedUserIds.length === 0)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-200 active:scale-95"
                >
                  <Send size={18} />
                  Enviar Comunicado
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {visibleAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <Megaphone size={48} className="mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500 font-medium">Nenhum comunicado disponível para si neste momento.</p>
          </div>
        ) : (
          visibleAnnouncements.map((announcement) => {
            const isSender = currentUser.id === announcement.senderId;
            const isExpanded = expandedRecipientsId === announcement.id;

            return (
              <motion.div 
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md",
                  announcement.targetAudience === 'all_admins' ? "border-amber-200 bg-amber-50/20" : 
                  announcement.targetAudience === 'specific_users' ? "border-emerald-200 bg-emerald-50/10" :
                  announcement.targetAudience === 'specific_role' ? "border-purple-200 bg-purple-50/10" :
                  "border-neutral-200/80"
                )}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h4 className="text-lg font-bold text-neutral-900">{announcement.title}</h4>
                      
                      {/* Target Audience Badges */}
                      {announcement.targetAudience === 'all_admins' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider rounded-lg w-fit flex items-center gap-1">
                          <ShieldCheck size={13} />
                          Global / Admins
                        </span>
                      )}
                      {announcement.targetAudience === 'school_users' && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 w-fit">
                          <Building size={13} />
                          Toda a Escola
                        </span>
                      )}
                      {announcement.targetAudience === 'specific_role' && (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 w-fit">
                          <Users size={13} />
                          Função: {announcement.targetRole || 'Específica'}
                        </span>
                      )}
                      {announcement.targetAudience === 'specific_users' && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 w-fit">
                          <UserCheck size={13} />
                          {announcement.targetUserIds?.length || 0} Utilizadores Selecionados
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-neutral-500 mb-4">
                      <span className="flex items-center gap-1 font-semibold text-neutral-700">
                        <User size={14} className="text-neutral-400" />
                        {announcement.senderName} ({announcement.senderRole})
                      </span>
                      <span className="hidden sm:inline text-neutral-300">&bull;</span>
                      <span>{new Date(announcement.date).toLocaleString('pt-PT')}</span>
                    </div>

                    <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed">
                      {announcement.content}
                    </div>

                    {/* View Recipients List toggle for senders or specific audiences */}
                    {announcement.targetAudience === 'specific_users' && announcement.targetUserIds && announcement.targetUserIds.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-100">
                        <button
                          onClick={() => setExpandedRecipientsId(isExpanded ? null : announcement.id)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? 'Ocultar Destinatários' : `Ver Destinatários (${announcement.targetUserIds.length})`}
                        </button>

                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5"
                          >
                            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                              Destinatários Selecionados:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {announcement.targetUserIds.map(uid => {
                                const userObj = users.find(u => u.id === uid);
                                return (
                                  <span key={uid} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {userObj ? userObj.name : `Utilizador (${uid})`}
                                    {userObj && <span className="text-[10px] text-neutral-400">({userObj.role})</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>

                  {isSender && (
                    <button 
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      title="Eliminar comunicado"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

