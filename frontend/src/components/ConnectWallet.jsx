import { useEffect, useState } from "react";

function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectWallet({ walletAddress, setWalletAddress }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const hasEthereum = typeof window !== "undefined" && window.ethereum;

  const syncWalletFromProvider = async () => {
    if (!hasEthereum) return;

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress("");
      }
    } catch (err) {
      setError(err?.message || "Failed to read wallet accounts.");
    }
  };

  const connectWallet = async () => {
    if (!hasEthereum) {
      setError("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }

    try {
      setError("");
      setIsConnecting(true);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        setError("No account returned by MetaMask.");
        return;
      }

      setWalletAddress(accounts[0]);
    } catch (err) {
      setError(err?.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    syncWalletFromProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasEthereum) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setWalletAddress("");
        return;
      }
      setWalletAddress(accounts[0]);
    };

    const handleChainChanged = () => {
      syncWalletFromProvider();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEthereum]);

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Connect Wallet</h2>

      {!walletAddress ? (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            cursor: isConnecting ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>
      ) : (
        <div
          style={{
            background: "#ecfeff",
            border: "1px solid #a5f3fc",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Wallet Connected</p>
          <p style={{ margin: "6px 0 0", fontFamily: "monospace" }}>
            {walletAddress}
          </p>
          <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 14 }}>
            Short: {shortenAddress(walletAddress)}
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: "#dc2626", marginTop: 10, marginBottom: 0 }}>{error}</p>
      )}

      {!hasEthereum && (
        <p style={{ color: "#92400e", marginTop: 10, marginBottom: 0 }}>
          MetaMask not detected in this browser.
        </p>
      )}
    </div>
  );
}
