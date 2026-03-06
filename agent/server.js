/**
 * A2A Agent Server - Supports both Gemini and Ollama
 * 
 * Environment Variables:
 *   PROVIDER=gemini|ollama
 *   GEMINI_API_KEY=your_gemini_api_key (if using Gemini)
 *   OLLAMA_HOST=http://localhost:11434 (if using Ollama)
 *   OLLAMA_MODEL=llama3 (if using Ollama)
 *   PORT=41241
 */

import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 41241;

// Configuration
const PROVIDER = (process.env.PROVIDER || 'ollama').toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

// Middleware
// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Initialize Gemini if needed
let genAI, geminiModel;
if (PROVIDER === 'gemini') {
  if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable not set!');
    console.error('Get your API key from: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  console.log(`✓ Using Gemini model: ${GEMINI_MODEL}`);
} else if (PROVIDER === 'ollama') {
  console.log(`✓ Using Ollama model: ${OLLAMA_MODEL} @ ${OLLAMA_HOST}`);
} else if (PROVIDER === 'groq') {
  if (!GROQ_API_KEY) {
    console.error('ERROR: GROQ_API_KEY environment variable not set!');
    console.error('Get your free API key from: https://console.groq.com/keys');
    process.exit(1);
  }
  console.log(`✓ Using Groq model: ${GROQ_MODEL}`);
}

// In-memory storage
const tasks = new Map();
const conversations = new Map();

// Agent Card
const providerNames = {
  gemini: 'Google Gemini',
  ollama: `Ollama ${OLLAMA_MODEL}`,
  groq: `Groq ${GROQ_MODEL}`
};

const agentCard = {
  name: providerNames[PROVIDER] || 'AI Assistant',
  description: `An AI assistant powered by ${PROVIDER === 'ollama' ? `Ollama (${OLLAMA_MODEL})` : PROVIDER === 'groq' ? `Groq (${GROQ_MODEL})` : 'Google Gemini API'}. 
Can answer questions, provide explanations, help with coding, and more.`,
  url: `http://localhost:${PORT}`,
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [
    {
      id: 'general-assistant',
      name: 'General Assistant',
      description: 'General purpose AI assistant for Q&A, coding, writing, and analysis.',
      examples: ['What is machine learning?', 'Write a Python function', 'Explain quantum computing'],
      inputModes: ['text'],
      outputModes: ['text']
    }
  ]
};

// ==================== Routes ====================

// Handle Chrome DevTools well-known request to avoid 404/CSP errors
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({});
});

app.get('/.well-known/agent.json', (req, res) => res.json(agentCard));
app.get('/health', (req, res) => res.json({ status: 'ok', provider: PROVIDER }));

// ==================== LLM Calls ====================

async function callLLM(prompt, history = []) {
  if (PROVIDER === 'ollama') {
    return callOllama(prompt, history);
  } else if (PROVIDER === 'groq') {
    return callGroq(prompt, history);
  } else {
    return callGemini(prompt, history);
  }
}

async function callGemini(prompt, history) {
  let fullPrompt = prompt;
  if (history.length > 0) {
    fullPrompt = 'Previous conversation:\n';
    for (const msg of history) {
      fullPrompt += `${msg.role}: ${msg.content}\n`;
    }
    fullPrompt += `\nCurrent user: ${prompt}`;
  }

  const result = await geminiModel.generateContent(fullPrompt);
  return result.response.text();
}

async function callOllama(prompt, history) {
  const messages = [];

  if (history.length > 0) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content || 'No response';
}

async function callGroq(prompt, history) {
  const messages = [];

  if (history.length > 0) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response';
}

// ==================== JSON-RPC Handler ====================

app.post('/', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } });
  }

  try {
    let result;
    switch (method) {
      case 'agent/card':
        result = agentCard;
        break;
      case 'message/send':
      case 'message/stream':
        result = await handleMessageSend(params);
        break;
      case 'tasks/get':
        result = handleTaskGet(params);
        break;
      case 'tasks/cancel':
        result = handleTaskCancel(params);
        break;
      default:
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
    }
    res.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    console.error('Error:', error.message);
    res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: error.message } });
  }
});

// SSE Streaming
app.post('/stream', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const taskId = params?.id || uuidv4();
    const sessionId = params?.sessionId || uuidv4();
    const userMessage = extractText(params?.message?.parts || []);

    sendEvent({
      jsonrpc: '2.0', id, result: {
        id: taskId, status: {
          state: 'working',
          message: { messageId: `${taskId}-working`, role: 'agent', parts: [{ kind: 'text', text: 'Processing...' }] }
        }
      }
    });

    const history = conversations.get(sessionId) || [];
    const responseText = await callLLM(userMessage, history);

    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'model', content: responseText });
    conversations.set(sessionId, history);

    sendEvent({
      jsonrpc: '2.0', id, result: {
        id: taskId, artifact: { artifactId: 'default', parts: [{ kind: 'text', text: responseText }] }
      }
    });

    sendEvent({
      jsonrpc: '2.0', id, result: {
        id: taskId, status: { state: 'completed' }, final: true
      }
    });
  } catch (error) {
    sendEvent({ jsonrpc: '2.0', id, error: { code: -32603, message: error.message } });
  }
  res.end();
});

// ==================== Helpers ====================

function extractText(parts) {
  if (!parts || !Array.isArray(parts)) return '';
  return parts.filter(p => p.kind === 'text' || p.text).map(p => p.text || p.content || '').join('');
}

async function handleMessageSend(params) {
  const taskId = params.id || uuidv4();
  const sessionId = params.sessionId || uuidv4();
  const userMessage = extractText(params.message?.parts || []);

  if (!userMessage) {
    return { id: taskId, status: { state: 'failed', message: { messageId: `${taskId}-error`, role: 'agent', parts: [{ kind: 'text', text: 'No message content' }] } } };
  }

  const history = conversations.get(sessionId) || [];
  const responseText = await callLLM(userMessage, history);

  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'model', content: responseText });
  conversations.set(sessionId, history);

  const task = {
    id: taskId,
    sessionId,
    status: { state: 'completed', message: { messageId: `${taskId}-response`, role: 'agent', parts: [{ kind: 'text', text: responseText }] } },
    artifacts: [{ artifactId: 'default', parts: [{ kind: 'text', text: responseText }] }]
  };
  tasks.set(taskId, task);
  return task;
}

function handleTaskGet(params) {
  const task = tasks.get(params.id);
  return task || { id: params.id, status: { state: 'unknown' } };
}

function handleTaskCancel(params) {
  const task = tasks.get(params.id);
  if (task) { task.status.state = 'canceled'; tasks.set(params.id, task); }
  return { id: params.id, status: { state: 'canceled', message: { messageId: `${params.id}-canceled`, role: 'agent', parts: [{ kind: 'text', text: 'Task cancelled' }] } } };
}

// ==================== Start ====================

const modelInfo = PROVIDER === 'ollama' ? `${OLLAMA_MODEL} @ ${OLLAMA_HOST}` : GEMINI_MODEL;
console.log(`
╔═══════════════════════════════════════════════════╗
║         A2A Agent Server Started                   ║
╠═══════════════════════════════════════════════════╣
║  Provider:  ${PROVIDER.toUpperCase().padEnd(36)}║
║  Model:     ${modelInfo.padEnd(36)}║
║  Server:    http://localhost:${PORT}${' '.repeat(22)}║
╚═══════════════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log('Server ready! Connect to http://localhost:3000\n');
});
