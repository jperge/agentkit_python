import { useTools, useWallet } from "./hooks/useApi";
import { useWebSocket } from "./hooks/useWebSocket";
import ChatPanel from "./components/ChatPanel";
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";
import "./App.css";

function App() {
  const { messages, sendMessage, isConnected, isThinking } = useWebSocket();
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useWallet();
  const tools = useTools();

  return (
    <div className="app">
      <LeftSidebar tools={tools} onSend={sendMessage} />
      <ChatPanel
        messages={messages}
        onSend={sendMessage}
        isConnected={isConnected}
        isThinking={isThinking}
      />
      <RightSidebar
        wallet={wallet}
        walletLoading={walletLoading}
        onRefreshWallet={refreshWallet}
        messages={messages}
      />
    </div>
  );
}

export default App;
