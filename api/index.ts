import express from "express";
import { GoogleGenAI } from "@google/genai";
import { 
  pullFromSupabase, 
  pushItemToSupabase, 
  testConnection, 
  clearAllSupabaseData, 
  performFullBackup 
} from "../netlify/functions/supabase-helper.js";

const app = express();

// Maximize JSON body limit for full-backup uploads
app.use(express.json({ limit: '50mb' }));

// Database Connection Health Check
app.get("/api/test-connection", async (req, res) => {
  try {
    const connected = await testConnection();
    res.json({ connected });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro de ligação ao Supabase." });
  }
});

// Pull All Data from Database
app.get("/api/get-data", async (req, res) => {
  try {
    const data = await pullFromSupabase();
    if (!data) {
      res.status(404).json({ error: "Base de dados remota vazia ou inacessível." });
      return;
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao carregar dados remotos." });
  }
});

// Sync Single Item to Database
app.post("/api/sync-data", async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) {
      res.status(400).json({ error: "Ação de sincronização em falta." });
      return;
    }
    await pushItemToSupabase(action);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao sincronizar item." });
  }
});

// Clear All Database Data
app.post("/api/clear-database", async (req, res) => {
  try {
    await clearAllSupabaseData();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao limpar dados." });
  }
});

// Perform Server-Side Full Backup Upload
app.post("/api/full-backup", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      res.status(400).json({ error: "Dados para cópia de segurança em falta." });
      return;
    }
    await performFullBackup(data);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao efetuar cópia de segurança." });
  }
});

// AI Route
app.post("/api/generate-lesson-plan", async (req, res) => {
  try {
    const { theme, subtheme, targetClass } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Erro: GEMINI_API_KEY não está configurada nos segredos.");
      res.status(500).json({ error: 'A chave de API do Gemini (GEMINI_API_KEY) não está configurada no painel da Vercel.' });
      return;
    }

    const ai = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    
    const prompt = `Como um Especialista em Pedagogia e Professor em Angola, crie um plano de aula detalhado.
Tema/Unidade Temática: ${theme}
Subtema: ${subtheme}
Classe: ${targetClass}

O plano deve seguir as orientações do plano curricular angolano e conter obrigatoriamente a seguinte estrutura em formato JSON:
{
  "theme": "Nome do Tema",
  "subtheme": "Nome do Subtema",
  "targetClass": "Nome da Classe",
  "objectives": {
    "cognitive": ["objetivo 1", "objetivo 2"],
    "affective": ["objetivo 1", "objetivo 2"],
    "psychomotor": ["objetivo 1", "objetivo 2"]
  },
  "methodology": "Descrição das sugestões metodológicas (ex: Trabalho em grupo, exposição, debate...)",
  "materials": ["giz", "quadro", "livro", "outro material"],
  "activities": [
    {
      "phase": "Introdução",
      "duration": "10 min",
      "description": "Descrição da atividade introdutória"
    },
    {
      "phase": "Desenvolvimento",
      "duration": "25 min",
      "description": "Descrição da atividade principal"
    },
    {
      "phase": "Conclusão",
      "duration": "10 min",
      "description": "Descrição da atividade de consolidação e avaliação"
    }
  ],
  "references": ["Referência 1", "Referência 2"]
}

Por favor, responda apenas com o JSON válido, sem markdown adicional.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = (response.text || '').trim();
    let cleanText = text;
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, "");
      cleanText = cleanText.replace(/\s*```$/, "");
    }
    cleanText = cleanText.trim();
    res.json(JSON.parse(cleanText));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar o plano de aula com o Assistente AI' });
  }
});

export default app;
