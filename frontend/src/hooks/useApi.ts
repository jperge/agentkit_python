import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolInfo, WalletInfo } from "../types";

const API = `${window.location.protocol}//${window.location.hostname}:8000`;

export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const retryRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/wallet`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WalletInfo = await res.json();
      setWallet(data);
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = undefined;
      }
    } catch (err) {
      console.warn("Wallet fetch failed, retrying in 3s...", err);
      setWallet({ address: null, network_id: null, status: "disconnected" });
      retryRef.current = setTimeout(fetchWallet, 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [fetchWallet]);

  return { wallet, loading, refresh: fetchWallet };
}

export function useTools() {
  const [tools, setTools] = useState<ToolInfo[]>([]);

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/tools`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(setTools)
        .catch(() => setTimeout(load, 3000));
    };
    load();
  }, []);

  return tools;
}
