import type { ToolInfo } from "../types";

interface Props {
  tools: ToolInfo[];
  onSend: (message: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Wallet Details", message: "What are my wallet details?" },
  { label: "Get Balance", message: "Get my ETH balance" },
  { label: "Request Faucet", message: "Request test ETH from the faucet" },
  { label: "BTC Price", message: "What is the price of BTC?" },
  { label: "ETH Price", message: "What is the price of ETH?" },
];

export default function LeftSidebar({ tools, onSend }: Props) {
  return (
    <aside className="left-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-logo">
          <div className="logo-icon">C</div>
          <div>
            <h3>CDP AgentKit</h3>
            <span className="subtitle">OpenAI Agents SDK</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h4>Quick Actions</h4>
        <div className="quick-actions">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              className="action-btn"
              onClick={() => onSend(a.message)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section tools-section">
        <h4>Available Tools ({tools.length})</h4>
        <div className="tools-list">
          {tools.map((tool) => (
            <div key={tool.name} className="tool-item">
              <span className="tool-dot" />
              <span className="tool-label">
                {tool.name.replace(/ActionProvider_/g, ": ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
