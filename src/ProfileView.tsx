import React, { useState } from 'react';
import { SystemUser } from './types';
import { authService } from './auth';

export function ProfileView({ currentUser, users, setUsers, setCurrentUser, showToast, onUpdateUser }: {
  currentUser: SystemUser,
  users: SystemUser[],
  setUsers: (users: SystemUser[]) => void,
  setCurrentUser: (user: SystemUser) => void,
  showToast: (message: string, type: 'success' | 'error') => void,
  onUpdateUser?: (user: SystemUser) => void
}) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [theme, setTheme] = useState(localStorage.getItem('edugest_theme') || 'light');

  const themesList = [
    { id: 'light', name: 'Claro Padrão', bg: 'bg-neutral-50', border: 'border-neutral-200', text: 'text-neutral-900', colorDot: 'bg-neutral-100' },
    { id: 'theme-white', name: 'Branco Puro', bg: 'bg-white', border: 'border-neutral-300', text: 'text-neutral-950', colorDot: 'bg-white border' },
    { id: 'theme-black', name: 'Preto Profundo', bg: 'bg-neutral-950', border: 'border-neutral-800', text: 'text-neutral-100', colorDot: 'bg-neutral-900' },
    { id: 'theme-yellow', name: 'Amarelo Quente', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-950', colorDot: 'bg-yellow-400' },
    { id: 'theme-green', name: 'Verde Ecológico', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-950', colorDot: 'bg-emerald-500' },
    { id: 'theme-blue', name: 'Azul Marinho', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-950', colorDot: 'bg-blue-500' },
    { id: 'theme-pink', name: 'Rosa Elegante', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-950', colorDot: 'bg-pink-500' },
  ];

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('edugest_theme', newTheme);
    document.documentElement.className = newTheme;
  };

  const handleUpdate = () => {
    const updatedUser = { 
      ...currentUser, 
      name, 
      email, 
      avatarUrl,
      ...(password ? { password } : {})
    };
    
    localStorage.setItem('edugest_theme', theme);
    document.documentElement.className = theme;

    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    localStorage.setItem('edugest_users', JSON.stringify(updatedUsers));
    
    setCurrentUser(updatedUser);
    authService.login(updatedUser);
    
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    } else {
      showToast('Perfil actualizado com sucesso', 'success');
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-neutral-200 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Perfil e Preferências</h2>
        <p className="text-xs text-neutral-500 font-bold">Personalize os seus dados e o ambiente visual do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Form Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Foto de Perfil (URL da imagem)</label>
            <input 
              type="text" 
              value={avatarUrl} 
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://exemplo.com/foto.jpg"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Nome Completo</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Endereço de E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Nova Palavra-passe (Deixe vazio para manter)</label>
            <input 
              type="password" 
              value={password} 
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Right Column: Interactive Color Theme Switcher */}
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Personalização de Cores (Tema)</label>
            <p className="text-xs text-neutral-400 mb-4 font-bold">Selecione uma cor para personalizar a sua experiência visual de forma instantânea.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {themesList.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeChange(t.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 active:scale-95 cursor-pointer ${
                  theme === t.id
                    ? 'border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900/10 shadow-sm font-black'
                    : 'border-neutral-200 hover:border-neutral-400 font-bold'
                }`}
              >
                <div className={`w-5 h-5 rounded-full ${t.colorDot} flex-shrink-0`} />
                <span className="text-xs text-neutral-900">{t.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-3">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Seleção Rápida</label>
            <select 
              value={theme} 
              onChange={(e) => handleThemeChange(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:border-neutral-400 transition-all"
            >
              <option value="light">Claro Padrão</option>
              <option value="theme-white">Branco Puro</option>
              <option value="theme-black">Preto Profundo</option>
              <option value="theme-yellow">Amarelo Quente</option>
              <option value="theme-green">Verde Ecológico</option>
              <option value="theme-blue">Azul Marinho</option>
              <option value="theme-pink">Rosa Elegante</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-6 flex justify-end">
        <button 
          onClick={handleUpdate}
          className="bg-neutral-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
        >
          Guardar Alterações
        </button>
      </div>
    </div>
  );
}
