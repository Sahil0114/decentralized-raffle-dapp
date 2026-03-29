import { useMemo, useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import RaffleInfo from "./components/RaffleInfo";
import BuyTicket from "./components/BuyTicket";
import ParticipantsList from "./components/ParticipantsList";
import WinnerDisplay from "./components/WinnerDisplay";
import AdminPanel from "./components/AdminPanel";

const ADMIN_ADDRESS = (import.meta.env.VITE_ADMIN_ADDRESS || "").toLowerCase();

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const normalizedWallet = useMemo(
    () => (walletAddress ? walletAddress.toLowerCase() : ""),
    [walletAddress]
  );

  const isAdmin =
    Boolean(ADMIN_ADDRESS) && Boolean(normalizedWallet) && normalizedWallet === ADMIN_ADDRESS;

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "24px 16px 48px",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>Decentralized Raffle Ticketing System</h1>
        <p style={{ marginTop: 8, color: "#334155" }}>
          Buy raffle tickets on-chain, track participants, and pick a verifiable winner with
          Chainlink VRF.
        </p>
      </header>

      <section
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <ConnectWallet walletAddress={walletAddress} setWalletAddress={setWalletAddress} />
      </section>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <RaffleInfo refreshKey={refreshKey} />
      </section>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <BuyTicket walletAddress={walletAddress} onSuccess={triggerRefresh} />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <ParticipantsList refreshKey={refreshKey} />
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <WinnerDisplay refreshKey={refreshKey} />
        </div>
      </section>

      {isAdmin && (
        <section
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <AdminPanel walletAddress={walletAddress} onSuccess={triggerRefresh} />
        </section>
      )}

      {!isAdmin && (
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
          Admin panel is visible only for the configured admin wallet.
        </p>
      )}
    </div>
  );
}
