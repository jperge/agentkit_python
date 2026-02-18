import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, WsEvent } from "../types";

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000/ws/chat`;
const STORAGE_KEY = "cdp-chat-messages";

let msgId = Date.now();
const nextId = () => String(++msgId);

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((m: ChatMessage) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Storage full or unavailable — ignore
  }
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Persist messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (evt) => {
      const event: WsEvent = JSON.parse(evt.data);

      switch (event.type) {
        case "status":
          setIsThinking(true);
          break;

        case "tool_call":
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "tool",
              content: `Calling **${event.name}**`,
              toolName: event.name,
              toolArguments: event.arguments,
              timestamp: new Date(),
            },
          ]);
          break;

        case "tool_output":
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "tool",
              content: event.output,
              toolName: event.name,
              timestamp: new Date(),
            },
          ]);
          break;

        case "message":
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: event.content,
              timestamp: new Date(),
            },
          ]);
          break;

        case "error":
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "error",
              content: event.content,
              timestamp: new Date(),
            },
          ]);
          break;

        case "done":
          setIsThinking(false);
          break;
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);

    wsRef.current.send(JSON.stringify({ message: text }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, sendMessage, isConnected, isThinking, clearMessages };
}
