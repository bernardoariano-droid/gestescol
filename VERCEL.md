# 🚀 Guia de Implantação no Vercel - EduGest

Este guia explica passo a passo como realizar a implantação (deploy) da aplicação **EduGest** no **Vercel**, configurando o frontend React/Vite e as funções backend da API/Supabase/Gemini.

---

## 📋 Pré-requisitos

1. Uma conta gratuita ou pro na [Vercel](https://vercel.com).
2. O repositório do projeto no **GitHub**, **GitLab** ou **Bitbucket** (ou acesso ao [Vercel CLI](https://vercel.com/cli)).

---

## 🛠️ Método 1: Implantação Automática via GitHub (Recomendado)

1. Faça o **push** do seu projeto para o seu repositório no GitHub.
2. Aceda ao painel da [Vercel](https://vercel.com/dashboard) e clique em **"Add New..." > "Project"**.
3. Selecione o repositório do **EduGest** e clique em **Import**.
4. Nas definições do projeto:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expanda a secção **Environment Variables** e adicione as seguintes variáveis:

| Nome da Variável | Descrição / Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto no Supabase (ex: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anónima do Supabase |
| `SUPABASE_URL` | Opcional (Server backend): URL do Supabase |
| `SUPABASE_ANON_KEY` | Opcional (Server backend): Chave anónima do Supabase |
| `GEMINI_API_KEY` | (Opcional) Chave de API da Google Gemini para geração de planos de aula |

6. Clique em **Deploy**. O Vercel efetuará o build da aplicação e disponibilizará o link do seu site em segundos!

---

## 💻 Método 2: Implantação via Vercel CLI (Linha de Comandos)

Se preferir fazer o deploy diretamente a partir da linha de comandos:

1. Instale a Vercel CLI globalmente (se ainda não tiver):
   ```bash
   npm i -g vercel
   ```

2. No diretório raiz do projeto, execute o comando de deploy:
   ```bash
   vercel
   ```

3. Siga as instruções no ecrã para associar à sua conta e aceitar os parâmetros predefinidos.

4. Para enviar para o ambiente de produção definitivo, execute:
   ```bash
   vercel --prod
   ```

---

## ⚙️ Ficheiros de Configuração Incluídos no Projeto

- `vercel.json`: Define as regras de reescrita para que as rotas da API `/api/*` sejam encaminhadas para o backend serverless (`api/index.ts`) e todas as outras rotas SPA terminem em `index.html`.
- `api/index.ts`: Handler Serverless do Express para endpoints de sincronização do Supabase e geração de planos de aula com o Gemini.
- `.env.example`: Modelo de variáveis de ambiente do projeto.

---

## 📱 Dúvidas ou Suporte

Caso enfrente qualquer problema durante o deploy, verifique se todas as variáveis de ambiente foram configuradas corretamente nas definições do projeto no painel da Vercel (*Settings > Environment Variables*).
