const express = require("express");
const {
  getReadContract,
  getWriteContract,
  formatRaffleState,
  parseContractError,
  toEthString,
} = require("../utils/contract");

const router = express.Router();

/**
 * GET /api/raffle
 * Returns current raffle state:
 * - ticket price (wei + ETH)
 * - deadline (timestamp)
 * - participant count
 * - raffle state
 * - prize info
 * - contract balance (prize pool)
 */
router.get("/", async (_req, res) => {
  try {
    const contract = getReadContract();

    const [
      ticketPriceWei,
      deadline,
      participantCount,
      raffleStateRaw,
      prizeInfo,
      prizePoolWei,
      maxParticipants,
      recentWinner,
    ] = await Promise.all([
      contract.getTicketPrice(),
      contract.getDeadline(),
      contract.getParticipantCount(),
      contract.getRaffleState(),
      contract.getPrizeInfo(),
      contract.getPrizePool(),
      contract.getMaxParticipants(),
      contract.getRecentWinner(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ticketPriceWei: ticketPriceWei.toString(),
        ticketPriceEth: toEthString(ticketPriceWei),
        deadline: Number(deadline),
        participantCount: Number(participantCount),
        maxParticipants: Number(maxParticipants),
        raffleState: formatRaffleState(Number(raffleStateRaw)),
        prizeInfo,
        prizePoolWei: prizePoolWei.toString(),
        prizePoolEth: toEthString(prizePoolWei),
        recentWinner,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch raffle state",
      details: parseContractError(error),
    });
  }
});

/**
 * GET /api/raffle/participants
 * Returns all participant wallet addresses
 */
router.get("/participants", async (_req, res) => {
  try {
    const contract = getReadContract();
    const participants = await contract.getParticipants();

    return res.status(200).json({
      success: true,
      data: {
        count: participants.length,
        participants,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch participants",
      details: parseContractError(error),
    });
  }
});

/**
 * GET /api/raffle/winner
 * Returns the most recent winner address
 */
router.get("/winner", async (_req, res) => {
  try {
    const contract = getReadContract();
    const winner = await contract.getRecentWinner();

    return res.status(200).json({
      success: true,
      data: {
        winner,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch winner",
      details: parseContractError(error),
    });
  }
});

/**
 * POST /api/raffle/pick-winner
 * Admin-only endpoint (secured by backend wallet/private key in env)
 * Triggers pickWinner() on-chain.
 */
router.post("/pick-winner", async (_req, res) => {
  try {
    const contract = getWriteContract();

    const tx = await contract.pickWinner();
    const receipt = await tx.wait(1);

    return res.status(200).json({
      success: true,
      message: "pickWinner transaction submitted and confirmed",
      data: {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to trigger pickWinner",
      details: parseContractError(error),
    });
  }
});

module.exports = router;
