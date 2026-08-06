# 🚀 AI Job Saver

AI Job Saver is a productivity tool that allows users to instantly capture job listings from any webpage. It uses AI to extract structured information (title, company, salary, etc.), stores it in a personal database, and allows for exporting the collection as an Excel spreadsheet.

## ✨ Features

- **One-Click Extraction**: Capture job details directly from your browser via a Chrome Extension.
- **AI-Powered Parsing**: Uses OpenAI GPT to transform raw webpage text into structured JSON data.
- **Database Integration**: Securely stores captured jobs in a Supabase (PostgreSQL) database.
- **Excel Export**: Download all saved jobs as a professionally formatted `.xlsx` spreadsheet.

## 🏗️ Architecture

The project consists of a Chrome Extension frontend and a Node.js backend.

### 🧩 Frontend: Chrome Extension
- **Framework**: React + Vite
- **Capabilities**:
  - Content scripts to extract visible text from the active tab.
  - Popup UI to trigger extraction and view results.
  - Integration with the backend API to save and manage jobs.
  - Backend URL is configurable via `VITE_API_URL` (see `extension/.env.example`).

### ⚙️ Backend: Node.js API

### ⚙️ Backend: Node.js API
- **Framework**: Express.js
- **AI Engine**: OpenAI API for structured data extraction.
- **Database**: Supabase (PostgreSQL) for job storage.
- **Export Engine**: `exceljs` for generating downloadable spreadsheets.

### 🗄️ Database Schema
- `jobs`: Stores extracted job details:
  - `title`, `company`, `location`, `salary`, `experience`, `employmentType`, `skills`, `description`, `source`, `url`.

---

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js (v16+)
- Supabase Account
- OpenAI API Key

### 🛠️ Backend Setup
1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` folder:
   ```env
   PORT=5000
   OPENAI_API_KEY=your_openai_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   ```
4. **Start the server**:
   ```bash
   npm run dev
   ```

### 🛠️ Extension Setup
1. **Navigate to extension directory**:
   ```bash
   cd extension
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **(Optional) Point the build at a specific backend**:
   Create `extension/.env` and set `VITE_API_URL` (e.g. `https://jobora-ai.onrender.com`).
   Without it, `npm run dev` uses `http://localhost:5000` and `npm run build` uses `https://jobora-ai.onrender.com`.
4. **Build the extension**:
   ```bash
   npm run build
   ```
5. **Load into Chrome**:
   - Open `chrome://extensions`
   - Enable **Developer Mode** (top right).
   - Click **Load unpacked** and select the `extension/dist` folder.

---

## 🚀 Deployment (Render)

The **backend** is already deployed as a Render Web Service at `https://jobora-ai.onrender.com`.
The **extension** is served as a Render **Static Site** (hosts the built `dist/` folder so it can be downloaded and installed).

### Required backend environment variables (already set on Render)
| Variable | Purpose |
| --- | --- |
| `PORT` | Render injects this automatically |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service-role key |
| `GROQ_API_KEY` | Groq API key used for job extraction |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET` | Secret used to sign JWTs |

### Deploy the extension to Render
Option A — **Blueprint** (recommended):
1. Commit and push the repo (includes `render.yaml`).
2. In Render: **New → Blueprint → connect the repo**.
3. It creates the `jobora-extension` static site using `extension/` as root, builds with `npm run build`, publishes `dist/`, and sets `VITE_API_URL=https://jobora-ai.onrender.com`.

Option B — **Dashboard**:
1. In Render: **New → Static Site → connect the repo**.
2. Set **Root Directory** to `extension`.
3. **Build Command**: `npm install && npm run build`.
4. **Publish Directory**: `dist`.
5. Add the env var `VITE_API_URL=https://jobora-ai.onrender.com` (and `NODE_VERSION=22`).
6. Deploy.

### Install the extension from the hosted site
1. Open the Render static-site URL (e.g. `https://jobora-extension.onrender.com`).
2. Download the files (or `git clone` + `npm run build` locally) — you need the built `dist/` folder.
3. Open `chrome://extensions`, enable **Developer Mode**, click **Load unpacked**, and select that `dist/` folder.

### Google Cloud Console notes
- Add the OAuth scope `https://www.googleapis.com/auth/userinfo.profile` to your OAuth consent screen (needed so the extension can read the user's name and profile picture).
- For `chrome.identity.getAuthToken` to work, the manifest `oauth2.client_id` must be a **Chrome Extension**-type OAuth client, and your extension ID (shown at `chrome://extensions`) must be registered against it. Since an unpacked extension's ID changes with its folder path, re-add the new ID whenever you install from a new location.

### Production database setup
The Supabase project referenced by `SUPABASE_URL`/`SUPABASE_KEY` must contain the `users` and `jobs` tables.
Run `database/schema.sql` in that project's **SQL Editor** (it is idempotent). If you already created the tables
manually, the script adds any missing columns (`spreadsheet_id`, `user_id`).

### Troubleshooting
- **`POST /api/auth/google` → 401 / 500 with "Cannot coerce the result to a single JSON object"**
  This is a Supabase error, not a Google login failure. It means the query against the `users` table failed on the
  server — most commonly the `users` table doesn't exist in the production database, or the `SUPABASE_KEY` on Render
  points to a different project / is not the service-role key. Run `database/schema.sql`, then check the backend's
  Render logs for the real PostgREST error.
- **Name/avatar not shown after login** — ensure the `userinfo.profile` OAuth scope is granted (see Google Cloud notes)
  and re-login so the backend refreshes the stored `name`/`avatar`.
Name and avatar is shown
---

## 🛣️ API Endpoints

### Jobs
- `POST /api/jobs/extract`: Extracts job data from raw text using AI and saves it to the database.
- `POST /api/jobs`: Saves a job object directly to the database.
- `GET /api/jobs`: Retrieves a list of all saved jobs.
- `GET /api/jobs/export`: Generates and downloads an Excel spreadsheet containing all saved jobs.

---
