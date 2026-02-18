import { useEffect, useState } from "react";
import type { ChatMessage, WalletInfo } from "../types";

interface Props {
  wallet: WalletInfo | null;
  walletLoading: boolean;
  onRefreshWallet: () => void;
  messages: ChatMessage[];
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="clock-widget">
      <div className="clock-time">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="clock-date">
        {now.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </div>
    </div>
  );
}

function shortenAddress(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function RightSidebar({
  wallet,
  walletLoading,
  onRefreshWallet,
  messages,
}: Props) {
  const toolCalls = messages.filter(
    (m) => m.role === "tool" && m.toolArguments
  );
  const recentTools = toolCalls.slice(-5).reverse();

  return (
    <aside className="right-sidebar">
      <div className="sidebar-section">
        <Clock />
      </div>

      <div className="sidebar-section wallet-section">
        <div className="section-header">
          <h4>Wallet</h4>
          <button className="refresh-btn" onClick={onRefreshWallet}>
            Refresh
          </button>
        </div>
        {walletLoading ? (
          <div className="loading">Loading...</div>
        ) : wallet?.status === "connected" ? (
          <div className="wallet-info">
            <div className="wallet-row">
              <span className="wallet-label">Address</span>
              <span className="wallet-value mono">
                {wallet.address ? shortenAddress(wallet.address) : "N/A"}
              </span>
            </div>
            <div className="wallet-row">
              <span className="wallet-label">Network</span>
              <span className="wallet-value">
                <span className="network-badge">{wallet.network_id}</span>
              </span>
            </div>
            <div className="wallet-row">
              <span className="wallet-label">Status</span>
              <span className="wallet-value">
                <span className="status-connected">Connected</span>
              </span>
            </div>
            {wallet.address && (
              <div className="wallet-address-full">
                <span className="wallet-label">Full Address</span>
                <code>{wallet.address}</code>
              </div>
            )}
          </div>
        ) : (
          <div className="wallet-disconnected">
            Wallet not connected
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h4>Recent Tool Calls</h4>
        {recentTools.length === 0 ? (
          <div className="empty-tools">No tool calls yet</div>
        ) : (
          <div className="recent-tools">
            {recentTools.map((tc) => (
              <div key={tc.id} className="recent-tool-item">
                <span className="recent-tool-name">{tc.toolName}</span>
                <span className="recent-tool-time">
                  {tc.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h4>Statistics</h4>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-value">
              {messages.filter((m) => m.role === "user").length}
            </span>
            <span className="stat-label">Messages Sent</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{toolCalls.length}</span>
            <span className="stat-label">Tool Calls</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {messages.filter((m) => m.role === "assistant").length}
            </span>
            <span className="stat-label">Responses</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
