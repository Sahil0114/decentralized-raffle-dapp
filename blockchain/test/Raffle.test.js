const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Raffle", function () {
  let raffle;
  let vrfCoordinatorV2Mock;
  let deployer;
  let player1;
  let player2;
  let player3;
  let subscriptionId;
  let deadline;

  const BASE_FEE = ethers.utils.parseEther("0.25");
  const GAS_PRICE_LINK = 1e9;
  const FUND_AMOUNT = ethers.utils.parseEther("10");

  const ticketPrice = ethers.utils.parseEther("0.01");
  const maxParticipants = 3;
  const callbackGasLimit = 500000;
  const gasLane =
    "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const prizeInfo = "Winner takes ETH prize pool";

  async function mineTo(timestamp) {
    await network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await network.provider.send("evm_mine");
  }

  async function expectRevert(promise, expectedMessage) {
    try {
      await promise;
      expect.fail("Expected transaction to revert");
    } catch (error) {
      const message =
        error?.reason || error?.message || error?.data?.message || "";
      expect(message).to.include(expectedMessage);
    }
  }

  function findEvent(receipt, eventName) {
    return (receipt.events || []).find((e) => e.event === eventName);
  }

  beforeEach(async function () {
    [deployer, player1, player2, player3] = await ethers.getSigners();

    const VRFCoordinatorV2MockFactory = await ethers.getContractFactory(
      "VRFCoordinatorV2Mock",
    );
    vrfCoordinatorV2Mock = await VRFCoordinatorV2MockFactory.deploy(
      BASE_FEE,
      GAS_PRICE_LINK,
    );
    await vrfCoordinatorV2Mock.deployed();

    const subTx = await vrfCoordinatorV2Mock.createSubscription();
    const subReceipt = await subTx.wait(1);
    subscriptionId = subReceipt.events[0].args.subId;

    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);

    const latestBlock = await ethers.provider.getBlock("latest");
    deadline = latestBlock.timestamp + 3600;

    const RaffleFactory = await ethers.getContractFactory("Raffle");
    raffle = await RaffleFactory.deploy(
      vrfCoordinatorV2Mock.address,
      subscriptionId,
      gasLane,
      callbackGasLimit,
      ticketPrice,
      maxParticipants,
      deadline,
      prizeInfo,
    );
    await raffle.deployed();

    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  });

  describe("constructor", function () {
    it("initializes immutable and state variables correctly", async function () {
      expect(await raffle.getOwner()).to.equal(deployer.address);
      expect((await raffle.getTicketPrice()).eq(ticketPrice)).to.equal(true);
      expect((await raffle.getMaxParticipants()).eq(maxParticipants)).to.equal(
        true,
      );
      expect((await raffle.getDeadline()).eq(deadline)).to.equal(true);
      expect(await raffle.getPrizeInfo()).to.equal(prizeInfo);
      expect((await raffle.getParticipantCount()).eq(0)).to.equal(true);
      expect(Number(await raffle.getRaffleState())).to.equal(0);

      const vrfConfig = await raffle.getVrfConfig();
      expect(vrfConfig.coordinator).to.equal(vrfCoordinatorV2Mock.address);
      expect(vrfConfig.subscriptionId.eq(subscriptionId)).to.equal(true);
      expect(vrfConfig.gasLane).to.equal(gasLane);
      expect(Number(vrfConfig.callbackGasLimit)).to.equal(callbackGasLimit);
      expect(vrfConfig.requestConfirmations).to.equal(3);
      expect(vrfConfig.numWords).to.equal(1);
    });
  });

  describe("enterRaffle", function () {
    it("reverts if not exact ETH sent", async function () {
      await expectRevert(
        raffle.connect(player1).enterRaffle({ value: ticketPrice.sub(1) }),
        "Incorrect ticket price",
      );

      await expectRevert(
        raffle.connect(player1).enterRaffle({ value: ticketPrice.add(1) }),
        "Incorrect ticket price",
      );
    });

    it("records participant and emits event on valid entry", async function () {
      const tx = await raffle
        .connect(player1)
        .enterRaffle({ value: ticketPrice });
      const receipt = await tx.wait(1);

      const event = findEvent(receipt, "RaffleEntered");
      expect(event).to.not.equal(undefined);
      expect(event.args.player).to.equal(player1.address);

      const participants = await raffle.getParticipants();
      expect(participants.length).to.equal(1);
      expect(participants[0]).to.equal(player1.address);
      expect((await raffle.getParticipantCount()).eq(1)).to.equal(true);
      expect(await raffle.hasEntered(player1.address)).to.equal(true);
    });

    it("prevents duplicate entry", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });

      await expectRevert(
        raffle.connect(player1).enterRaffle({ value: ticketPrice }),
        "Duplicate entry",
      );
    });

    it("allows unique participants up to maxParticipants", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await raffle.connect(player2).enterRaffle({ value: ticketPrice });
      await raffle.connect(player3).enterRaffle({ value: ticketPrice });

      expect((await raffle.getParticipantCount()).eq(maxParticipants)).to.equal(
        true,
      );

      const participants = await raffle.getParticipants();
      expect(participants[0]).to.equal(player1.address);
      expect(participants[1]).to.equal(player2.address);
      expect(participants[2]).to.equal(player3.address);
    });

    it("reverts when max participants reached", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await raffle.connect(player2).enterRaffle({ value: ticketPrice });
      await raffle.connect(player3).enterRaffle({ value: ticketPrice });

      const extra = (await ethers.getSigners())[4];
      await expectRevert(
        raffle.connect(extra).enterRaffle({ value: ticketPrice }),
        "Max participants reached",
      );
    });

    it("reverts when deadline passed", async function () {
      await mineTo(deadline + 1);

      await expectRevert(
        raffle.connect(player1).enterRaffle({ value: ticketPrice }),
        "Raffle deadline passed",
      );
    });

    it("reverts when raffle is not OPEN", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await mineTo(deadline + 1);

      await raffle.connect(deployer).pickWinner();
      expect(Number(await raffle.getRaffleState())).to.equal(1);

      await expectRevert(
        raffle.connect(player2).enterRaffle({ value: ticketPrice }),
        "Raffle not open",
      );
    });
  });

  describe("pickWinner", function () {
    it("reverts if caller is not owner", async function () {
      await expectRevert(raffle.connect(player1).pickWinner(), "Only owner");
    });

    it("reverts if raffle still ongoing", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });

      await expectRevert(
        raffle.connect(deployer).pickWinner(),
        "Raffle still ongoing",
      );
    });

    it("reverts if no participants", async function () {
      await mineTo(deadline + 1);

      await expectRevert(
        raffle.connect(deployer).pickWinner(),
        "No participants",
      );
    });

    it("requests randomness and sets CALCULATING after deadline", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await mineTo(deadline + 1);

      const tx = await raffle.connect(deployer).pickWinner();
      const receipt = await tx.wait(1);

      const event = findEvent(receipt, "RequestedRaffleWinner");
      expect(event).to.not.equal(undefined);
      expect(event.args.requestId.gt(0)).to.equal(true);

      expect(Number(await raffle.getRaffleState())).to.equal(1);
      expect(
        (await raffle.getLastRequestId()).eq(event.args.requestId),
      ).to.equal(true);
    });

    it("allows pickWinner early when max participants reached", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await raffle.connect(player2).enterRaffle({ value: ticketPrice });
      await raffle.connect(player3).enterRaffle({ value: ticketPrice });

      const tx = await raffle.connect(deployer).pickWinner();
      const receipt = await tx.wait(1);
      const event = findEvent(receipt, "RequestedRaffleWinner");

      expect(event).to.not.equal(undefined);
      expect(event.args.requestId.gt(0)).to.equal(true);
    });
  });

  describe("fulfillRandomWords", function () {
    it("reverts if request does not exist", async function () {
      await expectRevert(
        vrfCoordinatorV2Mock.fulfillRandomWords(999, raffle.address),
        "nonexistent request",
      );
    });

    it("picks winner, pays prize, resets participants, and closes raffle", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await raffle.connect(player2).enterRaffle({ value: ticketPrice });
      await raffle.connect(player3).enterRaffle({ value: ticketPrice });

      const pot = ticketPrice.mul(3);

      await mineTo(deadline + 1);
      const tx = await raffle.connect(deployer).pickWinner();
      const receipt = await tx.wait(1);
      const requestId = findEvent(receipt, "RequestedRaffleWinner").args
        .requestId;

      const fulfillTx = await vrfCoordinatorV2Mock.fulfillRandomWords(
        requestId,
        raffle.address,
      );
      const fulfillReceipt = await fulfillTx.wait(1);

      const winner = await raffle.getRecentWinner();
      expect([player1.address, player2.address, player3.address]).to.include(
        winner,
      );

      const raffleInterface = raffle.interface;
      const parsedLogs = (fulfillReceipt.logs || [])
        .filter(
          (log) => log.address.toLowerCase() === raffle.address.toLowerCase(),
        )
        .map((log) => {
          try {
            return raffleInterface.parseLog(log);
          } catch (_e) {
            return null;
          }
        })
        .filter(Boolean);

      const winnerPickedEvent = parsedLogs.find(
        (parsed) => parsed.name === "WinnerPicked",
      );
      const prizePaidEvent = parsedLogs.find(
        (parsed) => parsed.name === "PrizePaid",
      );

      expect(winnerPickedEvent).to.not.equal(undefined);
      expect(winnerPickedEvent.args.winner).to.equal(winner);

      expect(prizePaidEvent).to.not.equal(undefined);
      expect(prizePaidEvent.args.winner).to.equal(winner);
      expect(prizePaidEvent.args.amount.eq(pot)).to.equal(true);

      expect((await raffle.getPrizePool()).eq(0)).to.equal(true);
      expect((await raffle.getParticipantCount()).eq(0)).to.equal(true);
      expect(Number(await raffle.getRaffleState())).to.equal(2);

      expect(await raffle.hasEntered(player1.address)).to.equal(false);
      expect(await raffle.hasEntered(player2.address)).to.equal(false);
      expect(await raffle.hasEntered(player3.address)).to.equal(false);

      const participants = await raffle.getParticipants();
      expect(participants.length).to.equal(0);
    });
  });
});
