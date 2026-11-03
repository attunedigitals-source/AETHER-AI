# Aether AI — Premium Claude-Like AI Chat Application
### Powered Exclusively by Verified OpenRouter Free-Tier Models

Aether AI is a production-quality conversational AI application inspired by Anthropic Claude, engineered with a warm minimalist editorial aesthetic, rich document processing, mathematical rendering, and an uncompromising architectural guarantee: **100% Free-Tier Models via OpenRouter**.

![Aether Architecture](https://raw.githubusercontent.com/antigravity/aether-preview/main/banner.png)

---

## 🌟 Key Features

### 1. Strict Free-Only Model Enforcement (Fail-Closed)
- **Zero Paid Token Policy**: Backend validates every model ID dynamically from OpenRouter (`GET /models`).
- **Enforcement Rules**:
  - Model ID must explicitly end with `:free` (e.g., `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-r1:free`).
  - Model pricing metadata must verify zero cost (`prompt === "0"` and `completion === "0"`).
  - Any model without verified free status is instantly rejected. No paid models, paid fallbacks, or silent upgrades are ever permitted.
- **Dynamic Discovery & Caching**: Discover new free models released on OpenRouter in real time with the in-app refresh button.
- **Alternative Free Suggestions**: If an active model experiences temporary free-tier rate limits (HTTP 429), Aether suggests alternative verified free models to switch seamlessly.

### 2. Claude-Inspired User Interface & Design
- **Warm Editorial Aesthetic**: Crafted with warm parchment tones (`#FAF9F5`), charcoal obsidian dark mode (`#1C1B18`), terracotta coral accents (`#D96B43`), and crisp typography.
- **Responsive Layout**: Fluid experience across desktop workstations, tablets, and mobile devices with collapsible navigation.
- **Welcome Screen**: Clean Claude-style greeting with 6 guided prompt cards:
  - *Help me write something*
  - *Explain a complicated topic*
  - *Write and debug code*
  - *Analyze a document*
  - *Brainstorm creative ideas*
  - *Research a topic*

### 3. Conversational AI & Streaming Experience
- **Real-time Streaming**: Server-Sent Events (SSE) streaming with cancellation (stop generation) and instant token rendering.
- **Rich Markdown & Syntax Highlighting**:
  - LaTeX mathematical equations using KaTeX (`$...$` inline, `$$...$$` display).
  - Code blocks with language tags, line counter, one-click copy with checkmark animation, and snippet download.
  - Formatted tables, blockquotes, ordered/unordered lists, and task lists.
- **Message Controls**:
  - Inline editing of previous user messages with automatic context branching.
  - Regenerate responses with the same free model.
  - Switch model & regenerate using an alternate free model.
  - Multi-version history tracking (`< 1 / 2 >`).
  - Thumbs up / Thumbs down feedback.

### 4. Free Model Comparison Arena
- Test and compare **two free models side-by-side** simultaneously on the same prompt (e.g., Llama 3.3 70B vs. DeepSeek V3).

### 5. Multi-format File & Document Processing
- Attach and extract text from:
  - **PDF documents** (`pdf-parse`)
  - **Word documents** (.docx via `mammoth`)
  - **Spreadsheets** (.xlsx, .xls, .csv via `xlsx`)
  - **Code & Data** (.ts, .js, .py, .json, .md, .txt, .html, .css)
  - **Images** (.png, .jpg, .webp) with base64 data encoding
- **Vision Modality Validation**: Automatic verification of whether the selected free model supports multimodal vision inputs (e.g., Google Gemini 2.0 Flash Exp). Warns user if an image is attached to a text-only model.
- **Context-Aware Truncation**: Intelligently chunks oversized documents to prevent exceeding model context windows.

### 6. Projects & Custom Instructions
- **Workspaces**: Organize conversations by project or subject.
- **Custom Instructions**: Define project-specific system instructions and global instructions injected into every model prompt.

### 7. Dual Storage Architecture (Supabase PostgreSQL + Local Persistence)
- **Supabase Cloud Ready**: Production PostgreSQL database schema with Row Level Security (RLS) ensuring strict tenant isolation.
- **Instant Out-of-the-Box Fallback**: If Supabase credentials are not configured, Aether automatically persists all conversations, projects, and settings locally so you can start using it immediately without database setup.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 / 19, TypeScript, Vite |
| **Styling** | Tailwind CSS, Lucide Icons, Warm Claude Palette |
| **Markdown & Math** | ReactMarkdown, Remark-GFM, Remark-Math, KaTeX, Rehype-Highlight |
| **Backend API** | Node.js, Express, TypeScript, Multer, SSE |
| **Document Parsers** | `pdf-parse`, `mammoth`, `xlsx` |
| **AI Integration** | OpenRouter API (Base: `https://openrouter.ai/api/v1`) |
| **Database & Auth** | Supabase PostgreSQL + Auth (with Local JSON Fallback) |

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js 18+ (Node v20 or v22+ recommended)
- Free OpenRouter API Key ([https://openrouter.ai/settings/keys](https://openrouter.ai/settings/keys))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/aether-ai-chat.git
cd aether-ai-chat
npm install
```

### 2. Environment Variables Configuration
Copy the template file:
```bash
cp .env.example .env
```

Open `.env` and fill in your keys:
```env
# Mandatory for AI Inference (Free key from openrouter.ai/settings/keys)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=Aether AI
OPENROUTER_SITE_URL=http://localhost:5173

# Server Port
PORT=3001
NODE_ENV=development

# Supabase (Optional: Leave blank for instant local persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Run Development Server
To run both backend API server and frontend client concurrently:
```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3001](http://localhost:3001)

---

## 🗄️ Supabase PostgreSQL Setup (Optional for Cloud Sync)

1. Create a free project at [https://supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, paste the entire SQL content into the editor, and click **Run**.
4. The script creates:
   - `profiles` table with automatic sync trigger on user signup
   - `projects` table
   - `conversations` table
   - `messages` table with cascade delete
   - `user_settings` table
   - Strict Row Level Security (RLS) policies ensuring users cannot access other users' data.
5. In your Supabase Project Settings under **API**, copy your **Project URL** and **anon public key** into `.env`.

---

## 🛡️ Strict Free-Model Architecture & Testing

Aether's core architectural principle is that paid models can **never** be executed.

### How the Free Filter Operates:
1. Every model retrieved from `GET /models` must end in `:free`.
2. Pricing metadata must explicitly be `0` for prompt and completion.
3. When `/api/chat/stream` receives a request, the backend independently revalidates the `modelId` against the verified free cache.
4. If a client attempts to submit a paid model ID (e.g. `anthropic/claude-3.5-sonnet` or `openai/gpt-4o`), the backend fails closed immediately with HTTP 403 Forbidden.

### Running Unit & Integration Tests:
```bash
npm run test
```
Tests verify:
- Free model suffix validation
- Rejection of paid models without `:free`
- Rejection of pseudo-free models with non-zero pricing
- Detection of vision capabilities
- Fail-closed behavior on inference endpoints

---

## 📦 Production Deployment

### Build the Application
```bash
npm run build
```
This produces:
- `dist/` containing compiled Vite frontend assets
- `dist/server/` containing the compiled Node.js backend

### Production Run
Set `NODE_ENV=production` in `.env` and start:
```bash
node dist/server/index.js
```
The Express server serves the static frontend assets and the secure API on the specified port.

---

## 🔒 Security Best Practices
- **API Keys**: OpenRouter and Supabase service keys remain exclusively on the server and are never bundled into client JavaScript.
- **Fail-Closed**: Requests for non-free models fail with immediate rejection.
- **Row Level Security**: Each user query is authenticated and filtered through RLS.

---

## 📄 License
MIT License. Built for seamless, powerful, and accessible AI workflows.

