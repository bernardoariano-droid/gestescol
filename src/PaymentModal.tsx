import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Printer } from 'lucide-react';
import { Student, Class, Payment } from './types';
import { MONTHS } from './constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const getImageFormat = (dataUrl: string | null): 'PNG' | 'JPEG' | 'WEBP' => {
  if (!dataUrl) return 'PNG';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'PNG';
};

const loadAngolaInsignia = (customLogo?: string): Promise<string | null> => {
  if (customLogo) return Promise.resolve(customLogo);
  try {
    const saved = localStorage.getItem('edugest_school_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.logoBase64) {
        return Promise.resolve(parsed.logoBase64);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
};

export function PaymentModal({ students, classes, onClose, onAddPayment, schoolName = "Escola EduGest", logoBase64 }: {
  students: Student[],
  classes: Class[],
  onClose: () => void,
  onAddPayment: (p: Payment) => void,
  schoolName?: string,
  logoBase64?: string
}) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [service, setService] = useState('Propina');
  const [month, setMonth] = useState(MONTHS[0]);
  const [amount, setAmount] = useState(15000);
  const [fine, setFine] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [items, setItems] = useState<{service: string, month?: string, amount: number, fine: number, discount: number}[]>([]);

  const classStudents = students.filter(s => s.classId === selectedClassId);

  const handleAddItem = () => {
    setItems([...items, { service, month: service === 'Propina' ? month : undefined, amount, fine, discount }]);
    setAmount(15000);
    setFine(0);
    setDiscount(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const generateAndDownloadReceipt = async (studentName: string, studentClass: string, receiptNumber: string, date: string, finalItems: any[], totalToPay: number) => {
    const doc = new jsPDF();
    const insignia = await loadAngolaInsignia(logoBase64);
    
    let textStartY = 20;
    let startY = 65;
    
    if (insignia) {
      try {
        doc.addImage(insignia, getImageFormat(insignia), 95, 10, 20, 20);
        textStartY = 37;
        startY = 80;
      } catch (e) {
        console.error('Erro ao adicionar logótipo no recibo PDF:', e);
      }
    }
    
    doc.setFontSize(16);
    doc.text(schoolName, 105, textStartY, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Recibo de Pagamento', 105, textStartY + 8, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Recibo Nº: ${receiptNumber}`, 14, textStartY + 20);
    doc.text(`Data: ${date}`, 14, textStartY + 26);
    doc.text(`Aluno(a): ${studentName}`, 14, textStartY + 32);
    doc.text(`Turma: ${studentClass}`, 14, textStartY + 38);

    const tableData = finalItems.map((item, i) => [
      i + 1,
      item.service + (item.month ? ` (${item.month})` : ''),
      `${item.amount.toLocaleString()} AKZ`,
      item.fine > 0 ? `${item.fine.toLocaleString()} AKZ` : '-',
      item.discount > 0 ? `${item.discount.toLocaleString()} AKZ` : '-',
      `${(item.amount + item.fine - item.discount).toLocaleString()} AKZ`
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Nº', 'Descrição', 'Valor', 'Multa', 'Desconto', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY + 20;
    doc.setFontSize(12);
    doc.text(`Total Pago: ${totalToPay.toLocaleString()} AKZ`, 14, finalY + 15);
    
    doc.setFontSize(10);
    doc.text('O(A) Tesoureiro(a)', 105, finalY + 40, { align: 'center' });
    doc.line(75, finalY + 45, 135, finalY + 45);

    doc.save(`Recibo_${receiptNumber}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const receiptNumber = `REC-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const date = new Date().toISOString().split('T')[0];
    const student = students.find(s => s.id === selectedStudentId);
    const cls = classes.find(c => c.id === selectedClassId);

    items.forEach(item => {
      onAddPayment({
        id: Math.random().toString(36).substr(2, 9),
        studentId: selectedStudentId,
        service: item.service,
        month: item.month,
        amount: item.amount,
        fine: item.fine,
        discount: item.discount,
        date,
        status: 'Pago',
        receiptNumber
      });
    });

    const totalToPay = items.reduce((sum, item) => sum + item.amount + item.fine - item.discount, 0);

    if (student && cls) {
      await generateAndDownloadReceipt(student.name, cls.name, receiptNumber, date, items, totalToPay);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 max-h-[95vh] flex flex-col"
      >
        <div className="p-6 sm:p-8 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/50">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Novo Pagamento Múltiplo</h3>
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Registo de serviços e propinas num só recibo</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-2 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-neutral-100">
            <X size={24} />
          </button>
        </div>

        <form className="flex-1 overflow-y-auto flex flex-col" onSubmit={handleSubmit}>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Seleccionar Classe</label>
                <select 
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Seleccionar Aluno</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="" disabled>Escolha um aluno</option>
                  {classStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-amber-50/50 p-4 sm:p-6 rounded-2xl border border-amber-100 space-y-4">
              <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wider">Adicionar Serviço</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                  <select 
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full p-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="Propina">Propina Mensal</option>
                    <option value="Matrícula">Matrícula</option>
                    <option value="Confirmação">Confirmação</option>
                    <option value="Uniforme">Uniforme</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Multa">Multa Isolada</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                {service === 'Propina' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Mês</label>
                    <select 
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full p-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    >
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Valor (AKZ)</label>
                  <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Multa (AKZ)</label>
                  <input type="number" value={fine} onChange={e => setFine(Number(e.target.value))} className="w-full p-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Desconto (AKZ)</label>
                  <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full p-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleAddItem} className="bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors">
                  <Plus size={18} /> Adicionar à Lista
                </button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold">
                    <tr>
                      <th className="p-3">Serviço</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Subtotal</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3">
                          <div className="font-bold text-neutral-900">{item.service} {item.month ? `(${item.month})` : ''}</div>
                          <div className="text-xs text-neutral-500">
                            {item.fine > 0 && `Multa: +${item.fine} `}
                            {item.discount > 0 && `Desc: -${item.discount}`}
                          </div>
                        </td>
                        <td className="p-3">{item.amount.toLocaleString()}</td>
                        <td className="p-3 font-black text-amber-600">{(item.amount + item.fine - item.discount).toLocaleString()} AKZ</td>
                        <td className="p-3 text-right">
                          <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-50">
                    <tr>
                      <td colSpan={2} className="p-4 text-right font-bold text-neutral-600">Total a Pagar:</td>
                      <td colSpan={2} className="p-4 font-black text-lg text-amber-600">
                        {items.reduce((s, i) => s + i.amount + i.fine - i.discount, 0).toLocaleString()} AKZ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          <div className="p-6 sm:p-8 border-t border-neutral-100 flex justify-end gap-4 shrink-0 bg-neutral-50/50">
            <button type="button" onClick={onClose} className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-900 transition-colors">Cancelar</button>
            <button type="submit" disabled={!selectedStudentId || items.length === 0} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-amber-100 active:scale-95 transition-all hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Printer size={18} /> Confirmar e Imprimir Recibo
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
