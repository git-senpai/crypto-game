# 🚀 Crypto Crash Game - Quick Start Guide

Get the Crypto Crash game up and running in minutes!

## ⚡ Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp env.example .env
```

### 3. Start MongoDB
Make sure MongoDB is running on your system:
- **Windows**: Start MongoDB service
- **macOS**: `brew services start mongodb-community`
- **Linux**: `sudo systemctl start mongod`

### 4. Setup Database
```bash
npm run setup
```

### 5. Start the Game
```bash
npm run dev
```

### 6. Open the Game
Visit `http://localhost:3000` in your browser

## 🎮 How to Play

1. **Join the Game**: Enter a username and player ID
2. **Place Bets**: Choose amount and cryptocurrency (BTC/ETH)
3. **Watch the Multiplier**: It increases exponentially from 1x
4. **Cash Out**: Click "Cash Out" before the game crashes
5. **Win or Lose**: If you cash out before crash, you win!

## 🧪 Test Everything

Run the test script to verify everything is working:
```bash
npm run test-setup
```

## 📚 API Testing

Import the Postman collection: `Crypto_Crash_API.postman_collection.json`

## 🎯 Sample Players

The setup script creates these sample players:
- **CryptoKing** (player1) - $5000 USD
- **LuckyGambler** (player2) - $3000 USD
- **RiskTaker** (player3) - $1500 USD
- **ConservativePlayer** (player4) - $8000 USD
- **HighRoller** (player5) - $12000 USD

## 🔧 Troubleshooting

### Server won't start?
- Check if MongoDB is running
- Verify `.env` file exists
- Check port 3000 is available

### Database connection failed?
- Ensure MongoDB is installed and running
- Check MongoDB connection string in `.env`

### Crypto prices not loading?
- Check internet connection
- CoinGecko API might be rate limited (fallback prices will be used)

### WebSocket connection failed?
- Check if server is running on port 3000
- Verify firewall settings

## 📖 Next Steps

1. **Read the full documentation**: See `README.md`
2. **Test the APIs**: Use the Postman collection
3. **Customize the game**: Modify game parameters in `.env`
4. **Deploy to production**: Follow deployment guide in README

## 🎉 You're Ready!

The Crypto Crash game is now running with:
- ✅ Real-time multiplayer gameplay
- ✅ Live cryptocurrency prices
- ✅ Provably fair crash algorithm
- ✅ Modern responsive UI
- ✅ Complete API documentation

Happy gaming! 🎮 