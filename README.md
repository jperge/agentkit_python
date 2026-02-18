# CDP AgentKit Chatbot — FastAPI + React

A demo chatbot powered by the OpenAI Agents SDK and Coinbase Developer Platform (CDP) AgentKit. Features a React frontend with a three-panel layout and a FastAPI backend with WebSocket streaming.

## What can the agent do?

- "What are my wallet details?"
- "Get my ETH balance"
- "Transfer 0.001 ETH to 0x..."
- "What is the price of BTC?"
- "Request testnet funds from the faucet"
- "Wrap 0.01 ETH to WETH"

## Requirements

- Python 3.10+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [CDP API Key](https://portal.cdp.coinbase.com/access/api)
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app (REST + WebSocket)
│   ├── agent_setup.py       # CDP Agent initialization & wallet persistence
│   └── models.py            # Pydantic request/response schemas
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main layout (3-panel: sidebar, chat, info)
│   │   ├── components/      # ChatPanel, ChatMessage, ChatInput, sidebars
│   │   ├── hooks/           # useWebSocket, useApi
│   │   └── types.ts         # TypeScript types
│   └── package.json
├── packages/
│   ├── coinbase-agentkit/                     # Vendored CDP AgentKit core
│   └── coinbase-agentkit-openai-agents-sdk/   # OpenAI Agents SDK adapter
├── chatbot.py               # Original CLI chatbot (standalone)
├── pyproject.toml
├── uv.lock
└── Makefile
```

## Setup

### 1. Configure environment variables

Copy `.env.local` to `.env` and fill in your keys:

```bash
cp .env.local .env
```

```
CDP_API_KEY_ID=organizations/...
CDP_API_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----\n
CDP_WALLET_SECRET=...
OPENAI_API_KEY=sk-proj-...
NETWORK_ID=base-sepolia
```

### 2. Install backend dependencies

**Option A — using uv (recommended):**

```bash
uv sync
```

**Option B — using pip + venv:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

## Running

### Quick start (recommended)

Starts both backend and frontend, killing any existing processes on the required ports:

```bash
make dev
```

To stop everything:

```bash
make kill
```

### Start individually

**Backend (with uv):**

```bash
cd backend
uv run python main.py
```

**Backend (with pip/venv):**

```bash
source .venv/bin/activate
cd backend
python main.py
```

Or with uvicorn directly:

```bash
cd backend
../.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --loop asyncio
```

The server starts on `http://localhost:8000`. On first launch it creates a CDP wallet and saves it to `backend/wallet_data_base_sepolia.txt`.

> **Note:** The backend must run with `--loop asyncio` because `nest_asyncio` used by the AgentKit SDK is incompatible with uvloop.

**Frontend:**

```bash
cd frontend
npm run dev
```

Or with Vite directly:

```bash
cd frontend
npx vite --host 0.0.0.0 --port 5173
```

Opens on `http://localhost:5173`. The UI has three panels:
- **Left sidebar** — Agent info, quick action buttons, tools list
- **Center** — Chat window with streaming responses
- **Right sidebar** — Live clock, wallet status, recent tool calls, stats

### Remote access

The frontend auto-detects the hostname from the browser URL to connect to the backend. No configuration needed — just access the app using the machine's hostname:

- Local: `http://localhost:5173` → connects to `localhost:8000`
- Remote: `http://emergence.fmr.com:5173` → connects to `emergence.fmr.com:8000`

Both work simultaneously since the servers bind to `0.0.0.0`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/wallet` | Wallet address, network, status |
| GET | `/api/tools` | List of available agent tools (13 tools) |
| POST | `/api/chat` | Non-streaming chat (`{"message": "..."}`) |
| WS | `/ws/chat` | Streaming chat with real-time tool call events |
| GET | `/docs` | Swagger UI |

### WebSocket Protocol

Send: `{"message": "your question"}`

Receive a sequence of events:

```json
{"type": "status",      "content": "thinking"}
{"type": "tool_call",   "name": "...", "arguments": "..."}
{"type": "tool_output", "name": "...", "output": "..."}
{"type": "message",     "content": "..."}
{"type": "done"}
```

## Makefile Commands

```bash
make dev            # Start both backend and frontend (kills existing first)
make kill           # Stop backend and frontend
make install        # Install all dependencies (uv sync + npm install)
make run            # Run CLI chatbot
make format         # Format with ruff
make lint           # Lint with ruff
```

## Key Notes

- The CDP server wallet is agent-controlled with its own `0x...` address on the configured network.
- Wallet data persists in `backend/wallet_data_<network>.txt` after first run.
- Chat messages persist in the browser via localStorage.
- Three CDP credentials are required (from https://portal.cdp.coinbase.com):
  - `CDP_API_KEY_ID` — API key identifier
  - `CDP_API_KEY_SECRET` — EC PEM private key
  - `CDP_WALLET_SECRET` — base64-encoded DER EC private key
