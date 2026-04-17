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

if (!resolvedContractAddress) {
  throw new Error(
    "Missing contract address. Set CONTRACT_ADDRESS or deploy locally with blockchain/scripts/deploy.js",
  );
}

const provider = new ethers.JsonRpcProvider(resolvedRpcUrl);
const signer = PRIVATE_KEY
  ? new ethers.Wallet(PRIVATE_KEY, provider)
  : provider.getSigner(0);

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

const readContract = new ethers.Contract(resolvedContractAddress, abi, provider);
const adminContract = new ethers.Contract(resolvedContractAddress, abi, signer);

function getProvider() {
  return provider;
}

function getSigner() {
  return signer;
}

function getReadContract() {
  return readContract;
}

function getWriteContract() {
  return adminContract;
}

function getAdminContract() {
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
  CONTRACT_ADDRESS: resolvedContractAddress,
};
