"""FastAPI backend for CDP AgentKit chatbot."""

# Must be set before any openai/agents imports
import os

os.environ["OPENAI_AGENTS_DISABLE_TRACING"] = "1"

import json
import traceback
from contextlib import asynccontextmanager

from agents.items import MessageOutputItem, ToolCallItem, ToolCallOutputItem
from agents.run import Runner
from agents.stream_events import RunItemStreamEvent
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from agent_setup import get_agent, get_available_tools, get_wallet_info, setup
from models import ChatResponse, ToolInfo, WalletInfo

# Load environment variables from the project root .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the agent on startup."""
    print("Initializing CDP Agent...")
    try:
        setup()
        print("CDP Agent initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize agent: {e}")
        traceback.print_exc()
    yield


app = FastAPI(title="CDP AgentKit Chat API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_origin_regex=r"https?://(localhost|emergence\.fmr\.com)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST Endpoints ──────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/wallet", response_model=WalletInfo)
async def wallet_info():
    """Get current wallet information."""
    info = get_wallet_info()
    return WalletInfo(**info)


@app.get("/api/tools", response_model=list[ToolInfo])
async def list_tools():
    """Get list of available agent tools."""
    tools = get_available_tools()
    return [ToolInfo(**t) for t in tools]


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: dict):
    """Non-streaming chat endpoint (simple request/response)."""
    message = request.get("message", "")
    if not message:
        return ChatResponse(response="Please provide a message.", tool_calls=None)

    agent = get_agent()
    try:
        result = await Runner.run(agent, message)

        tool_calls = []
        for item in result.new_items:
            if isinstance(item, ToolCallItem):
                raw = item.raw_item
                tool_calls.append({
                    "type": "tool_call",
                    "name": getattr(raw, "name", "unknown"),
                    "arguments": getattr(raw, "arguments", ""),
                })
            elif isinstance(item, ToolCallOutputItem):
                output = getattr(item, "output", None) or getattr(item.raw_item, "output", "")
                tool_calls.append({
                    "type": "tool_output",
                    "output": str(output) if output else "",
                })

        return ChatResponse(
            response=result.final_output or "",
            tool_calls=tool_calls if tool_calls else None,
        )
    except Exception as e:
        traceback.print_exc()
        return ChatResponse(response=f"Error: {e}", tool_calls=None)


# ── WebSocket Streaming Endpoint ────────────────────────────────────────────


@app.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for streaming chat with the agent.

    Client sends:
        {"message": "your question here"}

    Server sends a sequence of JSON events:
        {"type": "status",      "content": "thinking"}
        {"type": "tool_call",   "name": "...", "arguments": "..."}
        {"type": "tool_output", "name": "...", "output": "..."}
        {"type": "message",     "content": "..."}
        {"type": "done"}
        {"type": "error",       "content": "..."}
    """
    await websocket.accept()
    print("WebSocket client connected")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON"})
                continue

            user_input = payload.get("message", "").strip()
            if not user_input:
                await websocket.send_json({"type": "error", "content": "Empty message"})
                continue

            agent = get_agent()
            await websocket.send_json({"type": "status", "content": "thinking"})

            try:
                # Use streaming mode to get real-time tool call events
                result = Runner.run_streamed(agent, user_input)
                current_tool_name = None

                async for event in result.stream_events():
                    if not isinstance(event, RunItemStreamEvent):
                        continue

                    if event.name == "tool_called":
                        raw = event.item.raw_item
                        name = getattr(raw, "name", "unknown")
                        arguments = getattr(raw, "arguments", "")
                        current_tool_name = name

                        # Try to pretty-format arguments for the frontend
                        try:
                            args_parsed = json.loads(arguments)
                            arguments_display = json.dumps(args_parsed, indent=2)
                        except (json.JSONDecodeError, TypeError):
                            arguments_display = arguments

                        await websocket.send_json({
                            "type": "tool_call",
                            "name": name,
                            "arguments": arguments_display,
                        })

                    elif event.name == "tool_output":
                        # Use item.output (the actual output) over raw_item.output
                        output = getattr(event.item, "output", None)
                        if output is None:
                            output = getattr(event.item.raw_item, "output", "")
                        output_str = str(output) if output else ""
                        await websocket.send_json({
                            "type": "tool_output",
                            "name": current_tool_name or "unknown",
                            "output": output_str[:5000] if len(output_str) > 5000 else output_str,
                        })
                        current_tool_name = None

                    elif event.name == "message_output_created":
                        raw = event.item.raw_item
                        text = ""
                        if hasattr(raw, "content"):
                            for part in raw.content:
                                if hasattr(part, "text"):
                                    text += part.text
                        if text:
                            await websocket.send_json({
                                "type": "message",
                                "content": text,
                            })

                await websocket.send_json({"type": "done"})

            except Exception as e:
                traceback.print_exc()
                await websocket.send_json({"type": "error", "content": str(e)})

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, loop="asyncio")
