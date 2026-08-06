import { Handler } from "@netlify/functions";
import { pushItemToSupabase } from "./supabase-helper";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { action } = JSON.parse(event.body || "{}");
    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Ação de sincronização em falta." }),
      };
    }

    await pushItemToSupabase(action);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Erro ao sincronizar item." }),
    };
  }
};

export { handler };
