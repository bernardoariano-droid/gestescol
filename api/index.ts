import express from "express";
import { 
  pullFromSupabase, 
  pushItemToSupabase, 
  testConnection, 
  clearAllSupabaseData, 
  performFullBackup 
} from "../netlify/functions/supabase-helper.ts";

const app = express();

// Maximize JSON body limit for full-backup uploads
app.use(express.json({ limit: '50mb' }));

const router = express.Router();

// Database Connection Health Check
router.get("/test-connection", async (req, res) => {
  try {
    const connected = await testConnection();
    res.json({ connected });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro de ligação ao Supabase." });
  }
});

// Pull All Data from Database
router.get("/get-data", async (req, res) => {
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
router.post("/sync-data", async (req, res) => {
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
router.post("/clear-database", async (req, res) => {
  try {
    await clearAllSupabaseData();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao limpar dados." });
  }
});

// Perform Server-Side Full Backup Upload
router.post("/full-backup", async (req, res) => {
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

// Support both /api/... and direct /... rewrites on Vercel
app.use("/api", router);
app.use("/", router);

export default app;
