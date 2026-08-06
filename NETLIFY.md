# Guia de Deploy no Netlify (EduGest)

Este guia explica como configurar as variáveis de ambiente no **Netlify** para realizar o deploy da aplicação com integração ao **Supabase**.

---

## 1. Configuração do Projeto no Netlify

1. Conecte o repositório GitHub ao Netlify.
2. Defina as seguintes configurações de build:
   - **Build Command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions` (já configurado no `netlify.toml`)

---

## 2. Variáveis de Ambiente no Netlify

Aceda a **Site configuration** > **Environment variables** no painel do Netlify e adicione as seguintes variáveis:

### 🔹 Para o Frontend (Vite)
- `VITE_SUPABASE_URL` = `https://fhrgnhhuolordpilluak.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_v2rgrQIuuNzaHflL9qwyNg_24LB85yZ`

### 🔹 Para o Backend (Netlify Functions / Proxy API)
- `SUPABASE_URL` = `https://fhrgnhhuolordpilluak.supabase.co`
- `SUPABASE_ANON_KEY` = `sb_publishable_v2rgrQIuuNzaHflL9qwyNg_24LB85yZ`
- *(Opcional)* `SUPABASE_SERVICE_ROLE_KEY` = *(Sua chave de serviço caso queira bypass em RLS no backend)*

### 🔹 Para o Assistente de Inteligência Artificial (Opcional)
- `GEMINI_API_KEY` = *(Sua chave API do Google Gemini)*

---

## 3. Resumo da Estrutura

- **Frontend (`src/supabase.ts`)**: Lê prioritariamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, com fallback automático.
- **Backend Netlify (`netlify/functions/supabase-helper.ts`)**: Lê prioritariamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`, com suporte a variáveis `VITE_`.
- **Redirecionamento (`netlify.toml`)**: Encaminha chamadas `/api/*` automaticamente para as Netlify Functions.
