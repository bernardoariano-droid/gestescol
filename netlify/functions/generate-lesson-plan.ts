import { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { theme, subtheme, targetClass } = JSON.parse(event.body || "{}");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "A chave de API do Gemini (GEMINI_API_KEY) não está configurada nas variáveis de ambiente do Netlify." }),
      };
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

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: cleanText,
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao gerar o plano de aula com o Assistente AI: " + error.message }),
    };
  }
};

export { handler };
