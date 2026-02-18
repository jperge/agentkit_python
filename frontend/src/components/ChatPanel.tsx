import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMsg } from "../types";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";

interface Props {
  messages: ChatMsg[];
  onSend: (message: string) => void;
  isConnected: boolean;
  isThinking: boolean;
}

export default function ChatPanel({
  messages,
  onSend,
  isConnected,
  isThinking,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>CDP Agent Chat</h2>
        <span className={`conn-dot ${isConnected ? "connected" : ""}`} />
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-chat">
            <p>Start a conversation with the CDP Agent.</p>
            <p className="hint">
              Try: "What are my wallet details?" or "What is the price of BTC?"
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isThinking && (
          <div className="chat-msg assistant-msg thinking">
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={onSend} disabled={!isConnected || isThinking} />
    </div>
  );
}
