import React, { useState } from 'react';
import { SystemUser } from './types';
import { authService } from './auth';

export function ProfileView({ currentUser, users, setUsers, setCurrentUser, showToast }: {
  currentUser: SystemUser,
  users: SystemUser[],
  setUsers: (users: SystemUser[]) => void,
  setCurrentUser: (user: SystemUser) => void,
  showToast: (message: string, type: 'success' | 'error') => void
}) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [theme, setTheme] = useState(localStorage.getItem('edugest_theme') || 'light');

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
    
    showToast('Perfil actualizado com sucesso', 'success');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
      <h2 className="text-xl font-bold mb-4">Perfil</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Foto (URL da imagem)</label>
          <input 
            type="text" 
            value={avatarUrl} 
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Senha (Deixe vazio para manter)</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tema</label>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            className="w-full p-2 border rounded-xl"
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
        <button 
          onClick={handleUpdate}
          className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-semibold"
        >
          Guardar Alterações
        </button>
      </div>
    </div>
  );
}
