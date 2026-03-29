import { useEffect, useState } from "react";

function shortAddress(address) {
  if (!address || typeof address !== "string") return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ParticipantsList({ refreshKey = 0 }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const backendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL || "";

  useEffect(() => {
    let isMounted = true;

    async function loadParticipants() {
      setLoading(true);
      setError("");

      try {
        if (!backendBaseUrl) {
          throw new Error("Missing VITE_BACKEND_BASE_URL in frontend environment.");
        }

        const response = await fetch(`${backendBaseUrl}/api/raffle/participants`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Failed to fetch participants (${response.status}): ${text || response.statusText}`
          );
        }

        const payload = await response.json();

        if (!payload?.success) {
          throw new Error(payload?.error || "Backend returned unsuccessful response.");
        }

        const list = payload?.data?.participants || [];
        if (!Array.isArray(list)) {
          throw new Error("Invalid participants payload format.");
        }

        if (isMounted) {
          setParticipants(list);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Failed to load participants.");
          setParticipants([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadParticipants();

    return () => {
      isMounted = false;
    };
  }, [backendBaseUrl, refreshKey]);

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 10 }}>Participants List</h2>

      {loading && <p style={{ color: "#64748b", margin: 0 }}>Loading participants...</p>}

      {!loading && error && (
        <p style={{ color: "#dc2626", margin: 0, wordBreak: "break-word" }}>{error}</p>
      )}

      {!loading && !error && participants.length === 0 && (
        <p style={{ color: "#64748b", margin: 0 }}>No participants yet.</p>
      )}

      {!loading && !error && participants.length > 0 && (
        <div>
          <p style={{ marginTop: 0, marginBottom: 10, color: "#334155", fontSize: 14 }}>
            Total Participants: <strong>{participants.length}</strong>
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 8,
            }}
          >
            {participants.map((address, index) => (
              <li
                key={`${address}-${index}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    color: "#0f172a",
                    wordBreak: "break-all",
                  }}
                >
                  {address}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    whiteSpace: "nowrap",
                  }}
                  title={address}
                >
                  {shortAddress(address)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
