require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const {
    VRF_COORDINATOR_ADDRESS,
    VRF_SUBSCRIPTION_ID,
    VRF_GAS_LANE,
    VRF_CALLBACK_GAS_LIMIT,
    TICKET_PRICE_WEI,
    MAX_PARTICIPANTS,
    RAFFLE_DEADLINE_TIMESTAMP,
    PRIZE_INFO,
  } = process.env;

  if (!VRF_COORDINATOR_ADDRESS)
    throw new Error("Missing VRF_COORDINATOR_ADDRESS");
  if (!VRF_SUBSCRIPTION_ID) throw new Error("Missing VRF_SUBSCRIPTION_ID");
  if (!VRF_GAS_LANE) throw new Error("Missing VRF_GAS_LANE");
  if (!VRF_CALLBACK_GAS_LIMIT)
    throw new Error("Missing VRF_CALLBACK_GAS_LIMIT");
  if (!TICKET_PRICE_WEI) throw new Error("Missing TICKET_PRICE_WEI");
  if (!MAX_PARTICIPANTS) throw new Error("Missing MAX_PARTICIPANTS");
  if (!RAFFLE_DEADLINE_TIMESTAMP)
    throw new Error("Missing RAFFLE_DEADLINE_TIMESTAMP");
  if (!PRIZE_INFO) throw new Error("Missing PRIZE_INFO");

  const raffleFactory = await ethers.getContractFactory("Raffle");

  const raffle = await raffleFactory.deploy(
    VRF_COORDINATOR_ADDRESS,
    VRF_SUBSCRIPTION_ID,
    VRF_GAS_LANE,
    VRF_CALLBACK_GAS_LIMIT,
    TICKET_PRICE_WEI,
    MAX_PARTICIPANTS,
    RAFFLE_DEADLINE_TIMESTAMP,
    PRIZE_INFO,
  );

  await raffle.deployed();

  console.log(`Raffle deployed to: ${raffle.address}`);
  console.log("Constructor params:");
  console.log(`- VRF Coordinator: ${VRF_COORDINATOR_ADDRESS}`);
  console.log(`- Subscription ID: ${VRF_SUBSCRIPTION_ID}`);
  console.log(`- Gas Lane: ${VRF_GAS_LANE}`);
  console.log(`- Callback Gas Limit: ${VRF_CALLBACK_GAS_LIMIT}`);
  console.log(`- Ticket Price (wei): ${TICKET_PRICE_WEI}`);
  console.log(`- Max Participants: ${MAX_PARTICIPANTS}`);
  console.log(`- Deadline (timestamp): ${RAFFLE_DEADLINE_TIMESTAMP}`);
  console.log(`- Prize Info: ${PRIZE_INFO}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
