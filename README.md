# Decentralized Raffle Ticketing System

A full-stack decentralized application (dApp) for blockchain-based raffle ticketing on **Ethereum Sepolia**.  
Users can buy tickets on-chain, participants are tracked transparently, and winners are selected fairly using **Chainlink VRF**.

---

## Tech Stack

- **Smart Contracts:** Solidity, Hardhat, Chainlink VRF
- **Blockchain Network:** Ethereum Sepolia
- **Backend API:** Node.js, Express, Ethers.js
- **Frontend:** React (Vite), Ethers.js, MetaMask

---

## Project Structure

```text
raffle-system/
├── blockchain/
│   ├── contracts/
│   │   ├── Raffle.sol
│   │   └── mocks/
│   │       └── VRFCoordinatorV2Mock.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── Raffle.test.js
│   ├── hardhat.config.js
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── raffle.js
│   │   └── utils/
│   │       └── contract.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectWallet.jsx
│   │   │   ├── RaffleInfo.jsx
│   │   │   ├── BuyTicket.jsx
│   │   │   ├── ParticipantsList.jsx
│   │   │   ├── WinnerDisplay.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── constants/
│   │   │   └── abi.json
│   │   ├── utils/
│   │   │   └── contract.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## Build Order (Recommended)

1. Set up and test the smart contract locally with Hardhat
2. Configure Chainlink VRF + deploy contract to Sepolia
3. Configure backend to read/write to deployed contract
4. Configure frontend with contract/backend env values
5. Run end-to-end flow (buy tickets → pick winner → display winner)

---

## Prerequisites

- Node.js 18+ (recommended)
- npm
- MetaMask browser extension
- Sepolia test ETH
- Chainlink LINK (for VRF subscription funding)

---

## 1) Smart Contract Setup (`blockchain/`)

### Install dependencies

```bash
cd blockchain
npm install
```

### Configure environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Fill values in `blockchain/.env`:

- `PRIVATE_KEY`
- `SEPOLIA_RPC_URL`
- `ETHERSCAN_API_KEY`
- `VRF_SUBSCRIPTION_ID`
- `VRF_COORDINATOR_ADDRESS` (Sepolia default provided)
- `VRF_GAS_LANE` (Sepolia default provided)
- `VRF_CALLBACK_GAS_LIMIT`
- `TICKET_PRICE_WEI`
- `MAX_PARTICIPANTS`
- `RAFFLE_DEADLINE_TIMESTAMP`
- `PRIZE_INFO`

### Compile

```bash
npm run compile
```

### Run tests

```bash
npm test
```

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

After deployment, copy the deployed contract address for backend/frontend env files.

---

## 2) Chainlink VRF Setup (Sepolia)

1. Go to: https://vrf.chain.link
2. Create a VRF v2 subscription
3. Fund subscription with LINK
4. Add your deployed raffle contract as a **consumer**
5. Ensure constructor params match your subscription + coordinator + gas lane

Sepolia values used in this project:

- Coordinator: `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625`
- Key Hash (200 gwei):  
  `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`

---

## 3) Backend Setup (`backend/`)

### Install dependencies

```bash
cd backend
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Fill values in `backend/.env`:

- `CONTRACT_ADDRESS` (from deploy output)
- `PRIVATE_KEY` (admin wallet key for `pickWinner`)
- `RPC_URL` (Sepolia RPC URL)
- `PORT` (default `5000`)

### Run backend

Development:

```bash
npm run dev
```

Production-style:

```bash
npm start
```

### Backend API Endpoints

- `GET /health`
- `GET /api/raffle`
- `GET /api/raffle/participants`
- `GET /api/raffle/winner`
- `POST /api/raffle/pick-winner` (admin signer via backend)

---

## 4) Frontend Setup (`frontend/`)

### Install dependencies

```bash
cd frontend
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Fill values in `frontend/.env`:

- `VITE_CONTRACT_ADDRESS`
- `VITE_RPC_URL`
- `VITE_ADMIN_ADDRESS`
- `VITE_BACKEND_BASE_URL` (example: `http://localhost:5000`)

### Run frontend

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

---

## Frontend Components

- `ConnectWallet` — connect MetaMask and show account
- `RaffleInfo` — ticket price, deadline/countdown, participant count, state, prize pool
- `BuyTicket` — calls `enterRaffle()` with exact ETH value
- `ParticipantsList` — displays current participant addresses
- `WinnerDisplay` — shows most recent winner
- `AdminPanel` — triggers backend `pick-winner` endpoint (admin-only visibility)

---

## End-to-End Test Flow

1. Start backend and frontend
2. Connect wallet in UI
3. Buy raffle tickets from one or more wallets
4. Wait until deadline or max participants reached
5. Use admin panel to trigger winner selection
6. Verify:
   - winner appears in UI
   - participant array resets
   - prize transferred on-chain

---

## Security Notes

- Never commit real `.env` files or private keys
- Use a dedicated admin wallet for backend write operations
- Keep VRF subscription funded with LINK
- Use testnet keys/accounts only for development

---

## Common Troubleshooting

- **MetaMask not detected:** install/enable extension in browser
- **Contract call fails from backend:** check `CONTRACT_ADDRESS`, `RPC_URL`, ABI location
- **`pickWinner` reverts:** ensure deadline reached or max participants reached, and at least one participant exists
- **VRF callback not executing:** ensure contract is added as consumer and subscription has LINK
- **Frontend cannot load data:** verify `VITE_BACKEND_BASE_URL` and backend is running

---

## License

MIT