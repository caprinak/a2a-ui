# A2A Agent Server (Gemini + Ollama + Groq)

An A2A protocol server with **3 free options** to use.

## Free Options

| Provider | Free? | Setup Required |
|----------|-------|----------------|
| **Ollama** | ✅ 100% free | Install app |
| **Groq** | ✅ Free tier | Get API key |
| **Gemini** | ❌ Needs paid key | Get API key |

---

## Quick Start

### Option 1: Ollama (Recommended - Fully Free)

```bash
# 1. Install Ollama from https://ollama.com
# 2. Run the agent:

cd agent
set PROVIDER=ollama
set OLLAMA_MODEL=llama3.2:1b
npm start
```

### Option 2: Groq (Free API Key)

```bash
# 1. Get free API key from https://console.groq.com/keys
# 2. Run:

cd agent
set PROVIDER=groq
set GROQ_API_KEY=your_groq_key_here
npm start
```

### Option 3: Gemini (Needs Paid Key)

```bash
cd agent
set PROVIDER=gemini
set GEMINI_API_KEY=your_gemini_key
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROVIDER` | `ollama` | `gemini`, `ollama`, or `groq` |
| `OLLAMA_MODEL` | `llama3` | Ollama model |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama URL |
| `GROQ_API_KEY` | - | Your Groq API key |
| `GROQ_MODEL` | `llama-3.1-70b-versatile` | Groq model |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model |
| `PORT` | `41241` | Server port |

---

## Recommended: Ollama Setup

1. **Download Ollama:** https://ollama.com
2. **Install and run:** It runs automatically on port 11434
3. **Start agent:**
```bash
set PROVIDER=ollama
set OLLAMA_MODEL=llama3.2:1b
npm start
```

Popular free Ollama models:
- `llama3` - Best overall
- `mistral` - Fast
- `codellama` - Code focused
- `phi3` - Lightweight

---

## Groq Free Tier

1. Go to https://console.groq.com/keys
2. Create free account
3. Create API key
4. Run:
```bash
set PROVIDER=groq
set GROQ_API_KEY=gsk_your_key_here
npm start
```

Free tier: ~60 requests/minute, excellent speed!

---

## Connecting to UI

1. Start agent: `npm start` (in agent folder)
2. Open http://localhost:3000
3. Add agent URL: `http://localhost:41241`
