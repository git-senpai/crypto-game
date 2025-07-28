const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Player = require('../models/Player');
const GameRound = require('../models/GameRound');
const Transaction = require('../models/Transaction');
const CryptoUtils = require('../utils/crypto');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

// Sample players data
const samplePlayers = [
  {
    playerId: 'player1',
    username: 'CryptoKing',
    wallet: { btc: 0.001, eth: 0.05, usd: 5000 },
    totalBets: 2500,
    totalWins: 3200,
    totalLosses: 800
  },
  {
    playerId: 'player2',
    username: 'LuckyGambler',
    wallet: { btc: 0.002, eth: 0.1, usd: 3000 },
    totalBets: 1800,
    totalWins: 2200,
    totalLosses: 600
  },
  {
    playerId: 'player3',
    username: 'RiskTaker',
    wallet: { btc: 0.0005, eth: 0.02, usd: 1500 },
    totalBets: 1200,
    totalWins: 800,
    totalLosses: 400
  },
  {
    playerId: 'player4',
    username: 'ConservativePlayer',
    wallet: { btc: 0.003, eth: 0.15, usd: 8000 },
    totalBets: 4000,
    totalWins: 4500,
    totalLosses: 500
  },
  {
    playerId: 'player5',
    username: 'HighRoller',
    wallet: { btc: 0.005, eth: 0.25, usd: 12000 },
    totalBets: 8000,
    totalWins: 9500,
    totalLosses: 1500
  }
];

// Sample game rounds data
const sampleRounds = [
  {
    roundId: 'round1',
    status: 'crashed',
    startTime: new Date(Date.now() - 60000),
    endTime: new Date(Date.now() - 50000),
    crashPoint: 2.5,
    seed: CryptoUtils.generateSeed(),
    hash: 'sample_hash_1',
    maxMultiplier: 2.5,
    totalBets: 1500,
    totalCashouts: 800,
    totalWinners: 3,
    totalLosers: 2,
    houseProfit: 700
  },
  {
    roundId: 'round2',
    status: 'crashed',
    startTime: new Date(Date.now() - 120000),
    endTime: new Date(Date.now() - 110000),
    crashPoint: 1.8,
    seed: CryptoUtils.generateSeed(),
    hash: 'sample_hash_2',
    maxMultiplier: 1.8,
    totalBets: 2200,
    totalCashouts: 1800,
    totalWinners: 5,
    totalLosers: 1,
    houseProfit: 400
  },
  {
    roundId: 'round3',
    status: 'crashed',
    startTime: new Date(Date.now() - 180000),
    endTime: new Date(Date.now() - 170000),
    crashPoint: 5.2,
    seed: CryptoUtils.generateSeed(),
    hash: 'sample_hash_3',
    maxMultiplier: 5.2,
    totalBets: 3000,
    totalCashouts: 2800,
    totalWinners: 4,
    totalLosers: 3,
    houseProfit: 200
  }
];

// Sample transactions data
const sampleTransactions = [
  {
    transactionId: 'tx1',
    playerId: 'player1',
    username: 'CryptoKing',
    transactionType: 'bet',
    roundId: 'round1',
    currency: 'btc',
    usdAmount: 500,
    cryptoAmount: 0.008,
    priceAtTime: 62500,
    transactionHash: 'hash1',
    status: 'completed'
  },
  {
    transactionId: 'tx2',
    playerId: 'player1',
    username: 'CryptoKing',
    transactionType: 'cashout',
    roundId: 'round1',
    currency: 'btc',
    usdAmount: 1000,
    cryptoAmount: 0.016,
    priceAtTime: 62500,
    multiplier: 2.0,
    transactionHash: 'hash2',
    status: 'completed'
  },
  {
    transactionId: 'tx3',
    playerId: 'player2',
    username: 'LuckyGambler',
    transactionType: 'bet',
    roundId: 'round1',
    currency: 'eth',
    usdAmount: 300,
    cryptoAmount: 0.1,
    priceAtTime: 3000,
    transactionHash: 'hash3',
    status: 'completed'
  },
  {
    transactionId: 'tx4',
    playerId: 'player2',
    username: 'LuckyGambler',
    transactionType: 'cashout',
    roundId: 'round1',
    currency: 'eth',
    usdAmount: 750,
    cryptoAmount: 0.25,
    priceAtTime: 3000,
    multiplier: 2.5,
    transactionHash: 'hash4',
    status: 'completed'
  }
];

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Connected to MongoDB');

    // Clear existing data
    logger.info('Clearing existing data...');
    await Player.deleteMany({});
    await GameRound.deleteMany({});
    await Transaction.deleteMany({});

    // Create sample players
    logger.info('Creating sample players...');
    for (const playerData of samplePlayers) {
      const player = new Player(playerData);
      await player.save();
      logger.info(`Created player: ${playerData.username}`);
    }

    // Create sample game rounds
    logger.info('Creating sample game rounds...');
    for (const roundData of sampleRounds) {
      const round = new GameRound(roundData);
      await round.save();
      logger.info(`Created round: ${roundData.roundId}`);
    }

    // Create sample transactions
    logger.info('Creating sample transactions...');
    for (const txData of sampleTransactions) {
      const transaction = new Transaction({
        ...txData,
        balanceBefore: { usd: 1000, btc: 0.001, eth: 0.05 },
        balanceAfter: { usd: 500, btc: 0.001, eth: 0.05 },
        timestamp: new Date()
      });
      await transaction.save();
      logger.info(`Created transaction: ${txData.transactionId}`);
    }

    logger.info('Database setup completed successfully!');
    logger.info(`Created ${samplePlayers.length} players`);
    logger.info(`Created ${sampleRounds.length} game rounds`);
    logger.info(`Created ${sampleTransactions.length} transactions`);

    // Display sample data
    const players = await Player.find();
    const rounds = await GameRound.find();
    const transactions = await Transaction.find();

    logger.info('\nSample Data Summary:');
    logger.info('Players:', players.map(p => `${p.username} (${p.playerId})`));
    logger.info('Rounds:', rounds.map(r => `${r.roundId} - ${r.crashPoint}x`));
    logger.info('Transactions:', transactions.length);

  } catch (error) {
    logger.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase; 