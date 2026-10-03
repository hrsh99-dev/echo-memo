<div align="center">

# 🎙️ EchoMemo

**A voice-first AI second brain for people who can't keep up with life's noise.**

*Built for a friend who forgets everything — lectures, meetings, ideas, deadlines.*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)

</div>

---

## 💡 The Story

My college friend can never remember things — she records lectures but never reviews them, jots ideas on napkins that vanish, and misses deadlines because tasks live in 12 different places.

**EchoMemo** is the assistant I built for her: speak or type a thought, and AI turns it into organized notes, extracts every action item, and lets you search everything with natural language.

## ✨ Features

| Feature | What it does |
|---|---|
| 🎤 **Voice Capture** | Record voice memos → auto-transcribed via Whisper/Gemini |
| 📝 **Smart Notes** | Rich text notes with tags, search, and edit |
| 🧠 **AI Processing** | Gemini summarises notes, classifies them, and extracts tasks |
| 📥 **Smart Inbox** | AI-processed notes sorted by category (task, idea, meeting, journal…) |
| ✅ **Task Manager** | Accept AI suggestions or create tasks manually, with priorities & due dates |
| 💬 **Ask Echo (RAG)** | Ask natural-language questions grounded in your saved notes |
| 🔊 **Read Aloud** | Browser-native TTS reads AI answers back to you |
| 🎙️ **Voice Questions** | Speak your questions to Ask Echo instead of typing |
| 🔐 **Auth** | JWT + bcrypt, refresh tokens, secure session management |

## 🏗️ Tech Stack

```
Frontend:  React 19 + TypeScript + Vite
Backend:   FastAPI + Python 3.11+
Database:  MongoDB Atlas (with vector search)
AI:        Google Gemini (embeddings + generation)
Auth:      JWT + bcrypt + refresh tokens
TTS:       Web Speech API (browser-native, free)
STT:       Whisper via backend transcription endpoint
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** and **Node.js 18+**
- **MongoDB Atlas** cluster (free tier works)
- **Google Gemini API key** ([Get one free](https://aistudio.google.com/apikey))

### 1. Clone & setup backend

```bash
git clone https://github.com/your-username/echomemo.git
cd echomemo/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key
```

### 2. Setup frontend

```bash
cd ../frontend
npm install
```

### 3. Run locally

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** and create an account!

### 4. (Optional) Seed demo data

```bash
cd backend
python scripts/seed_data.py
```

This creates a demo account with 12 notes and 14 tasks:
- **Email:** `arjun.sharma@iitb.ac.in`
- **Password:** `Demo@1234`

## 📁 Project Structure

```
echomemo/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # Pydantic schemas
│   │   ├── routers/        # API route handlers
│   │   └── services/       # Business logic
│   ├── scripts/            # Seed data, utilities
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth & Toast providers
│   │   └── pages/          # Page components
│   ├── index.html
│   └── vite.config.ts
├── render.yaml             # One-click Render deployment
└── README.md
```

## 🌐 Deployment

### Render (recommended — one-click)

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your repo — Render reads `render.yaml` automatically
4. Add these secrets in the Render dashboard:
   - `MONGODB_URI` — your Atlas connection string
   - `GEMINI_API_KEY` — your Google AI key
5. Deploy!

### Manual deployment

**Backend** (any Python host — Railway, Fly.io, Render):
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend** (any static host — Vercel, Netlify, Render):
```bash
cd frontend
npm install && npm run build
# Deploy the `dist/` folder
```

Set `VITE_API_URL` in frontend to your backend's URL.

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DATABASE` | | Database name (default: `echomemo`) |
| `AUTH_SECRET` | ✅ | JWT signing secret |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `ELEVENLABS_API_KEY` | | ElevenLabs key (optional, for premium TTS) |
| `FRONTEND_ORIGIN` | | CORS origin (default: `http://localhost:5173`) |
| `VITE_API_URL` | | Frontend env — backend URL (default: `http://localhost:8000`) |

## 🧪 Testing

```bash
cd backend
pytest
```

## 📱 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login (returns JWT) |
| POST | `/api/v1/capture/transcribe` | Upload audio for transcription |
| GET/POST | `/api/v1/notes` | List / create notes |
| GET/PUT/DELETE | `/api/v1/notes/{id}` | CRUD single note |
| POST | `/api/v1/inbox/{id}/process` | AI-process a note |
| POST | `/api/v1/inbox/{id}/accept` | Accept AI task suggestions |
| GET | `/api/v1/inbox` | List AI-processed notes |
| GET/POST | `/api/v1/tasks` | List / create tasks |
| POST | `/api/v1/ask` | RAG question answering |
| GET | `/api/v1/health/live` | Health check |

---

<div align="center">

**Built with ❤️ for a friend who forgets everything**

*EchoMemo — Capture it now. Find it when it matters.*

</div>
