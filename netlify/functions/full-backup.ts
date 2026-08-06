import { Handler } from "@netlify/functions";
import { performFullBackup } from "./supabase-helper";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { data } = JSON.parse(event.body || "{}");
    if (!data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Dados para cópia de segurança em falta." }),
      };
    }

    await performFullBackup(data);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Erro ao efetuar cópia de segurança no banco de dados." }),
    };
  }
};

export { handler };
