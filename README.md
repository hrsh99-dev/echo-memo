<div align="center">

# 🎙️ EchoMemo

**A voice-first AI second brain for people who can't keep up with life's noise.**

*Built for a friend who forgets everything — lectures, meetings, ideas, deadlines.*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Vector_Search-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice_AI-black?logo=elevenlabs&logoColor=white)](https://elevenlabs.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)

</div>

---

## 💡 The Story

My college friend can never remember things — she records lectures but never reviews them, jots ideas on napkins that vanish, and misses deadlines because tasks live in 12 different places.

**EchoMemo** is the assistant I built for her: speak or type a thought, and AI turns it into organized notes, extracts every action item, and lets you search everything with natural language.

## ✨ Features

| Feature | What it does |
|---|---|
| 🎤 **Voice Capture** | Record voice memos → auto-transcribed via **ElevenLabs Speech-to-Text** |
| 📝 **Smart Notes** | Rich text notes with tags, full-text search, and markdown editing |
| 🧠 **AI Processing** | Gemini summarises notes, classifies them, and extracts actionable tasks |
| 📥 **Smart Inbox** | AI-processed notes sorted by category (task, idea, meeting, journal…) |
| ✅ **Task Manager** | Accept AI suggestions or create tasks manually, with priorities & due dates |
| 💬 **Ask Echo (RAG)** | Ask natural-language questions grounded in notes using **MongoDB Atlas Vector Search** + Gemini |
| 🔊 **Lifelike Speech** | **ElevenLabs Text-to-Speech** reads answers back with high-fidelity realistic voices |
| 🎙️ **Voice Questions** | Speak your questions to Ask Echo instead of typing |
| 🔐 **Auth** | JWT + bcrypt, refresh tokens, secure session management |

## 🏗️ Tech Stack

```
Frontend:              React 19 + TypeScript + Vite
Backend:               FastAPI + Python 3.11+ (Motor async driver)
Database & Search:     MongoDB Atlas (Document Store + Atlas Vector Search)
Voice AI:              ElevenLabs (Speech-to-Text Transcription & Text-to-Speech Synthesis)
Intelligence & RAG:    Google Gemini (Summarization, Extraction, Embeddings & Generation)
Authentication:        JWT + bcrypt + refresh tokens
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** and **Node.js 18+**
- **MongoDB Atlas** cluster ([Get a free M0 cluster](https://www.mongodb.com/atlas))
- **ElevenLabs API key** ([Get an API key](https://elevenlabs.io))
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
# Edit .env with your MongoDB Atlas URI, ElevenLabs API key, and Gemini API key
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

### 4. (Optional) MongoDB Atlas Vector Search Index

EchoMemo uses **MongoDB Atlas Vector Search** for semantic note retrieval (RAG).

In the MongoDB Atlas web console:
1. Navigate to your cluster → **Atlas Search** / **Vector Search**.
2. Create a Vector Search index on the `notes` collection named `autoembed_index`:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "user_id"
    }
  ]
}
```
*(If the index is not yet built, EchoMemo automatically falls back to in-memory cosine similarity search.)*

### 5. (Optional) Seed demo data

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
│   │   ├── core/           # Config, MongoDB Atlas client, security
│   │   ├── models/         # Pydantic schemas
│   │   ├── routers/        # API route handlers
│   │   └── services/       # ElevenLabs STT/TTS, Gemini AI, vector search
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
   - `MONGODB_URI` — your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `ELEVENLABS_API_KEY` — your ElevenLabs API key
   - `GEMINI_API_KEY` — your Google AI Gemini API key
   - `AUTH_SECRET` — random JWT signing secret
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
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `MONGODB_DATABASE` | | Database name (default: `echomemo`) |
| `VECTOR_SEARCH_INDEX` | | MongoDB Atlas Vector Search index name (default: `autoembed_index`) |
| `AUTH_SECRET` | ✅ | JWT signing secret |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API key (speech-to-text transcription & lifelike TTS) |
| `ELEVENLABS_VOICE_ID` | | ElevenLabs Voice ID (default: `21m00Tcm4TlvDq8ikWAM` - Rachel) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (note processing, embeddings, RAG) |
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
| POST | `/api/v1/capture/transcribe` | Upload audio for **ElevenLabs** Speech-to-Text transcription |
| POST | `/api/v1/assistant/speech` | Generate lifelike speech using **ElevenLabs** Text-to-Speech |
| GET/POST | `/api/v1/notes` | List / create notes |
| GET/PUT/DELETE | `/api/v1/notes/{id}` | CRUD single note |
| POST | `/api/v1/inbox/{id}/process` | AI-process a note (Gemini summarization & extraction) |
| POST | `/api/v1/inbox/{id}/accept` | Accept AI task suggestions |
| GET | `/api/v1/inbox` | List AI-processed notes |
| GET/POST | `/api/v1/tasks` | List / create tasks |
| POST | `/api/v1/ask` | RAG question answering (**MongoDB Atlas Vector Search** + Gemini) |
| GET | `/api/v1/health/live` | Health check & service readiness |

---

<div align="center">

**Built with ❤️ for a friend who forgets everything**

*EchoMemo — Capture it now. Find it when it matters.*

</div>

