# CDP AgentKit Chatbot — FastAPI + React

A chatbot powered by the OpenAI Agents SDK and Coinbase Developer Platform (CDP) AgentKit. Features a FastAPI backend with WebSocket streaming and REST endpoints for wallet operations.

## What can the agent do?

- "What are my wallet details?"
- "Get my ETH balance"
- "Transfer 0.001 ETH to 0x..."
- "What is the price of BTC?"
- "Request testnet funds from the faucet"
- "Wrap 0.01 ETH to WETH"

## Requirements

- Python 3.10+
- [CDP API Key](https://portal.cdp.coinbase.com/access/api)
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app (REST + WebSocket)
│   ├── agent_setup.py       # CDP Agent initialization
│   └── models.py            # Pydantic request/response schemas
├── packages/
│   ├── coinbase-agentkit/             # Vendored CDP AgentKit core
│   └── coinbase-agentkit-openai-agents-sdk/  # OpenAI Agents SDK adapter
├── chatbot.py               # Original CLI chatbot (standalone)
├── pyproject.toml
└── .env                     # API keys (not committed)
```

## Setup

### 1. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -e ./packages/coinbase-agentkit
pip install -e ./packages/coinbase-agentkit-openai-agents-sdk
pip install "openai-agents>=0.0.6,<0.0.7" "fastapi>=0.115.0" "uvicorn[standard]>=0.32.0" python-dotenv
```

### 3. Configure environment variables

Copy `.env.local` to `.env` and fill in your keys:

```
CDP_API_KEY_ID=organizations/...
CDP_API_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----\n
CDP_WALLET_SECRET=...
OPENAI_API_KEY=sk-proj-...
NETWORK_ID=base-sepolia
```

## Running the Backend

```bash
cd backend
../venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --loop asyncio
```

The server starts on `http://localhost:8000`. On first launch it initializes the CDP wallet (saved to `wallet_data_base_sepolia.txt`).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/wallet` | Wallet address, network, status |
| GET | `/api/tools` | List of available agent tools |
| POST | `/api/chat` | Non-streaming chat (JSON body: `{"message": "..."}`) |
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

## Running the CLI Chatbot (standalone)

```bash
source venv/bin/activate
python chatbot.py
```

## Key Notes

- The CDP server wallet is an agent-controlled wallet with its own `0x...` address.
- Three credentials are required, all from https://portal.cdp.coinbase.com:
  - `CDP_API_KEY_ID` — your API key identifier
  - `CDP_API_KEY_SECRET` — an EC PEM private key
  - `CDP_WALLET_SECRET` — a base64-encoded DER EC private key
- The wallet address persists in `wallet_data_base_sepolia.txt` after first run.
- The backend uses `--loop asyncio` because `nest_asyncio` (used by the AgentKit SDK) is incompatible with uvloop.
