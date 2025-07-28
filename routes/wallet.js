const express = require('express');
const Joi = require('joi');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const CryptoApiService = require('../services/CryptoApiService');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const playerSchema = Joi.object({
  playerId: Joi.string().required(),
  username: Joi.string().required()
});

/**
 * GET /api/wallet/balance/:playerId
 * Get player wallet balance
 */
router.get('/balance/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    // Get player
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get current crypto prices
    const cryptoApi = new CryptoApiService();
    const prices = await cryptoApi.getAllPrices();

    // Get USD equivalent of crypto balances
    const balanceData = player.getUsdEquivalent(prices);

    res.json({
      playerId: player.playerId,
      username: player.username,
      wallet: {
        btc: player.wallet.btc,
        eth: player.wallet.eth,
        usd: player.wallet.usd,
        btcUsd: balanceData.btcUsd,
        ethUsd: balanceData.ethUsd,
        totalUsd: balanceData.totalUsd
      },
      statistics: {
        totalBets: player.totalBets,
        totalWins: player.totalWins,
        totalLosses: player.totalLosses
      },
      prices: prices
    });
  } catch (error) {
    logger.error('Error getting wallet balance:', error);
    res.status(500).json({ error: 'Failed to get wallet balance' });
  }
});

/**
 * POST /api/wallet/create
 * Create a new player wallet
 */
router.post('/create', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = playerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { playerId, username } = value;

    // Check if player already exists
    const existingPlayer = await Player.findOne({ 
      $or: [{ playerId }, { username }] 
    });

    if (existingPlayer) {
      return res.status(400).json({ error: 'Player already exists' });
    }

    // Create new player
    const player = new Player({
      playerId,
      username
    });

    await player.save();

    logger.info(`New player created: ${username} (${playerId})`);

    res.json({
      success: true,
      player: {
        playerId: player.playerId,
        username: player.username,
        wallet: player.wallet,
        createdAt: player.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

/**
 * GET /api/wallet/transactions/:playerId
 * Get player transaction history
 */
router.get('/transactions/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Check if player exists
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get transactions
    const transactions = await Transaction.find({ playerId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ playerId });

    res.json({
      playerId,
      username: player.username,
      transactions: transactions.map(tx => ({
        transactionId: tx.transactionId,
        transactionType: tx.transactionType,
        roundId: tx.roundId,
        currency: tx.currency,
        usdAmount: tx.usdAmount,
        cryptoAmount: tx.cryptoAmount,
        priceAtTime: tx.priceAtTime,
        multiplier: tx.multiplier,
        transactionHash: tx.transactionHash,
        status: tx.status,
        timestamp: tx.timestamp,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

/**
 * GET /api/wallet/statistics/:playerId
 * Get player statistics
 */
router.get('/statistics/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    // Get player
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get transaction statistics
    const betTransactions = await Transaction.find({
      playerId,
      transactionType: 'bet'
    });

    const cashoutTransactions = await Transaction.find({
      playerId,
      transactionType: 'cashout'
    });

    const totalBets = betTransactions.length;
    const totalCashouts = cashoutTransactions.length;
    const totalBetAmount = betTransactions.reduce((sum, tx) => sum + tx.usdAmount, 0);
    const totalCashoutAmount = cashoutTransactions.reduce((sum, tx) => sum + tx.usdAmount, 0);
    const netProfit = totalCashoutAmount - totalBetAmount;
    const winRate = totalBets > 0 ? (totalCashouts / totalBets) * 100 : 0;

    // Get crypto prices for current balance
    const cryptoApi = new CryptoApiService();
    const prices = await cryptoApi.getAllPrices();
    const balanceData = player.getUsdEquivalent(prices);

    res.json({
      playerId: player.playerId,
      username: player.username,
      wallet: {
        btc: player.wallet.btc,
        eth: player.wallet.eth,
        usd: player.wallet.usd,
        btcUsd: balanceData.btcUsd,
        ethUsd: balanceData.ethUsd,
        totalUsd: balanceData.totalUsd
      },
      statistics: {
        totalBets: totalBets,
        totalCashouts: totalCashouts,
        totalBetAmount: totalBetAmount,
        totalCashoutAmount: totalCashoutAmount,
        netProfit: netProfit,
        winRate: winRate,
        totalWins: player.totalWins,
        totalLosses: player.totalLosses
      },
      prices: prices
    });
  } catch (error) {
    logger.error('Error getting player statistics:', error);
    res.status(500).json({ error: 'Failed to get player statistics' });
  }
});

/**
 * GET /api/wallet/players
 * Get all players (admin endpoint)
 */
router.get('/players', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const players = await Player.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('playerId username wallet totalBets totalWins totalLosses createdAt lastActive');

    const total = await Player.countDocuments();

    // Get crypto prices for balance calculations
    const cryptoApi = new CryptoApiService();
    const prices = await cryptoApi.getAllPrices();

    const playersWithBalances = players.map(player => {
      const balanceData = player.getUsdEquivalent(prices);
      return {
        playerId: player.playerId,
        username: player.username,
        wallet: {
          btc: player.wallet.btc,
          eth: player.wallet.eth,
          usd: player.wallet.usd,
          btcUsd: balanceData.btcUsd,
          ethUsd: balanceData.ethUsd,
          totalUsd: balanceData.totalUsd
        },
        statistics: {
          totalBets: player.totalBets,
          totalWins: player.totalWins,
          totalLosses: player.totalLosses
        },
        createdAt: player.createdAt,
        lastActive: player.lastActive
      };
    });

    res.json({
      players: playersWithBalances,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      prices: prices
    });
  } catch (error) {
    logger.error('Error getting players:', error);
    res.status(500).json({ error: 'Failed to get players' });
  }
});

/**
 * POST /api/wallet/deposit
 * Simulate a deposit to player wallet
 */
router.post('/deposit', async (req, res) => {
  try {
    const { playerId, amount, currency = 'usd' } = req.body;

    if (!playerId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit parameters' });
    }

    // Get player
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update wallet balance
    await player.updateWallet(currency, amount);

    // Create transaction record
    const transaction = new Transaction({
      transactionId: Transaction.generateTransactionId(),
      playerId,
      username: player.username,
      transactionType: 'deposit',
      currency: currency,
      usdAmount: currency === 'usd' ? amount : 0,
      cryptoAmount: currency !== 'usd' ? amount : 0,
      priceAtTime: 1,
      transactionHash: Transaction.generateTransactionHash({
        playerId,
        transactionType: 'deposit',
        usdAmount: currency === 'usd' ? amount : 0,
        cryptoAmount: currency !== 'usd' ? amount : 0
      }),
      balanceBefore: {
        usd: player.wallet.usd - (currency === 'usd' ? amount : 0),
        btc: player.wallet.btc - (currency === 'btc' ? amount : 0),
        eth: player.wallet.eth - (currency === 'eth' ? amount : 0)
      },
      balanceAfter: {
        usd: player.wallet.usd,
        btc: player.wallet.btc,
        eth: player.wallet.eth
      }
    });

    await transaction.save();

    logger.info(`Deposit processed: ${player.username} received ${amount} ${currency}`);

    res.json({
      success: true,
      playerBalance: player.wallet,
      transaction: transaction.getSummary()
    });
  } catch (error) {
    logger.error('Error processing deposit:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

module.exports = router; 