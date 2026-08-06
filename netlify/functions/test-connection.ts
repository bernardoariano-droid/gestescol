import { Handler } from "@netlify/functions";
import { testConnection } from "./supabase-helper";

const handler: Handler = async (event) => {
  try {
    const connected = await testConnection();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connected }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Erro ao testar ligação à base de dados." }),
    };
  }
};

export { handler };
