import { useState } from "react";
import { getExplorerTxUrl } from "../utils/contract";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5000";

function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function AdminPanel({ walletAddress, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePickWinner = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setTxHash("");

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/raffle/pick-winner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_e) {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const reason =
          payload?.details?.reason ||
          payload?.error ||
          `Request failed with status ${response.status}`;
        throw new Error(reason);
      }

      const hash = payload?.data?.txHash || "";
      if (hash) setTxHash(hash);

      setMessage(payload?.message || "Winner selection transaction submitted successfully.");

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (err) {
      setError(err?.message || "Failed to trigger winner selection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Admin Panel</h2>

      <p style={{ marginTop: 0, color: "#334155", fontSize: 14 }}>
        Connected admin wallet:{" "}
        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
          {walletAddress || "Not connected"}
        </span>
      </p>

      <button
        type="button"
        onClick={handlePickWinner}
        disabled={loading}
        style={{
          border: "none",
          borderRadius: 10,
          padding: "10px 16px",
          cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#94a3b8" : "#b45309",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        {loading ? "Picking Winner..." : "Trigger pickWinner()"}
      </button>

      {message && (
        <p style={{ marginTop: 12, color: "#166534", fontSize: 14 }}>
          {message}
        </p>
      )}

      {txHash && (
        <p style={{ marginTop: 8, color: "#0f766e", fontSize: 14 }}>
          Transaction:{" "}
          {getExplorerTxUrl(txHash) ? (
            <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noreferrer">
              {shortHash(txHash)}
            </a>
          ) : (
            <span style={{ fontFamily: "monospace" }}>{shortHash(txHash)}</span>
          )}
        </p>
      )}

      {error && (
        <p style={{ marginTop: 12, color: "#dc2626", fontSize: 14 }}>{error}</p>
      )}

      <p style={{ marginTop: 12, marginBottom: 0, color: "#64748b", fontSize: 12 }}>
        This action sends an on-chain admin transaction through the backend signer.
      </p>
    </div>
  );
}
