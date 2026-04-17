require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEFAULT_TICKET_PRICE_WEI = ethers.utils.parseEther("0.01").toString();
const DEFAULT_MAX_PARTICIPANTS = "100";
const DEFAULT_RAFFLE_DURATION_SECONDS = "3600";
const DEFAULT_PRIZE_INFO = "Local decentralized raffle prize pool";

async function main() {
  const {
    TICKET_PRICE_WEI = DEFAULT_TICKET_PRICE_WEI,
    MAX_PARTICIPANTS = DEFAULT_MAX_PARTICIPANTS,
    RAFFLE_DURATION_SECONDS = DEFAULT_RAFFLE_DURATION_SECONDS,
    PRIZE_INFO = DEFAULT_PRIZE_INFO,
  } = process.env;

  const latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) {
    throw new Error("Failed to get latest block from provider");
  }
  const deadlineTimestamp =
    Number(latestBlock.timestamp) + Number(RAFFLE_DURATION_SECONDS);

  const raffleFactory = await ethers.getContractFactory("Raffle");

  const raffle = await raffleFactory.deploy(
    TICKET_PRICE_WEI,
    MAX_PARTICIPANTS,
    deadlineTimestamp,
    PRIZE_INFO,
  );

  await raffle.deployed();

  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/Raffle.sol/Raffle.json",
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const deploymentMetadata = {
    chainId: (await ethers.provider.getNetwork()).chainId,
    contractAddress: raffle.address,
    deployerAddress: (await ethers.getSigners())[0].address,
    ticketPriceWei: String(TICKET_PRICE_WEI),
    maxParticipants: Number(MAX_PARTICIPANTS),
    deadlineTimestamp,
    prizeInfo: PRIZE_INFO,
  };

  const deploymentTargets = [
    path.resolve(__dirname, "../deployments/localhost/raffle.json"),
    path.resolve(__dirname, "../../frontend/src/constants/deployment.json"),
    path.resolve(__dirname, "../../backend/src/abi/deployment.json"),
  ];

  for (const target of deploymentTargets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(deploymentMetadata, null, 2));
  }

  const abiTargets = [
    path.resolve(__dirname, "../../frontend/src/constants/abi.json"),
    path.resolve(__dirname, "../../backend/src/abi/Raffle.json"),
  ];

  for (const target of abiTargets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(artifact.abi, null, 2));
  }

  console.log(`Raffle deployed to: ${raffle.address}`);
  console.log(`Deployer: ${deploymentMetadata.deployerAddress}`);
  console.log("Local deployment metadata + ABI synced to frontend/backend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
