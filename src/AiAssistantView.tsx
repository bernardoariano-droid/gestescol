import React, { useState } from 'react';
import { Bot, Sparkles, BookOpen, Clock, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface AiAssistantViewProps {
  currentUser: any;
}

export function AiAssistantView({ currentUser }: AiAssistantViewProps) {
  const [theme, setTheme] = useState('');
  const [subtheme, setSubtheme] = useState('');
  const [targetClass, setTargetClass] = useState('7ª Classe');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<any>(null);

  const handleGenerate = async () => {
    if (!theme) {
      alert('Por favor, insira o Tema/Unidade Temática.');
      return;
    }
    if (!subtheme) {
      alert('Por favor, insira o Subtema.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, subtheme, targetClass })
      });
      
      const data = await response.json();
      if (response.ok) {
        setLessonPlan(data);
      } else {
        alert('Erro ao gerar plano: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error(error);
      alert('Erro na conexão. Verifique se o backend está a correr.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    if (!lessonPlan) return;
    
    const doc = new jsPDF({ format: 'a4' });
    let currentY = 20;
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Plano de Aula', 105, currentY, { align: 'center' });
    currentY += 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Classe:`, 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(lessonPlan.targetClass || targetClass, 40, currentY);
    
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`Tema:`, 20, currentY);
    doc.setFont('helvetica', 'normal');
    const splitTheme = doc.splitTextToSize(lessonPlan.theme || theme, 150);
    doc.text(splitTheme, 35, currentY);
    currentY += splitTheme.length * 6;
    
    currentY += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtema:`, 20, currentY);
    doc.setFont('helvetica', 'normal');
    const splitSubtheme = doc.splitTextToSize(lessonPlan.subtheme || subtheme, 140);
    doc.text(splitSubtheme, 45, currentY);
    currentY += splitSubtheme.length * 6 + 5;
    
    // Objectives
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Objectivos Específicos', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(11);
    const drawObjective = (title: string, items: string[]) => {
      if (!items || items.length === 0) return;
      doc.setFont('helvetica', 'bold');
      doc.text(title, 25, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      items.forEach(item => {
        const text = doc.splitTextToSize(`• ${item}`, 160);
        doc.text(text, 30, currentY);
        currentY += text.length * 5;
      });
      currentY += 2;
    };
    
    drawObjective('Cognitivos:', lessonPlan.objectives?.cognitive);
    drawObjective('Afectivos:', lessonPlan.objectives?.affective);
    drawObjective('Psicomotores:', lessonPlan.objectives?.psychomotor);
    
    currentY += 5;
    if (currentY > 270) { doc.addPage(); currentY = 20; }
    
    // Methodology
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Sugestões Metodológicas', 20, currentY);
    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const splitMethodology = doc.splitTextToSize(lessonPlan.methodology, 170);
    doc.text(splitMethodology, 20, currentY);
    currentY += splitMethodology.length * 6 + 5;
    
    if (currentY > 270) { doc.addPage(); currentY = 20; }
    
    // Materials
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Meios de Ensino', 20, currentY);
    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const materials = (lessonPlan.materials || []).join(', ');
    const splitMaterials = doc.splitTextToSize(materials, 170);
    doc.text(splitMaterials, 20, currentY);
    currentY += splitMaterials.length * 6 + 5;
    
    if (currentY > 250) { doc.addPage(); currentY = 20; }
    
    // Activities
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Desenvolvimento da Aula (Actividades)', 20, currentY);
    currentY += 8;
    
    const activitiesData = (lessonPlan.activities || []).map((act: any) => [
      act.phase || '',
      act.duration || '',
      act.description || ''
    ]);
    
    (doc as any).autoTable({
      startY: currentY,
      head: [['Fase', 'Tempo', 'Descrição da Actividade']],
      body: activitiesData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
    
    if (currentY > 260) { doc.addPage(); currentY = 20; }
    
    // References
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Referências Bibliográficas', 20, currentY);
    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    (lessonPlan.references || []).forEach((ref: string) => {
      const text = doc.splitTextToSize(`• ${ref}`, 170);
      doc.text(text, 20, currentY);
      currentY += text.length * 5;
    });
    
    doc.save(`Plano_Aula_${theme.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleEditLessonPlan = (field: string, value: any, subfield?: string) => {
    setLessonPlan((prev: any) => {
      const updated = { ...prev };
      if (subfield) {
        if (!updated[field]) updated[field] = {};
        updated[field][subfield] = value;
      } else {
        updated[field] = value;
      }
      return updated;
    });
  };

  const updateObjective = (type: 'cognitive' | 'affective' | 'psychomotor', index: number, value: string) => {
    setLessonPlan((prev: any) => {
      const updated = { ...prev };
      if (!updated.objectives) updated.objectives = { cognitive: [], affective: [], psychomotor: [] };
      if (!updated.objectives[type]) updated.objectives[type] = [];
      updated.objectives[type][index] = value;
      return updated;
    });
  };
  
  const updateActivity = (index: number, field: string, value: string) => {
    setLessonPlan((prev: any) => {
      const updated = { ...prev };
      if (!updated.activities) updated.activities = [];
      if (!updated.activities[index]) updated.activities[index] = {};
      updated.activities[index][field] = value;
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
            <Bot className="text-blue-600" size={32} />
            Assistente Pedagógico AI
          </h2>
          <p className="text-neutral-500 font-medium mt-1">Gere planos de aula alinhados ao plano curricular angolano instantaneamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-neutral-200 shadow-sm space-y-4">
            <h3 className="font-black text-neutral-900 text-lg flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              Configurar Aula
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Classe / Ano</label>
              <select 
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="1ª Classe">1ª Classe</option>
                <option value="2ª Classe">2ª Classe</option>
                <option value="3ª Classe">3ª Classe</option>
                <option value="4ª Classe">4ª Classe</option>
                <option value="5ª Classe">5ª Classe</option>
                <option value="6ª Classe">6ª Classe</option>
                <option value="7ª Classe">7ª Classe</option>
                <option value="8ª Classe">8ª Classe</option>
                <option value="9ª Classe">9ª Classe</option>
                <option value="10ª Classe">10ª Classe</option>
                <option value="11ª Classe">11ª Classe</option>
                <option value="12ª Classe">12ª Classe</option>
                <option value="13ª Classe">13ª Classe</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Tema / Unidade Temática</label>
              <input 
                type="text" 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: A Célula"
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Subtema</label>
              <input 
                type="text" 
                value={subtheme}
                onChange={(e) => setSubtheme(e.target.value)}
                placeholder="Ex: Organelas Celulares"
                className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {isGenerating ? <><Loader2 className="animate-spin" size={20} /> A gerar plano...</> : <><Sparkles size={20} /> Gerar Plano de Aula</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {lessonPlan ? (
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-neutral-200 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h3 className="font-black text-2xl text-neutral-900 tracking-tight">Plano de Aula Gerado</h3>
                  <p className="text-neutral-500 font-medium">Pode editar os campos abaixo antes de exportar.</p>
                </div>
                <button 
                  onClick={handleExportPDF}
                  className="bg-neutral-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200 active:scale-95"
                >
                  <Download size={18} /> Exportar para PDF (A4)
                </button>
              </div>

              {/* Editable form fields */}
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Tema</label>
                    <input 
                      type="text" 
                      value={lessonPlan.theme || ''}
                      onChange={(e) => handleEditLessonPlan('theme', e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Subtema</label>
                    <input 
                      type="text" 
                      value={lessonPlan.subtheme || ''}
                      onChange={(e) => handleEditLessonPlan('subtheme', e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-neutral-800 border-b border-neutral-100 pb-2">1. Objectivos Específicos</h4>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Nível Cognitivo (Saber)</p>
                    {lessonPlan.objectives?.cognitive?.map((obj: string, i: number) => (
                      <input key={`cog-${i}`} type="text" value={obj} onChange={(e) => updateObjective('cognitive', i, e.target.value)} className="w-full p-3 bg-blue-50/30 border border-blue-100 rounded-xl text-sm" />
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Nível Afectivo (Saber Ser/Estar)</p>
                    {lessonPlan.objectives?.affective?.map((obj: string, i: number) => (
                      <input key={`aff-${i}`} type="text" value={obj} onChange={(e) => updateObjective('affective', i, e.target.value)} className="w-full p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm" />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-bold text-amber-600 uppercase tracking-wider">Nível Psicomotor (Saber Fazer)</p>
                    {lessonPlan.objectives?.psychomotor?.map((obj: string, i: number) => (
                      <input key={`psy-${i}`} type="text" value={obj} onChange={(e) => updateObjective('psychomotor', i, e.target.value)} className="w-full p-3 bg-amber-50/30 border border-amber-100 rounded-xl text-sm" />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-neutral-800 border-b border-neutral-100 pb-2">2. Sugestões Metodológicas</h4>
                  <textarea 
                    value={lessonPlan.methodology || ''}
                    onChange={(e) => handleEditLessonPlan('methodology', e.target.value)}
                    className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-neutral-800 border-b border-neutral-100 pb-2">3. Meios de Ensino</h4>
                  <textarea 
                    value={(lessonPlan.materials || []).join(', ')}
                    onChange={(e) => handleEditLessonPlan('materials', e.target.value.split(',').map((s: string) => s.trim()))}
                    className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-neutral-800 border-b border-neutral-100 pb-2">4. Desenvolvimento da Aula</h4>
                  <div className="space-y-3">
                    {lessonPlan.activities?.map((act: any, i: number) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                        <div className="w-full sm:w-1/4 space-y-2">
                          <input type="text" value={act.phase || ''} onChange={(e) => updateActivity(i, 'phase', e.target.value)} className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-sm font-bold" placeholder="Fase" />
                          <input type="text" value={act.duration || ''} onChange={(e) => updateActivity(i, 'duration', e.target.value)} className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-sm" placeholder="Tempo" />
                        </div>
                        <div className="flex-1">
                          <textarea value={act.description || ''} onChange={(e) => updateActivity(i, 'description', e.target.value)} className="w-full h-full min-h-[80px] p-3 bg-white border border-neutral-200 rounded-lg text-sm" placeholder="Descrição da Actividade" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-neutral-800 border-b border-neutral-100 pb-2">5. Referências Bibliográficas</h4>
                  <textarea 
                    value={(lessonPlan.references || []).join('\n')}
                    onChange={(e) => handleEditLessonPlan('references', e.target.value.split('\n'))}
                    className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm min-h-[100px]"
                  />
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-[32px] h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Bot size={40} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">Pronto para Gerar</h3>
              <p className="text-neutral-500 font-medium max-w-md mt-2">
                Preencha os dados da aula à esquerda e o Assistente Pedagógico criará um plano estruturado com objectivos cognitivos, afectivos e psicomotores.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
