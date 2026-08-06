import React, { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Student } from './types';

export function TransfersView({ students }: { students: Student[] }) {
  const [transfers] = useState([
    { id: '1', studentName: 'João Silva', date: '2026-07-01', destination: 'Escola Primária 1', status: 'Aprovado' },
    { id: '2', studentName: 'Maria Santos', date: '2026-07-05', destination: 'Liceu Nacional', status: 'Pendente' }
  ]);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Transferências</h1>
          <p className="text-neutral-500">Gestão de transferências de alunos.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 font-medium transition-colors">
           <Plus size={20} />
           Nova Transferência
        </button>
      </header>
      
      <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Aluno</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Data do Pedido</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Escola de Destino</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-4 font-medium text-neutral-900">{t.studentName}</td>
                  <td className="p-4 text-neutral-600">{t.date}</td>
                  <td className="p-4 text-neutral-600">{t.destination}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      t.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Ver Detalhes">
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    Nenhuma transferência registada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
