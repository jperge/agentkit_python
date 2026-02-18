export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "status" | "error";
  content: string;
  timestamp: Date;
  toolName?: string;
  toolArguments?: string;
}

export interface WalletInfo {
  address: string | null;
  network_id: string | null;
  status: string;
}

export interface ToolInfo {
  name: string;
  description: string | null;
}

export type WsEvent =
  | { type: "status"; content: string }
  | { type: "tool_call"; name: string; arguments: string }
  | { type: "tool_output"; name: string; output: string }
  | { type: "message"; content: string }
  | { type: "done" }
  | { type: "error"; content: string };
