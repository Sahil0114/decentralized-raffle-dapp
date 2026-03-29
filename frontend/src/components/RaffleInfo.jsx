import { useEffect, useMemo, useState } from "react";
import { fetchRaffleState } from "../utils/contract";

function formatSeconds(totalSeconds) {
  if (totalSeconds <= 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function getStatusColor(status) {
  if (status === "OPEN") return "#16a34a";
  if (status === "CALCULATING") return "#d97706";
  if (status === "CLOSED") return "#64748b";
  return "#334155";
}

export default function RaffleInfo({ refreshKey = 0, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [raffle, setRaffle] = useState(null);
  const [error, setError] = useState("");
  const [nowTs, setNowTs] = useState(Math.floor(Date.now() / 1000));

  const loadRaffle = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRaffleState();
      setRaffle(data);
    } catch (err) {
      setError(err?.message || "Failed to load raffle info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchRaffleState();
        if (!active) return;
        setRaffle(data);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load raffle info");
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowTs(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const deadlineTs = Number(raffle?.deadline || 0);
  const secondsLeft = Math.max(0, deadlineTs - nowTs);
  const deadlineReached = deadlineTs > 0 && secondsLeft === 0;
  const countdown = useMemo(() => formatSeconds(secondsLeft), [secondsLeft]);

  const handleRefreshClick = async () => {
    if (typeof onRefresh === "function") {
      onRefresh();
      return;
    }
    await loadRaffle();
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>Raffle Info</h2>
        <p style={{ color: "#64748b" }}>Loading raffle state...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>Raffle Info</h2>
        <p style={{ color: "#dc2626" }}>{error}</p>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>Raffle Info</h2>
        <p style={{ color: "#64748b" }}>No raffle data available.</p>
      </div>
    );
  }

  const status = raffle.raffleState || "UNKNOWN";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Raffle Info</h2>
        <button
          type="button"
          onClick={handleRefreshClick}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <InfoCard label="Ticket Price" value={`${raffle.ticketPriceEth} ETH`} />
        <InfoCard
          label="Participants"
          value={`${raffle.participantCount} / ${raffle.maxParticipants}`}
        />
        <InfoCard label="Prize Pool" value={`${raffle.prizePoolEth} ETH`} />
        <InfoCard label="Prize Info" value={raffle.prizeInfo || "-"} />
        <InfoCard
          label="Status"
          value={status}
          valueStyle={{ color: getStatusColor(status), fontWeight: 700 }}
        />
        <InfoCard
          label="Deadline Countdown"
          value={deadlineReached ? "Ended" : countdown}
          valueStyle={{
            color: deadlineReached ? "#dc2626" : "#0f172a",
            fontWeight: 700,
          }}
        />
      </div>

      <p
        style={{
          marginTop: 12,
          marginBottom: 0,
          color: "#64748b",
          fontSize: 13,
        }}
      >
        Deadline timestamp: {deadlineTs || "-"}{" "}
        {deadlineTs ? `(${new Date(deadlineTs * 1000).toLocaleString()})` : ""}
      </p>
    </div>
  );
}

function InfoCard({ label, value, valueStyle = {} }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 12,
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          wordBreak: "break-word",
          ...valueStyle,
        }}
      >
        {value}
      </div>
    </div>
  );
}
