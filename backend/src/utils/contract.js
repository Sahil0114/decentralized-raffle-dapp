const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

if (!RPC_URL) {
  throw new Error("Missing RPC_URL in environment");
}

if (!CONTRACT_ADDRESS) {
  throw new Error("Missing CONTRACT_ADDRESS in environment");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;

function loadAbi() {
  const candidatePaths = [
    path.resolve(
      __dirname,
      "../../../blockchain/artifacts/contracts/Raffle.sol/Raffle.json",
    ),
    path.resolve(
      __dirname,
      "../../../../blockchain/artifacts/contracts/Raffle.sol/Raffle.json",
    ),
    path.resolve(__dirname, "../../abi/Raffle.json"),
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

const readContract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
const adminContract = signer
  ? new ethers.Contract(CONTRACT_ADDRESS, abi, signer)
  : null;

function getProvider() {
  return provider;
}

function getSigner() {
  if (!signer) {
    throw new Error(
      "Admin signer unavailable. Set PRIVATE_KEY in backend .env",
    );
  }
  return signer;
}

function getReadContract() {
  return readContract;
}

function getWriteContract() {
  if (!adminContract) {
    throw new Error(
      "Write contract unavailable. Set PRIVATE_KEY in backend .env",
    );
  }
  return adminContract;
}

function getAdminContract() {
  if (!adminContract) {
    throw new Error(
      "Admin contract unavailable. Set PRIVATE_KEY in backend .env",
    );
  }
  return adminContract;
}

function formatRaffleState(stateValue) {
  const state = Number(stateValue);
  if (state === 0) return "OPEN";
  if (state === 1) return "CALCULATING";
  if (state === 2) return "CLOSED";
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
  CONTRACT_ADDRESS,
};
