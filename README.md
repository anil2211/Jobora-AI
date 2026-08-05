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
3. **Build the extension**:
   ```bash
   npm run build
   ```
4. **Load into Chrome**:
   - Open `chrome://extensions`
   - Enable **Developer Mode** (top right).
   - Click **Load unpacked** and select the `extension/dist` folder.

---

## 🛣️ API Endpoints

### Jobs
- `POST /api/jobs/extract`: Extracts job data from raw text using AI and saves it to the database.
- `POST /api/jobs`: Saves a job object directly to the database.
- `GET /api/jobs`: Retrieves a list of all saved jobs.
- `GET /api/jobs/export`: Generates and downloads an Excel spreadsheet containing all saved jobs.

---
