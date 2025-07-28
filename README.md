# Crypto Crash Game

A real-time multiplayer Crash game with cryptocurrency integration, built with Node.js, Express, Socket.IO, and MongoDB.

## 🎮 Game Overview

Crypto Crash is a multiplayer gambling game where players bet in USD, which gets converted to cryptocurrency (BTC/ETH) using real-time prices. Players watch a multiplier increase exponentially and must cash out before the game "crashes" to win. The game features:

- **Real-time multiplayer gameplay** with WebSocket connections
- **Cryptocurrency integration** with live BTC/ETH prices from CoinGecko API
- **Provably fair crash algorithm** with transparent seed and hash verification
- **Wallet system** with USD, BTC, and ETH balances
- **Transaction logging** for all bets and cashouts
- **Modern responsive UI** with real-time charts and animations

## 🚀 Features

### Game Logic
- Rounds start every 10 seconds with a 3-second betting period
- Multiplier increases exponentially from 1x
- Provably fair crash points using cryptographic hashing
- Real-time multiplier updates every 100ms
- Automatic round management and state tracking

### Cryptocurrency Integration
- Real-time BTC and ETH price fetching from CoinGecko API
- USD to crypto conversion at current market rates
- Wallet balances in USD, BTC, and ETH
- Transaction history with price tracking
- Fallback prices when API is unavailable

### WebSocket Real-time Features
- Live multiplier updates
- Player bet and cashout notifications
- Round start/crash events
- Connected player count
- Real-time crypto price updates

### Security & Fairness
- Input validation and sanitization
- Rate limiting on API endpoints
- Provably fair crash algorithm
- Atomic database transactions
- Error handling and logging

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Axios** - HTTP client for API calls
- **Winston** - Logging
- **Joi** - Input validation
- **Helmet** - Security middleware

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **Socket.IO Client** - Real-time communication
- **Chart.js** - Real-time charts
- **CSS3** - Modern styling with animations
- **Font Awesome** - Icons

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd crypto-crash-game
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```bash
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/crypto-crash

# Crypto API Configuration
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Game Configuration
GAME_ROUND_DURATION=10000
MULTIPLIER_UPDATE_INTERVAL=100
MAX_CRASH_MULTIPLIER=100
GROWTH_FACTOR=0.01

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# On Windows
net start MongoDB
```

### 5. Setup Database
Run the database setup script to create sample data:
```bash
npm run setup
```

### 6. Start the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## 🎯 API Documentation

### Game Endpoints

#### GET /api/game/state
Get current game state and active round information.

**Response:**
```json
{
  "status": "waiting",
  "currentRound": {
    "roundId": "1234567890-abc123",
    "status": "waiting",
    "startTime": "2024-01-01T00:00:00.000Z",
    "crashPoint": 2.5,
    "currentMultiplier": 1.0,
    "totalBets": 1500,
    "totalCashouts": 800,
    "totalWinners": 3,
    "totalLosers": 2,
    "seed": "abc123...",
    "hash": "def456..."
  }
}
```

#### POST /api/game/bet
Place a bet in the current round.

**Request:**
```json
{
  "playerId": "player1",
  "username": "CryptoKing",
  "usdAmount": 100,
  "currency": "btc"
}
```

**Response:**
```json
{
  "success": true,
  "betData": {
    "playerId": "player1",
    "username": "CryptoKing",
    "usdAmount": 100,
    "cryptoAmount": 0.0016,
    "currency": "btc",
    "priceAtTime": 62500
  },
  "playerBalance": {
    "usd": 900,
    "btc": 0.001,
    "eth": 0.05
  }
}
```

#### POST /api/game/cashout
Cash out during an active round.

**Request:**
```json
{
  "playerId": "player1",
  "username": "CryptoKing"
}
```

**Response:**
```json
{
  "success": true,
  "multiplier": 2.5,
  "payoutCrypto": 0.004,
  "payoutUsd": 250,
  "playerBalance": {
    "usd": 900,
    "btc": 0.005,
    "eth": 0.05
  }
}
```

#### GET /api/game/history
Get round history with pagination.

**Query Parameters:**
- `limit` (optional): Number of rounds to return (default: 10)
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "rounds": [
    {
      "roundId": "1234567890-abc123",
      "status": "crashed",
      "crashPoint": 2.5,
      "totalBets": 1500,
      "totalCashouts": 800,
      "totalWinners": 3,
      "totalLosers": 2,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-01-01T00:00:10.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Wallet Endpoints

#### GET /api/wallet/balance/:playerId
Get player wallet balance with USD equivalents.

**Response:**
```json
{
  "playerId": "player1",
  "username": "CryptoKing",
  "wallet": {
    "btc": 0.001,
    "eth": 0.05,
    "usd": 1000,
    "btcUsd": 62.5,
    "ethUsd": 150,
    "totalUsd": 1212.5
  },
  "statistics": {
    "totalBets": 2500,
    "totalWins": 3200,
    "totalLosses": 800
  },
  "prices": {
    "btc": 62500,
    "eth": 3000
  }
}
```

#### POST /api/wallet/create
Create a new player wallet.

**Request:**
```json
{
  "playerId": "newplayer",
  "username": "NewPlayer"
}
```

#### GET /api/wallet/transactions/:playerId
Get player transaction history.

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 20)
- `page` (optional): Page number (default: 1)

#### POST /api/wallet/deposit
Simulate a deposit to player wallet.

**Request:**
```json
{
  "playerId": "player1",
  "amount": 1000,
  "currency": "usd"
}
```

### Crypto Endpoints

#### GET /api/crypto/prices
Get current cryptocurrency prices.

**Response:**
```json
{
  "success": true,
  "prices": {
    "btc": 62500,
    "eth": 3000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /api/crypto/convert
Convert between USD and cryptocurrency.

**Query Parameters:**
- `amount`: Amount to convert
- `fromCurrency`: Source currency (usd, btc, eth)
- `toCurrency`: Target currency (usd, btc, eth)

**Response:**
```json
{
  "success": true,
  "conversion": {
    "fromAmount": 100,
    "fromCurrency": "usd",
    "toAmount": 0.0016,
    "toCurrency": "btc",
    "rate": 62500
  }
}
```

## 🔌 WebSocket Events

### Client to Server Events

#### `authenticate`
Authenticate player with the game.
```javascript
socket.emit('authenticate', {
  playerId: 'player1',
  username: 'CryptoKing'
});
```

#### `placeBet`
Place a bet in the current round.
```javascript
socket.emit('placeBet', {
  usdAmount: 100,
  currency: 'btc'
});
```

#### `cashout`
Cash out during an active round.
```javascript
socket.emit('cashout', {});
```

### Server to Client Events

#### `authenticated`
Authentication successful.
```javascript
socket.on('authenticated', (data) => {
  console.log('Connected players:', data.connectedPlayers);
});
```

#### `gameState`
Current game state update.
```javascript
socket.on('gameState', (state) => {
  console.log('Game status:', state.status);
});
```

#### `roundStart`
New round started.
```javascript
socket.on('roundStart', (data) => {
  console.log('Round ID:', data.roundId);
  console.log('Seed:', data.seed);
  console.log('Hash:', data.hash);
});
```

#### `multiplierUpdate`
Real-time multiplier update.
```javascript
socket.on('multiplierUpdate', (data) => {
  console.log('Multiplier:', data.multiplier);
  console.log('Elapsed time:', data.elapsedTime);
});
```

#### `roundCrashed`
Round crashed event.
```javascript
socket.on('roundCrashed', (data) => {
  console.log('Crash point:', data.crashPoint);
  console.log('Final multiplier:', data.finalMultiplier);
});
```

#### `betPlaced`
Player placed a bet.
```javascript
socket.on('betPlaced', (data) => {
  console.log('Player:', data.username);
  console.log('Amount:', data.usdAmount);
  console.log('Currency:', data.currency);
});
```

#### `cashoutProcessed`
Player cashed out.
```javascript
socket.on('cashoutProcessed', (data) => {
  console.log('Player:', data.username);
  console.log('Multiplier:', data.multiplier);
  console.log('Payout:', data.payoutUsd);
});
```

## 🎲 Provably Fair Algorithm

The crash point is generated using a provably fair algorithm:

1. **Seed Generation**: A random 32-byte seed is generated for each round
2. **Hash Creation**: The seed is combined with the round ID and hashed using SHA-256
3. **Random Value**: The first 8 bytes of the hash are converted to a random number
4. **Crash Point**: The random number is converted to a crash point using the formula:
   ```
   crash_point = max(1, (1 / (1 - random_value)) * (1 - house_edge))
   ```
5. **House Edge**: A 1% house edge is applied to ensure profitability

### Verification
Players can verify the crash point using the provided seed and round ID. The algorithm is deterministic and can be independently verified.

## 📊 Database Schema

### Player Collection
```javascript
{
  playerId: String,
  username: String,
  wallet: {
    btc: Number,
    eth: Number,
    usd: Number
  },
  totalBets: Number,
  totalWins: Number,
  totalLosses: Number,
  createdAt: Date,
  lastActive: Date
}
```

### GameRound Collection
```javascript
{
  roundId: String,
  status: String, // 'waiting', 'active', 'crashed'
  startTime: Date,
  endTime: Date,
  crashPoint: Number,
  seed: String,
  hash: String,
  maxMultiplier: Number,
  bets: [BetSchema],
  totalBets: Number,
  totalCashouts: Number,
  totalWinners: Number,
  totalLosers: Number,
  houseProfit: Number
}
```

### Transaction Collection
```javascript
{
  transactionId: String,
  playerId: String,
  username: String,
  transactionType: String, // 'bet', 'cashout', 'deposit'
  roundId: String,
  currency: String,
  usdAmount: Number,
  cryptoAmount: Number,
  priceAtTime: Number,
  multiplier: Number,
  transactionHash: String,
  status: String,
  balanceBefore: Object,
  balanceAfter: Object,
  timestamp: Date
}
```

## 🧪 Testing

### API Testing with cURL

#### Test Game State
```bash
curl http://localhost:3000/api/game/state
```

#### Test Bet Placement
```bash
curl -X POST http://localhost:3000/api/game/bet \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player1",
    "username": "CryptoKing",
    "usdAmount": 100,
    "currency": "btc"
  }'
```

#### Test Cashout
```bash
curl -X POST http://localhost:3000/api/game/cashout \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player1",
    "username": "CryptoKing"
  }'
```

#### Test Wallet Balance
```bash
curl http://localhost:3000/api/wallet/balance/player1
```

#### Test Crypto Prices
```bash
curl http://localhost:3000/api/crypto/prices
```

### WebSocket Testing

You can test WebSocket functionality using the browser console or a WebSocket client:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000');

// Authenticate
socket.emit('authenticate', {
  playerId: 'testplayer',
  username: 'TestPlayer'
});

// Listen for events
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});

socket.on('gameState', (state) => {
  console.log('Game state:', state);
});

socket.on('multiplierUpdate', (data) => {
  console.log('Multiplier:', data.multiplier);
});
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-mongodb-url
COINGECKO_API_URL=https://api.coingecko.com/api/v3
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret
```

### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start server.js --name crypto-crash

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Docker Deployment
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support or questions, please open an issue on GitHub or contact the development team.

## 🔮 Future Enhancements

- [ ] Additional cryptocurrencies (LTC, BCH, etc.)
- [ ] Advanced charting with technical indicators
- [ ] Social features (chat, leaderboards)
- [ ] Mobile app development
- [ ] Advanced betting options (auto-cashout)
- [ ] Tournament mode
- [ ] Affiliate system
- [ ] Advanced analytics dashboard 