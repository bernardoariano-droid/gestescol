import { Handler } from "@netlify/functions";
import { pullFromSupabase } from "./supabase-helper";

const handler: Handler = async (event) => {
  try {
    const data = await pullFromSupabase();
    if (!data) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Nenhum dado encontrado ou tabelas não inicializadas." }),
      };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Erro ao carregar dados remotos." }),
    };
  }
};

export { handler };
