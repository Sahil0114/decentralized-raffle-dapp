import { BrowserProvider, Contract, ethers } from "ethers";
import abi from "../constants/abi.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || "").replace(
  /\/$/,
  "",
);
const RPC_URL = import.meta.env.VITE_RPC_URL || "";

/* ----------------------------- Config Helpers ----------------------------- */

function assertContractAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing VITE_CONTRACT_ADDRESS in frontend environment.");
  }
}

function assertEthereum() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "MetaMask is not available. Please install or enable MetaMask.",
    );
  }
}

function getBackendUrl(path) {
  if (!BACKEND_BASE_URL) {
    throw new Error("Missing VITE_BACKEND_BASE_URL in frontend environment.");
  }
  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ----------------------------- Ethers Helpers ----------------------------- */

export function getBrowserProvider() {
  assertEthereum();
  return new BrowserProvider(window.ethereum);
}

export async function getBrowserSigner() {
  const provider = getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

export async function getConnectedAddress() {
  const signer = await getBrowserSigner();
  return signer.getAddress();
}

/**
 * Returns an ethers Contract instance.
 * - If signerOrProvider is provided, it will be used.
 * - Otherwise it tries:
 *   1) injected browser provider (MetaMask), then
 *   2) JSON-RPC provider from VITE_RPC_URL
 */
export function getRaffleContract(signerOrProvider) {
  assertContractAddress();

  if (signerOrProvider) {
    return new Contract(CONTRACT_ADDRESS, abi, signerOrProvider);
  }

  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new BrowserProvider(window.ethereum);
    return new Contract(CONTRACT_ADDRESS, abi, provider);
  }

  if (RPC_URL) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new Contract(CONTRACT_ADDRESS, abi, provider);
  }

  throw new Error(
    "No provider available. Connect MetaMask or set VITE_RPC_URL for read-only access.",
  );
}

export async function enterRaffle(ticketPriceWei) {
  const signer = await getBrowserSigner();
  const contract = getRaffleContract(signer);
  const tx = await contract.enterRaffle({ value: ticketPriceWei });
  const receipt = await tx.wait(1);
  return { txHash: tx.hash, receipt };
}

export async function pickWinnerFromWallet() {
  const signer = await getBrowserSigner();
  const contract = getRaffleContract(signer);
  const tx = await contract.pickWinner();
  const receipt = await tx.wait(1);
  return { txHash: tx.hash, receipt };
}

/* ------------------------------- API Helpers ------------------------------ */

async function apiFetch(path, options = {}) {
  const url = getBackendUrl(path);
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    // keep null; we'll throw a generic message below if needed
  }

  if (!response.ok) {
    const message =
      payload?.details?.reason ||
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Empty response from backend.");
  }

  return payload;
}

export async function fetchRaffleState() {
  const payload = await apiFetch("/api/raffle");
  return payload.data;
}

export async function fetchParticipants() {
  const payload = await apiFetch("/api/raffle/participants");
  return payload.data?.participants || [];
}

export async function fetchRecentWinner() {
  const payload = await apiFetch("/api/raffle/winner");
  return payload.data?.winner || "";
}

/**
 * Triggers backend admin endpoint.
 * Backend uses admin private key (server-side) to call pickWinner().
 */
export async function triggerPickWinnerFromBackend() {
  const payload = await apiFetch("/api/raffle/pick-winner", { method: "POST" });
  return payload.data;
}

/* ------------------------------- UI Helpers ------------------------------- */

export function formatRaffleState(stateValue) {
  const state = Number(stateValue);
  if (state === 0) return "OPEN";
  if (state === 1) return "CALCULATING";
  if (state === 2) return "CLOSED";
  return `UNKNOWN(${stateValue})`;
}

export function shortAddress(address, chars = 6) {
  if (!address || typeof address !== "string") return "";
  const size = Math.max(2, chars);
  return `${address.slice(0, size)}...${address.slice(-4)}`;
}

export function toEthString(value) {
  try {
    return ethers.formatEther(value);
  } catch (_err) {
    return "0.0";
  }
}

export function getExplorerTxUrl(txHash) {
  if (!txHash) return "";
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressUrl(address) {
  if (!address) return "";
  return `https://sepolia.etherscan.io/address/${address}`;
}
