import { useEffect, useState } from "react";
import { shortAddress } from "../utils/contract";

const BACKEND_BASE_URL =
  (import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

export default function WinnerDisplay({ refreshKey = 0 }) {
  const [winner, setWinner] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadWinner() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/raffle/winner`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || "Failed to fetch winner");
      }

      const latestWinner = payload?.data?.winner || "";
      setWinner(latestWinner);
    } catch (err) {
      setError(err?.message || "Could not load winner");
      setWinner("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Winner Display</h2>
        <button
          type="button"
          onClick={loadWinner}
          style={{
            border: "1px solid #cbd5e1",
            background: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#64748b", margin: 0 }}>Loading latest winner...</p>
      ) : error ? (
        <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>
      ) : !winner || winner === "0x0000000000000000000000000000000000000000" ? (
        <p style={{ color: "#64748b", margin: 0 }}>
          No winner has been picked yet.
        </p>
      ) : (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#f8fafc",
            padding: 12,
          }}
        >
          <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#0f172a" }}>
            Latest Winner
          </p>
          <p style={{ margin: "0 0 6px", fontFamily: "monospace", wordBreak: "break-all" }}>
            {winner}
          </p>
          <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
            Short: {shortAddress(winner)}
          </p>
        </div>
      )}
    </div>
  );
}
