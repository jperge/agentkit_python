import type { ChatMessage as ChatMsg } from "../types";

interface Props {
  message: ChatMsg;
}

export default function ChatMessage({ message }: Props) {
  const { role, content, toolName, toolArguments } = message;
  const time = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (role === "tool") {
    return (
      <div className="chat-msg tool-msg">
        <div className="msg-header">
          <span className="tool-badge">Tool</span>
          {toolName && <span className="tool-name">{toolName}</span>}
          <span className="msg-time">{time}</span>
        </div>
        {toolArguments && (
          <pre className="tool-args">{toolArguments}</pre>
        )}
        {!toolArguments && <div className="tool-output">{content}</div>}
      </div>
    );
  }

  if (role === "error") {
    return (
      <div className="chat-msg error-msg">
        <span className="msg-time">{time}</span>
        <div className="msg-body">{content}</div>
      </div>
    );
  }

  return (
    <div className={`chat-msg ${role}-msg`}>
      <div className="msg-header">
        <span className="msg-role">{role === "user" ? "You" : "Agent"}</span>
        <span className="msg-time">{time}</span>
      </div>
      <div className="msg-body">{content}</div>
    </div>
  );
}
