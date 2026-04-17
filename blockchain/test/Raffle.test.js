const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Raffle", function () {
  let raffle;
  let deployer;
  let player1;
  let player2;
  let player3;
  let deadline;

  const ticketPrice = ethers.utils.parseEther("0.01");
  const maxParticipants = 3;
  const prizeInfo = "Winner takes ETH prize pool";
  const RAFFLE_STATE_OPEN = 0;
  const RAFFLE_STATE_CLOSED = 1;

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

    const latestBlock = await ethers.provider.getBlock("latest");
    deadline = latestBlock.timestamp + 3600;

    const RaffleFactory = await ethers.getContractFactory("Raffle");
    raffle = await RaffleFactory.deploy(
      ticketPrice,
      maxParticipants,
      deadline,
      prizeInfo,
    );
    await raffle.deployed();
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
      expect(Number(await raffle.getRaffleState())).to.equal(RAFFLE_STATE_OPEN);
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
      expect(Number(await raffle.getRaffleState())).to.equal(RAFFLE_STATE_CLOSED);

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

    it("picks winner and closes raffle after deadline", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await mineTo(deadline + 1);

      const tx = await raffle.connect(deployer).pickWinner();
      const receipt = await tx.wait(1);

      const winnerEvent = findEvent(receipt, "WinnerPicked");
      expect(winnerEvent).to.not.equal(undefined);
      expect(winnerEvent.args.winner).to.equal(player1.address);

      expect(Number(await raffle.getRaffleState())).to.equal(RAFFLE_STATE_CLOSED);
      expect(await raffle.getRecentWinner()).to.equal(player1.address);
    });

    it("allows pickWinner early when max participants reached", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await raffle.connect(player2).enterRaffle({ value: ticketPrice });
      await raffle.connect(player3).enterRaffle({ value: ticketPrice });

      const tx = await raffle.connect(deployer).pickWinner();
      const receipt = await tx.wait(1);
      const event = findEvent(receipt, "WinnerPicked");

      expect(event).to.not.equal(undefined);
      expect([player1.address, player2.address, player3.address]).to.include(
        event.args.winner,
      );
    });
  });

  describe("winner payout flow", function () {
    it("picks winner, pays prize, resets participants, and closes raffle", async function () {
      await raffle.connect(player1).enterRaffle({ value: ticketPrice });
      await raffle.connect(player2).enterRaffle({ value: ticketPrice });
      await raffle.connect(player3).enterRaffle({ value: ticketPrice });

      const pot = ticketPrice.mul(3);

      await mineTo(deadline + 1);
      const tx = await raffle.connect(deployer).pickWinner();
      const receipt = await tx.wait(1);

      const winner = await raffle.getRecentWinner();
      expect([player1.address, player2.address, player3.address]).to.include(
        winner,
      );

      const raffleInterface = raffle.interface;
      const parsedLogs = (receipt.logs || [])
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
      expect(Number(await raffle.getRaffleState())).to.equal(RAFFLE_STATE_CLOSED);

      expect(await raffle.hasEntered(player1.address)).to.equal(false);
      expect(await raffle.hasEntered(player2.address)).to.equal(false);
      expect(await raffle.hasEntered(player3.address)).to.equal(false);

      const participants = await raffle.getParticipants();
      expect(participants.length).to.equal(0);
    });
  });
});
