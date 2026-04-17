import { useEffect, useMemo, useState } from "react";
import {
  enterRaffle,
  fetchRaffleState,
  getExplorerTxUrl,
} from "../utils/contract";

function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getStatusBadge(raffleState) {
  if (raffleState === "OPEN") {
    return { text: "OPEN", color: "#166534", bg: "#dcfce7" };
  }
  if (raffleState === "CALCULATING") {
    return { text: "CALCULATING", color: "#9a3412", bg: "#ffedd5" };
  }
  if (raffleState === "CLOSED") {
    return { text: "CLOSED", color: "#475569", bg: "#e2e8f0" };
  }
  return { text: "UNKNOWN", color: "#334155", bg: "#e2e8f0" };
}

function formatTimeLeft(deadlineSeconds) {
  if (!deadlineSeconds || Number.isNaN(deadlineSeconds)) return "N/A";

  const now = Math.floor(Date.now() / 1000);
  const diff = deadlineSeconds - now;

  if (diff <= 0) return "Deadline passed";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`);
  return parts.join(" ");
}

export default function BuyTicket({ walletAddress, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [ticketPriceWei, setTicketPriceWei] = useState(0n);
  const [ticketPriceEth, setTicketPriceEth] = useState("0.0");
  const [raffleState, setRaffleState] = useState("UNKNOWN");
  const [deadline, setDeadline] = useState(0);
  const [timeLeft, setTimeLeft] = useState("N/A");

  const [txHash, setTxHash] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isConnected = Boolean(walletAddress);
  const deadlinePassed =
    deadline > 0 && Math.floor(Date.now() / 1000) >= deadline;

  const canBuy =
    isConnected &&
    raffleState === "OPEN" &&
    !deadlinePassed &&
    ticketPriceWei > 0n &&
    !isLoading;

  const badge = useMemo(() => getStatusBadge(raffleState), [raffleState]);

  async function loadRaffleData() {
    try {
      const raffle = await fetchRaffleState();
      setTicketPriceWei(BigInt(raffle.ticketPriceWei || "0"));
      setTicketPriceEth(raffle.ticketPriceEth || "0.0");
      setRaffleState(raffle.raffleState || "UNKNOWN");
      setDeadline(Number(raffle.deadline || 0));
    } catch (err) {
      setErrorMessage(err?.message || "Failed to load raffle data.");
    }
  }

  useEffect(() => {
    loadRaffleData();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(formatTimeLeft(deadline));
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  async function handleBuyTicket() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setTxHash("");

    try {
      if (!isConnected) {
        throw new Error("Connect your wallet before buying a ticket.");
      }
      if (raffleState !== "OPEN") {
        throw new Error("Raffle is not open for ticket purchases.");
      }
      if (deadlinePassed) {
        throw new Error("Raffle deadline has passed.");
      }

      const result = await enterRaffle(ticketPriceWei);
      const hash = result?.txHash || "";

      if (hash) setTxHash(hash);
      setSuccessMessage(
        "Ticket purchase successful. You are now entered in the raffle.",
      );

      await loadRaffleData();
      if (typeof onSuccess === "function") onSuccess();
    } catch (err) {
      setErrorMessage(err?.message || "Ticket purchase failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Buy Ticket</h2>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 12,
            color: badge.color,
            background: badge.bg,
          }}
        >
          {badge.text}
        </span>

        <span style={{ fontSize: 14, color: "#334155" }}>
          Ticket Price: <strong>{ticketPriceEth} ETH</strong>
        </span>

        <span style={{ fontSize: 14, color: "#334155" }}>
          Time Left: <strong>{timeLeft}</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={handleBuyTicket}
        disabled={!canBuy}
        style={{
          border: "none",
          borderRadius: 10,
          padding: "10px 16px",
          cursor: canBuy ? "pointer" : "not-allowed",
          background: canBuy ? "#2563eb" : "#94a3b8",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        {isLoading ? "Submitting..." : "Buy Ticket"}
      </button>

      {!isConnected && (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Connect your wallet to purchase a ticket.
        </p>
      )}

      {successMessage && (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: "#166534",
            fontSize: 14,
          }}
        >
          {successMessage}
        </p>
      )}

      {txHash && (
        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            color: "#0f766e",
            fontSize: 14,
          }}
        >
          Tx:{" "}
          {getExplorerTxUrl(txHash) ? (
            <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noreferrer">
              {shortHash(txHash)}
            </a>
          ) : (
            <span style={{ fontFamily: "monospace" }}>{shortHash(txHash)}</span>
          )}
        </p>
      )}

      {errorMessage && (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            color: "#dc2626",
            fontSize: 14,
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
