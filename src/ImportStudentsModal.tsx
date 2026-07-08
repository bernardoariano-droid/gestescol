import React, { useState, useRef } from 'react';
import { Upload, FileDown, AlertTriangle, CheckCircle2, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Class, SystemUser } from './types';
import { motion } from 'motion/react';

interface ImportStudentsModalProps {
  classes: Class[];
  existingStudents: Student[];
  onImport: (students: Omit<Student, 'id' | 'enrollmentDate'>[]) => void;
  onClose: () => void;
  currentUser: SystemUser;
}

export function ImportStudentsModal({ classes, existingStudents, onImport, onClose, currentUser }: ImportStudentsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<{ successCount: number; rejectedCount: number; rejectedRows: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TEMPLATE_COLUMNS = [
    'Nome Completo',
    'BI',
    'Data de Nascimento (YYYY-MM-DD)',
    'Gênero (M/F)',
    'Nome do Encarregado',
    'Telefone do Encarregado',
    'Turma',
    'Zona de Residência'
  ];

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'Modelo_Importacao_Alunos.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setErrors([]);
    setPreviewData([]);
    setImportReport(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        validateData(jsonData);
      } catch (error) {
        setErrors(['Erro ao ler o ficheiro. Certifique-se de que é um ficheiro Excel (.xlsx) ou CSV válido.']);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const validateData = (data: any[]) => {
    const newErrors: string[] = [];
    const validData: any[] = [];
    const seenBI = new Set<string>();

    if (data.length === 0) {
      newErrors.push('O ficheiro está vazio.');
      setErrors(newErrors);
      return;
    }

    data.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header
      const nome = row['Nome Completo'];
      const bi = row['BI'];
      const dataNasc = row['Data de Nascimento (YYYY-MM-DD)'];
      const genero = row['Gênero (M/F)'];
      const encarregado = row['Nome do Encarregado'];
      const telefone = row['Telefone do Encarregado'];
      const turma = row['Turma'];
      const zona = row['Zona de Residência'];

      let hasRowError = false;

      if (!nome) { newErrors.push(`Linha ${rowNum}: Nome Completo é obrigatório.`); hasRowError = true; }
      if (!bi) { newErrors.push(`Linha ${rowNum}: BI é obrigatório.`); hasRowError = true; }
      if (!dataNasc) { newErrors.push(`Linha ${rowNum}: Data de Nascimento é obrigatória.`); hasRowError = true; }
      
      let classId = '';
      if (turma) {
        const foundClass = classes.find(c => c.name.toLowerCase() === turma.toString().toLowerCase());
        if (!foundClass) {
          newErrors.push(`Linha ${rowNum}: Turma "${turma}" não encontrada no sistema.`);
          hasRowError = true;
        } else {
          classId = foundClass.id;
        }
      }

      if (bi) {
        if (seenBI.has(bi)) {
          newErrors.push(`Linha ${rowNum}: BI "${bi}" está duplicado na planilha.`);
          hasRowError = true;
        } else if (existingStudents.some(s => s.bi === bi)) {
          newErrors.push(`Linha ${rowNum}: BI "${bi}" já existe no sistema.`);
          hasRowError = true;
        }
        if (!hasRowError) seenBI.add(bi);
      }

      if (!hasRowError) {
        validData.push({
          _rowNum: rowNum,
          name: nome || '',
          bi: bi || '',
          birthDate: dataNasc || '',
          gender: genero === 'F' ? 'F' : 'M',
          guardianName: encarregado || '',
          guardianPhone: telefone || '',
          classId: classId,
          turmaName: turma || '',
          residentialZone: zona || '',
          enrollmentStatus: 'Confirmado'
        });
      }
    });

    setPreviewData(validData);
    setErrors(newErrors);
  };

  const confirmImport = () => {
    if (previewData.length === 0) return;
    setIsImporting(true);

    const studentsToImport: Omit<Student, 'id' | 'enrollmentDate'>[] = previewData.map(d => ({
      name: d.name,
      bi: d.bi,
      birthDate: d.birthDate,
      gender: d.gender,
      guardianName: d.guardianName,
      guardianPhone: d.guardianPhone,
      classId: d.classId,
      residentialZone: d.residentialZone,
      enrollmentStatus: 'Confirmado' as const
    }));

    // In a real app, you would save this log to a database. 
    // Here we will just perform the import callback.
    setTimeout(() => {
      onImport(studentsToImport);
      setImportReport({
        successCount: studentsToImport.length,
        rejectedCount: errors.length,
        rejectedRows: []
      });
      setIsImporting(false);
    }, 1000);
  };

  if (importReport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Importação Concluída</h3>
            <p className="text-neutral-500 mb-6">A lista de alunos foi importada com sucesso.</p>
            
            <div className="bg-neutral-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-600">Alunos Importados:</span>
                <span className="font-bold text-emerald-600">{importReport.successCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Registos Rejeitados:</span>
                <span className="font-bold text-red-600">{importReport.rejectedCount}</span>
              </div>
              <div className="pt-2 mt-2 border-t text-xs text-neutral-400">
                Importado por: {currentUser.name} <br/>
                Data: {new Date().toLocaleString('pt-PT')}
              </div>
            </div>

            <button onClick={onClose} className="w-full bg-neutral-900 text-white p-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
              Fechar e Voltar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight">Importar Alunos por Excel</h2>
            <p className="text-sm text-neutral-500">Adicione múltiplos alunos de uma só vez usando uma planilha</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex items-start gap-4 p-4 bg-blue-50 text-blue-800 rounded-xl">
            <FileDown size={24} className="shrink-0 mt-1" />
            <div>
              <h4 className="font-bold mb-1">Passo 1: Baixe o modelo</h4>
              <p className="text-sm mb-3 opacity-80">Use a nossa planilha de modelo para garantir que os dados estejam no formato correto.</p>
              <button onClick={downloadTemplate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                Baixar Modelo .xlsx
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl border-dashed">
            <Upload size={24} className="shrink-0 mt-1 text-neutral-400" />
            <div className="flex-1">
              <h4 className="font-bold mb-1">Passo 2: Envie a planilha preenchida</h4>
              <p className="text-sm text-neutral-500 mb-3">Selecione o ficheiro Excel (.xlsx) ou CSV com os dados dos alunos.</p>
              <input type="file" accept=".xlsx, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-800 transition-colors">
                {file ? file.name : 'Selecionar Ficheiro'}
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertCircle size={20} />
                <span>Foram encontrados os seguintes erros (estes registos serão ignorados):</span>
              </div>
              <ul className="list-disc pl-5 text-sm space-y-1 max-h-40 overflow-y-auto">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
              {previewData.length > 0 && (
                <p className="text-sm font-bold mt-4">Pode prosseguir com a importação dos restantes {previewData.length} registos válidos ou corrigir o ficheiro e enviar novamente.</p>
              )}
            </div>
          )}

          {previewData.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                Pré-visualização ({previewData.length} alunos prontos para importação)
              </h4>
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 text-neutral-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">BI</th>
                      <th className="px-4 py-3">Turma</th>
                      <th className="px-4 py-3">Gênero</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="bg-white hover:bg-neutral-50">
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3">{row.bi}</td>
                        <td className="px-4 py-3">{row.turmaName || 'N/A'}</td>
                        <td className="px-4 py-3">{row.gender}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 10 && (
                <p className="text-sm text-neutral-500 text-center">E mais {previewData.length - 10} alunos...</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-xl font-bold text-neutral-600 hover:bg-neutral-200 transition-colors">
            Cancelar
          </button>
          <button 
            onClick={confirmImport}
            disabled={previewData.length === 0 || isImporting}
            className="px-6 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isImporting ? 'A importar...' : 'Confirmar Importação'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
