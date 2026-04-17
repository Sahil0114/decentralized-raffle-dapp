// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title Raffle
 * @notice Decentralized raffle contract with on-chain ticketing and winner selection
 * @dev This local-first variant resolves winner selection synchronously in pickWinner(),
 * so no intermediate CALCULATING state is needed.
 */
contract Raffle {
    enum RaffleState {
        OPEN,
        CLOSED
    }

    // Immutable raffle configuration
    address private immutable i_owner;
    uint256 private immutable i_ticketPrice;
    uint256 private immutable i_maxParticipants;
    uint256 private immutable i_deadline;
    string private i_prizeInfo;

    // Mutable raffle state
    address payable[] private s_participants;
    mapping(address => bool) private s_hasEntered;
    address private s_recentWinner;
    RaffleState private s_raffleState;

    // Events
    event RaffleEntered(address indexed player);
    event WinnerPicked(address indexed winner);
    event PrizePaid(address indexed winner, uint256 amount);

    constructor(
        uint256 ticketPrice,
        uint256 maxParticipants,
        uint256 deadline,
        string memory prizeInfo
    ) {
        require(ticketPrice > 0, "Ticket price must be > 0");
        require(maxParticipants > 0, "Max participants must be > 0");
        require(deadline > block.timestamp, "Deadline must be future");
        require(bytes(prizeInfo).length > 0, "Prize info required");

        i_owner = msg.sender;
        i_ticketPrice = ticketPrice;
        i_maxParticipants = maxParticipants;
        i_deadline = deadline;
        i_prizeInfo = prizeInfo;

        s_raffleState = RaffleState.OPEN;
    }

    function enterRaffle() external payable {
        require(s_raffleState == RaffleState.OPEN, "Raffle not open");
        require(block.timestamp < i_deadline, "Raffle deadline passed");
        require(s_participants.length < i_maxParticipants, "Max participants reached");
        require(msg.value == i_ticketPrice, "Incorrect ticket price");
        require(!s_hasEntered[msg.sender], "Duplicate entry");

        s_participants.push(payable(msg.sender));
        s_hasEntered[msg.sender] = true;

        emit RaffleEntered(msg.sender);
    }

    function pickWinner() external {
        require(msg.sender == i_owner, "Only owner");
        require(s_raffleState == RaffleState.OPEN, "Raffle not open");
        require(block.chainid == 31337, "Winner selection is local-chain only");
        require(
            block.timestamp >= i_deadline || s_participants.length == i_maxParticipants,
            "Raffle still ongoing"
        );
        require(s_participants.length > 0, "No participants");

        // NOTE: This entropy source is acceptable for local/test usage but not ideal for
        // production high-value raffles because block data can be influenced by validators.
        uint256 winnerIndex = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, s_participants.length)
            )
        ) % s_participants.length;
        address payable winner = s_participants[winnerIndex];

        s_recentWinner = winner;
        s_raffleState = RaffleState.CLOSED;

        uint256 participantCount = s_participants.length;
        for (uint256 i = 0; i < participantCount; i++) {
            s_hasEntered[s_participants[i]] = false;
        }

        s_participants = new address payable[](0);

        uint256 prizeAmount = address(this).balance;
        (bool success, ) = winner.call{value: prizeAmount}("");
        require(success, "Transfer failed");

        emit WinnerPicked(winner);
        emit PrizePaid(winner, prizeAmount);
    }

    // View functions
    function getOwner() external view returns (address) {
        return i_owner;
    }

    function getTicketPrice() external view returns (uint256) {
        return i_ticketPrice;
    }

    function getMaxParticipants() external view returns (uint256) {
        return i_maxParticipants;
    }

    function getDeadline() external view returns (uint256) {
        return i_deadline;
    }

    function getPrizeInfo() external view returns (string memory) {
        return i_prizeInfo;
    }

    function getParticipants() external view returns (address payable[] memory) {
        return s_participants;
    }

    function getParticipant(uint256 index) external view returns (address) {
        return s_participants[index];
    }

    function getParticipantCount() external view returns (uint256) {
        return s_participants.length;
    }

    function hasEntered(address account) external view returns (bool) {
        return s_hasEntered[account];
    }

    function getRecentWinner() external view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() external view returns (RaffleState) {
        return s_raffleState;
    }

    function getPrizePool() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
    fallback() external payable {}
}
