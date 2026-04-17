const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function loadDeployment() {
  const candidatePaths = [
    path.resolve(__dirname, "../abi/deployment.json"),
    path.resolve(__dirname, "../../../blockchain/deployments/localhost/raffle.json"),
    path.resolve(__dirname, "../../../../blockchain/deployments/localhost/raffle.json"),
  ];

  for (const filePath of candidatePaths) {
    const parsed = readJsonIfExists(filePath);
    if (parsed?.contractAddress) {
      return parsed;
    }
  }

  return null;
}

const deployment = loadDeployment();
const resolvedContractAddress = CONTRACT_ADDRESS || deployment?.contractAddress || "";
const resolvedRpcUrl = RPC_URL || "http://127.0.0.1:8545";
const hasContractAddress = Boolean(resolvedContractAddress);

const provider = new ethers.JsonRpcProvider(resolvedRpcUrl);

function loadAbi() {
  const candidatePaths = [
    path.resolve(__dirname, "../abi/Raffle.json"),
    path.resolve(
      __dirname,
      "../../../blockchain/artifacts/contracts/Raffle.sol/Raffle.json",
    ),
    path.resolve(
      __dirname,
      "../../../../blockchain/artifacts/contracts/Raffle.sol/Raffle.json",
    ),
    path.resolve(__dirname, "../../../frontend/src/constants/abi.json"),
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return parsed.abi || parsed;
    }
  }

  throw new Error(
    "Raffle ABI not found. Compile blockchain project or place ABI at backend/src/abi/Raffle.json",
  );
}

const abi = loadAbi();

function getProvider() {
  return provider;
}

function getSigner() {
  if (PRIVATE_KEY) {
    return new ethers.Wallet(PRIVATE_KEY, provider);
  }

  const isLocalRpc =
    resolvedRpcUrl.includes("127.0.0.1") || resolvedRpcUrl.includes("localhost");
  if (isLocalRpc) {
    return provider.getSigner(0);
  }

  throw new Error(
    "Missing PRIVATE_KEY for non-local RPC signer. Set PRIVATE_KEY in backend environment.",
  );
}

function getReadContract() {
  if (!hasContractAddress) {
    throw new Error(
      "Contract not configured yet. Deploy locally first (blockchain npm run deploy:local) or set CONTRACT_ADDRESS.",
    );
  }
  return new ethers.Contract(resolvedContractAddress, abi, provider);
}

function getWriteContract() {
  if (!hasContractAddress) {
    throw new Error(
      "Contract not configured yet. Deploy locally first (blockchain npm run deploy:local) or set CONTRACT_ADDRESS.",
    );
  }
  return new ethers.Contract(resolvedContractAddress, abi, getSigner());
}

function getAdminContract() {
  if (!hasContractAddress) {
    throw new Error(
      "Contract not configured yet. Deploy locally first (blockchain npm run deploy:local) or set CONTRACT_ADDRESS.",
    );
  }
  return new ethers.Contract(resolvedContractAddress, abi, getSigner());
}

function formatRaffleState(stateValue) {
  const RAFFLE_STATE_OPEN = 0;
  const RAFFLE_STATE_CLOSED = 1;
  const state = Number(stateValue);
  if (state === RAFFLE_STATE_OPEN) return "OPEN";
  if (state === RAFFLE_STATE_CLOSED) return "CLOSED";
  return `UNKNOWN(${state})`;
}

function toEthString(value) {
  try {
    return ethers.formatEther(value);
  } catch (_err) {
    return "0.0";
  }
}

function parseContractError(error) {
  const reason =
    error?.reason ||
    error?.shortMessage ||
    error?.info?.error?.message ||
    error?.message ||
    "Unknown contract error";

  return {
    reason,
    code: error?.code || null,
  };
}

module.exports = {
  getProvider,
  getSigner,
  getReadContract,
  getWriteContract,
  getAdminContract,
  formatRaffleState,
  parseContractError,
  toEthString,
  abi,
  CONTRACT_ADDRESS: resolvedContractAddress,
};
