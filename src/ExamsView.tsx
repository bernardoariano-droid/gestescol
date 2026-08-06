import React, { useState } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { Class, Student } from './types';

export function ExamsView({ classes, students }: { classes: Class[], students: Student[] }) {
  const [selectedClass, setSelectedClass] = useState('');
  
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Exames</h1>
          <p className="text-neutral-500">Lançamento de notas de exames.</p>
        </div>
      </header>
      
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)} 
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          >
             <option value="">Selecione a Turma</option>
             {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {selectedClass ? (
           <div className="text-center p-8 border-2 border-dashed border-neutral-200 rounded-2xl">
             <BookOpen size={32} className="mx-auto text-neutral-400 mb-4" />
             <h3 className="text-lg font-bold text-neutral-800">Exames da Turma</h3>
             <p className="text-neutral-500 text-sm">Selecione uma disciplina para lançar as notas dos exames (Funcionalidade em desenvolvimento).</p>
           </div>
        ) : (
           <div className="text-center p-12 text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-100">
             Por favor, selecione uma turma acima para carregar as pautas de exames.
           </div>
        )}
      </div>
    </div>
  );
}
