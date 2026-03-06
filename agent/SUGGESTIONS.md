# 🚀 A2A Agent Server — Improvement Suggestions

A comprehensive list of suggestions to make the agent more robust, feature-rich, and production-ready.

---

## 1. 🧠 System Prompt / Persona Support

**What**: Allow configuring a custom system prompt via environment variable or a `system-prompt.txt` file.

**Why**: Right now the agent has no personality or instructions — it just forwards raw user messages. A system prompt lets you shape the agent's behavior (e.g., "You are a helpful coding assistant that responds in Vietnamese").

**How**:
```js
// Add env var
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || '';

// Prepend to messages array in callOllama/callGroq
if (SYSTEM_PROMPT) {
  messages.unshift({ role: 'system', content: SYSTEM_PROMPT });
}
```

| Difficulty | Impact |
|------------|--------|
| ⭐ Easy    | 🔥 High |

---

## 2. 🔄 True Token-by-Token Streaming

**What**: Stream LLM tokens to the client in real-time instead of waiting for the full response.

**Why**: The current `/stream` endpoint calls the LLM with `stream: false`, collects the full response, and *then* sends SSE events. Users see a long wait followed by the entire answer at once.

**How**:
- For Ollama: set `stream: true` and iterate over the response chunks
- For Groq: use `stream: true` in the request and parse SSE chunks
- For Gemini: use `generateContentStream()` instead of `generateContent()`

| Difficulty | Impact |
|------------|--------|
| ⭐⭐ Medium | 🔥🔥 Very High |

---

## 3. 💾 Persistent Conversation Storage

**What**: Replace the in-memory `Map()` storage with a lightweight persistent store.

**Why**: All conversations and tasks are lost on every server restart.

**Options**:
- **SQLite** via `better-sqlite3` — zero config, single file DB
- **JSON file** via `lowdb` — even simpler for prototyping
- **Redis** — if you want shared state across instances

| Difficulty | Impact |
|------------|--------|
| ⭐⭐ Medium | 🔥 High |

---

## 4. ⏱️ Request Timeout & Retry Logic

**What**: Add timeouts to LLM calls and automatic retries on transient failures.

**Why**: If Ollama or Groq is slow or temporarily down, the server hangs forever. No timeout, no retry.

**How**:
```js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s

const response = await fetch(url, {
  ...options,
  signal: controller.signal,
});
clearTimeout(timeout);
```

| Difficulty | Impact |
|------------|--------|
| ⭐ Easy    | 🔥 High |

---

## 5. 🛡️ Rate Limiting & Input Validation

**What**: Add rate limiting per IP and validate/sanitize incoming message content.

**Why**: Currently anyone can spam the server with unlimited requests. No input length limits either.

**How**:
- Use `express-rate-limit` for rate limiting
- Add `MAX_INPUT_LENGTH` env var to cap message size
- Validate JSON-RPC structure more strictly

| Difficulty | Impact |
|------------|--------|
| ⭐ Easy    | 🔥 High |

---

## 6. 🧰 Tool Use / Function Calling

**What**: Give the agent access to tools (web search, calculator, code execution, etc.).

**Why**: This transforms a simple chat agent into an *agentic* system that can take actions.

**Starter tools**:
| Tool | Description |
|------|-------------|
| `web_search` | Search the web via SerpAPI or Tavily |
| `calculator` | Evaluate math expressions |
| `get_weather` | Fetch weather data |
| `run_code` | Execute Python/JS snippets in a sandbox |
| `read_url` | Fetch and summarize a URL |

**How**: Ollama and Groq support OpenAI-compatible function calling. Gemini has native tool support.

| Difficulty | Impact |
|------------|--------|
| ⭐⭐⭐ Hard | 🔥🔥🔥 Transformative |

---

## 7. 📊 Conversation History Management

**What**: Add limits to conversation history and implement summarization.

**Why**: Unbounded history will eventually exceed the model's context window and cause errors or degraded performance.

**How**:
- Cap history at N messages (e.g., 20)
- When limit is reached, summarize older messages using the LLM
- Add a `DELETE /conversations/:sessionId` endpoint to clear history

| Difficulty | Impact |
|------------|--------|
| ⭐⭐ Medium | 🔥 High |

---

## 8. 📋 Multi-Skill Agent Card

**What**: Expand the agent card with multiple specialized skills.

**Why**: The A2A protocol supports skill-based routing. Right now there's only one generic skill.

**Example skills**:
```json
[
  { "id": "code-assistant", "name": "Code Assistant", "description": "Write, review, and debug code" },
  { "id": "translator", "name": "Language Translator", "description": "Translate text between languages" },
  { "id": "summarizer", "name": "Text Summarizer", "description": "Summarize long documents or articles" },
  { "id": "creative-writer", "name": "Creative Writer", "description": "Write stories, poems, and creative content" }
]
```

Each skill can have its own system prompt and configuration.

| Difficulty | Impact |
|------------|--------|
| ⭐⭐ Medium | 🔥 High |

---

## 9. 🔐 Authentication & API Keys

**What**: Add optional API key authentication for the agent server.

**Why**: Currently the server is wide open — anyone with the URL can use it.

**How**:
```js
const API_KEY = process.env.AGENT_API_KEY;

app.use((req, res, next) => {
  if (API_KEY && req.headers['authorization'] !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

| Difficulty | Impact |
|------------|--------|
| ⭐ Easy    | 🔥 High |

---

## 10. 📈 Health Check & Metrics Dashboard

**What**: Expand the `/health` endpoint with detailed metrics and add a simple stats page.

**Why**: No way to monitor agent performance, error rates, or usage patterns.

**Metrics to track**:
- Total requests served
- Average response time
- Active conversations count
- Error rate
- LLM provider status (is Ollama reachable?)
- Uptime

**How**: Add a `/metrics` endpoint returning JSON stats, or integrate with Prometheus.

| Difficulty | Impact |
|------------|--------|
| ⭐⭐ Medium | 🔥 Medium |

---

## 11. 🐳 dotenv Support & Better Config

**What**: Add `dotenv` package to load `.env` file automatically.

**Why**: The `.env.example` exists but the server doesn't actually load `.env` files. Users must export env vars manually.

**How**:
```bash
npm install dotenv
```
```js
import 'dotenv/config';  // Add as first import
```

| Difficulty | Impact |
|------------|--------|
| ⭐ Easy    | 🔥 Medium |

---

## 12. 🔀 Multi-Agent Orchestration

**What**: Allow this agent to discover and delegate tasks to other A2A agents.

**Why**: True A2A (Agent-to-Agent) power comes from agents collaborating. One agent could route specific skills to specialized agents.

**How**:
- Maintain a registry of known agent URLs
- Fetch their agent cards to discover capabilities
- Route requests to the best-matching agent based on skill

| Difficulty | Impact |
|------------|--------|
| ⭐⭐⭐ Hard | 🔥🔥🔥 Transformative |

---

## 13. 🧹 Code Quality Improvements

Quick wins to clean up the current codebase:

- [ ] Remove duplicate `// Middleware` comment on line 29-30
- [ ] Fix `credentials: true` + `origin: '*'` conflict (browsers reject this combo)
- [ ] Add `helmet` middleware for security headers
- [ ] Add `compression` middleware for gzip responses
- [ ] Add graceful shutdown handling (`SIGTERM`/`SIGINT`)
- [ ] Add input validation with `zod` or `joi`
- [ ] Add proper error classes instead of plain `Error`

---

## Priority Roadmap

| Priority | Suggestion | Effort |
|----------|-----------|--------|
| 🥇 P0 | System Prompt Support | Easy |
| 🥇 P0 | dotenv Support | Easy |
| 🥇 P0 | Request Timeout & Retry | Easy |
| 🥈 P1 | True Streaming | Medium |
| 🥈 P1 | Authentication | Easy |
| 🥈 P1 | Rate Limiting | Easy |
| 🥈 P1 | Conversation History Limits | Medium |
| 🥉 P2 | Persistent Storage | Medium |
| 🥉 P2 | Multi-Skill Agent Card | Medium |
| 🥉 P2 | Health Metrics | Medium |
| 🏅 P3 | Tool Use / Function Calling | Hard |
| 🏅 P3 | Multi-Agent Orchestration | Hard |
