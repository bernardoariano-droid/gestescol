import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarView() {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Calendário Escolar</h1>
          <p className="text-neutral-500">Planeamento de atividades e avaliações.</p>
        </div>
        <button className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 font-medium transition-colors">
          Adicionar Evento
        </button>
      </header>
      
      <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-neutral-800">Julho 2026</h2>
          <div className="flex gap-2">
            <button className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"><ChevronLeft size={20} /></button>
            <button className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-4 mb-4">
          {days.map(d => (
            <div key={d} className="text-center font-bold text-neutral-400 text-sm uppercase tracking-wider">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`empty-${i}`} className="p-4 rounded-2xl bg-neutral-50/50"></div>
          ))}
          {dates.map(d => (
            <div 
              key={d} 
              className={`p-4 min-h-[100px] rounded-2xl border relative transition-colors cursor-pointer ${
                d === 9 ? 'border-blue-500 bg-blue-50' : 'border-neutral-100 bg-white hover:border-blue-300'
              }`}
            >
              <span className={`font-bold ${d === 9 ? 'text-blue-700' : 'text-neutral-700'}`}>{d}</span>
              {d === 15 && (
                <div className="absolute bottom-2 left-2 right-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded truncate">
                  Exames Finais
                </div>
              )}
              {d === 25 && (
                <div className="absolute bottom-2 left-2 right-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded truncate">
                  Feriado
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
