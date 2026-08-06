import React, { useState } from 'react';
import { Upload, Download, File, Folder } from 'lucide-react';

export function ArchiveView() {
  const [files] = useState([
    { id: '1', name: 'Regulamento_Interno_2026.pdf', type: 'pdf', size: '2.4 MB', date: '2026-06-15' },
    { id: '2', name: 'Plano_Curricular_EJA.docx', type: 'doc', size: '1.1 MB', date: '2026-05-20' },
    { id: '3', name: 'Relatorio_Semestral.xlsx', type: 'xls', size: '3.2 MB', date: '2026-07-01' },
    { id: '4', name: 'Calendario_Provas.pdf', type: 'pdf', size: '500 KB', date: '2026-06-25' },
  ]);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Arquivo Digital</h1>
          <p className="text-neutral-500">Armazenamento seguro de documentos da escola.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 font-medium transition-colors">
           <Upload size={20} />
           Enviar Ficheiro
        </button>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {files.map(f => (
           <div 
             key={f.id} 
             className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col items-center text-center hover:border-blue-300 transition-colors cursor-pointer group"
           >
             <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <File size={32} />
             </div>
             <h3 className="font-bold text-neutral-800 text-sm mb-1 truncate w-full" title={f.name}>{f.name}</h3>
             <p className="text-xs text-neutral-500 mb-4">{f.size} • {f.date}</p>
             <button className="mt-auto flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors w-full justify-center py-2 bg-blue-50 rounded-lg group-hover:bg-blue-100">
               <Download size={16} /> Transferir
             </button>
           </div>
         ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4 text-blue-800 mt-8">
        <Folder size={24} className="shrink-0" />
        <p className="text-sm font-medium">
          O Arquivo Digital permite-lhe manter documentos oficiais centralizados. A partilha externa estará disponível na próxima atualização do sistema.
        </p>
      </div>
    </div>
  );
}
