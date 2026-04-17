# Decentralized Raffle Ticketing System

Local-first full-stack dApp for raffle ticketing with Solidity smart contracts.

## What changed

- Removed mandatory external Chainlink/VRF setup requirement.
- Added local deployment metadata sync so frontend/backend auto-read contract address.
- Kept decentralized raffle ticketing flow on blockchain (Solidity + smart contract + wallet txs).
- Updated docs for easy local run.

## Quick Start (No External Configuration Required)

### 1) Install dependencies

```bash
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/blockchain && npm install
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/backend && npm install
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/frontend && npm install
```

### 2) Start local blockchain node

```bash
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/blockchain
npm run node
```

### 3) Deploy contract locally (auto-syncs ABI + address)

In a new terminal:

```bash
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/blockchain
npm run deploy:local
```

This updates:
- `blockchain/deployments/localhost/raffle.json`
- `frontend/src/constants/deployment.json`
- `frontend/src/constants/abi.json`
- `backend/src/abi/deployment.json`
- `backend/src/abi/Raffle.json`

### 4) Start backend

```bash
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/backend
npm run dev
```

### 5) Start frontend

```bash
cd /home/runner/work/decentralized-raffle-dapp/decentralized-raffle-dapp/frontend
npm run dev
```

Open the Vite URL shown in terminal, connect wallet to local chain, buy tickets, and trigger winner selection.

---

## To-do Lists (for your 4 points)

### 1) Remove external configuration requirements
- [x] Remove mandatory Chainlink VRF subscription setup from contract flow
- [x] Remove mandatory external Sepolia-only config for normal local run
- [x] Auto-generate and sync local deployment address/ABI for backend + frontend
- [x] Keep optional env overrides for custom network usage

### 2) Make project run
- [x] Provide local-first run path with no required external websites/services
- [x] Ensure backend can run with defaults (`localhost:8545`, deployment metadata)
- [x] Ensure frontend can run with defaults (`localhost:5000`, deployment metadata)
- [x] Add explicit quick-start sequence in docs
- [ ] (Optional) Add single-command orchestrated runner script

### 3) Keep base idea: decentralized raffle ticketing
- [x] Keep on-chain ticket purchase (`enterRaffle`) with exact ticket price
- [x] Keep participant tracking on-chain
- [x] Keep owner-triggered winner picking on-chain
- [x] Keep prize payout from contract balance to selected winner

### 4) Ensure blockchain, Solidity, and smart contracts remain present
- [x] Keep Solidity smart contract (`blockchain/contracts/Raffle.sol`)
- [x] Keep Hardhat blockchain workspace + tests
- [x] Keep backend and frontend integration with contract ABI/address
- [x] Keep dApp architecture (smart contract + backend API + React UI)

---

## Notes

- This project is now optimized for local development first.
- External testnet deployment is still possible by setting env vars manually.
