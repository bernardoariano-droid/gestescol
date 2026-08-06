import { Handler } from "@netlify/functions";
import { clearAllSupabaseData } from "./supabase-helper";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    await clearAllSupabaseData();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Erro ao limpar dados do banco de dados." }),
    };
  }
};

export { handler };
