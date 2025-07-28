const express = require('express');
const Joi = require('joi');
const GameRound = require('../models/GameRound');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const betSchema = Joi.object({
  playerId: Joi.string().required(),
  username: Joi.string().required(),
  usdAmount: Joi.number().positive().required(),
  currency: Joi.string().valid('btc', 'eth').required()
});

const cashoutSchema = Joi.object({
  playerId: Joi.string().required(),
  username: Joi.string().required()
});

/**
 * GET /api/game/state
 * Get current game state
 */
router.get('/state', async (req, res) => {
  try {
    // Get the most recent active or waiting round
    const currentRound = await GameRound.findOne({
      status: { $in: ['waiting', 'active'] }
    }).sort({ startTime: -1 });

    if (!currentRound) {
      return res.json({
        status: 'waiting',
        currentRound: null,
        message: 'No active round'
      });
    }

    // Calculate current multiplier if round is active
    let currentMultiplier = 1.0;
    if (currentRound.status === 'active') {
      const elapsedTime = Date.now() - currentRound.startTime.getTime();
      const { calculateMultiplier } = require('../utils/crypto');
      currentMultiplier = calculateMultiplier(elapsedTime);
    }

    res.json({
      status: currentRound.status,
      currentRound: {
        roundId: currentRound.roundId,
        status: currentRound.status,
        startTime: currentRound.startTime,
        crashPoint: currentRound.crashPoint,
        currentMultiplier: currentMultiplier,
        totalBets: currentRound.totalBets,
        totalCashouts: currentRound.totalCashouts,
        totalWinners: currentRound.totalWinners,
        totalLosers: currentRound.totalLosers,
        seed: currentRound.seed,
        hash: currentRound.hash
      }
    });
  } catch (error) {
    logger.error('Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

/**
 * POST /api/game/bet
 * Place a bet in the current round
 */
router.post('/bet', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = betSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { playerId, username, usdAmount, currency } = value;

    // Get current round
    const currentRound = await GameRound.findOne({
      status: 'waiting'
    }).sort({ startTime: -1 });

    if (!currentRound) {
      return res.status(400).json({ error: 'No active round accepting bets' });
    }

    // Get or create player
    let player = await Player.findOne({ playerId });
    if (!player) {
      player = new Player({
        playerId,
        username
      });
    }

    // Check if player has sufficient balance
    if (player.wallet.usd < usdAmount) {
      return res.status(400).json({ error: 'Insufficient USD balance' });
    }

    // Get crypto prices
    const CryptoApiService = require('../services/CryptoApiService');
    const cryptoApi = new CryptoApiService();
    const prices = await cryptoApi.getAllPrices();
    const pricePerCrypto = prices[currency.toLowerCase()];

    if (!pricePerCrypto || pricePerCrypto <= 0) {
      return res.status(400).json({ error: 'Unable to get current crypto price' });
    }

    // Convert USD to crypto
    const { usdToCrypto } = require('../utils/crypto');
    const cryptoAmount = usdToCrypto(usdAmount, currency, pricePerCrypto);

    // Create bet data
    const betData = {
      playerId,
      username,
      usdAmount,
      cryptoAmount,
      currency: currency.toLowerCase(),
      priceAtTime: pricePerCrypto,
      betTime: new Date()
    };

    // Add bet to round
    await currentRound.addBet(betData);

    // Update player balance
    await player.updateWallet('usd', -usdAmount);

    // Create transaction record
    const transaction = new Transaction({
      transactionId: Transaction.generateTransactionId(),
      playerId,
      username,
      transactionType: 'bet',
      roundId: currentRound.roundId,
      currency: currency.toLowerCase(),
      usdAmount,
      cryptoAmount,
      priceAtTime: pricePerCrypto,
      transactionHash: Transaction.generateTransactionHash(betData),
      balanceBefore: {
        usd: player.wallet.usd + usdAmount,
        btc: player.wallet.btc,
        eth: player.wallet.eth
      },
      balanceAfter: {
        usd: player.wallet.usd,
        btc: player.wallet.btc,
        eth: player.wallet.eth
      }
    });

    await transaction.save();

    // Update player stats
    player.totalBets += usdAmount;
    await player.save();

    logger.info(`Bet placed via API: ${username} bet $${usdAmount} in ${currency}`);

    res.json({
      success: true,
      betData,
      playerBalance: player.wallet,
      roundId: currentRound.roundId
    });

  } catch (error) {
    logger.error('Error placing bet:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/game/cashout
 * Process a cashout request
 */
router.post('/cashout', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = cashoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { playerId, username } = value;

    // Get current active round
    const currentRound = await GameRound.findOne({
      status: 'active'
    }).sort({ startTime: -1 });

    if (!currentRound) {
      return res.status(400).json({ error: 'No active round for cashout' });
    }

    // Find player's active bet
    const activeBet = currentRound.bets.find(
      bet => bet.playerId === playerId && !bet.cashoutMultiplier
    );

    if (!activeBet) {
      return res.status(400).json({ error: 'No active bet found for player' });
    }

    // Calculate current multiplier
    const elapsedTime = Date.now() - currentRound.startTime.getTime();
    const { calculateMultiplier } = require('../utils/crypto');
    const currentMultiplier = calculateMultiplier(elapsedTime);

    // Process cashout
    await currentRound.processCashout(playerId, currentMultiplier);

    // Get player
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(400).json({ error: 'Player not found' });
    }

    // Calculate payout
    const payoutCrypto = activeBet.cryptoAmount * currentMultiplier;
    const payoutUsd = activeBet.cashoutUsdAmount;

    // Update player balance
    await player.updateWallet(activeBet.currency, payoutCrypto);
    player.totalWins += payoutUsd;
    await player.save();

    // Create transaction record
    const transaction = new Transaction({
      transactionId: Transaction.generateTransactionId(),
      playerId,
      username,
      transactionType: 'cashout',
      roundId: currentRound.roundId,
      currency: activeBet.currency,
      usdAmount: payoutUsd,
      cryptoAmount: payoutCrypto,
      priceAtTime: activeBet.priceAtTime,
      multiplier: currentMultiplier,
      transactionHash: Transaction.generateTransactionHash({
        playerId,
        transactionType: 'cashout',
        usdAmount: payoutUsd,
        cryptoAmount: payoutCrypto
      }),
      balanceBefore: {
        usd: player.wallet.usd,
        btc: player.wallet.btc,
        eth: player.wallet.eth
      },
      balanceAfter: {
        usd: player.wallet.usd,
        btc: player.wallet.btc,
        eth: player.wallet.eth
      }
    });

    await transaction.save();

    logger.info(`Cashout processed via API: ${username} cashed out at ${currentMultiplier}x for $${payoutUsd}`);

    res.json({
      success: true,
      multiplier: currentMultiplier,
      payoutCrypto,
      payoutUsd,
      playerBalance: player.wallet,
      roundId: currentRound.roundId
    });

  } catch (error) {
    logger.error('Error processing cashout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/game/history
 * Get round history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const rounds = await GameRound.find()
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .select('roundId status crashPoint totalBets totalCashouts totalWinners totalLosers startTime endTime seed hash');

    const total = await GameRound.countDocuments();

    res.json({
      rounds: rounds.map(round => ({
        roundId: round.roundId,
        status: round.status,
        crashPoint: round.crashPoint,
        totalBets: round.totalBets,
        totalCashouts: round.totalCashouts,
        totalWinners: round.totalWinners,
        totalLosers: round.totalLosers,
        startTime: round.startTime,
        endTime: round.endTime,
        seed: round.seed,
        hash: round.hash
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting round history:', error);
    res.status(500).json({ error: 'Failed to get round history' });
  }
});

/**
 * GET /api/game/round/:roundId
 * Get specific round details
 */
router.get('/round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await GameRound.findOne({ roundId });
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    res.json({
      roundId: round.roundId,
      status: round.status,
      startTime: round.startTime,
      endTime: round.endTime,
      crashPoint: round.crashPoint,
      seed: round.seed,
      hash: round.hash,
      totalBets: round.totalBets,
      totalCashouts: round.totalCashouts,
      totalWinners: round.totalWinners,
      totalLosers: round.totalLosers,
      houseProfit: round.houseProfit,
      bets: round.bets.map(bet => ({
        playerId: bet.playerId,
        username: bet.username,
        usdAmount: bet.usdAmount,
        cryptoAmount: bet.cryptoAmount,
        currency: bet.currency,
        priceAtTime: bet.priceAtTime,
        cashoutMultiplier: bet.cashoutMultiplier,
        cashoutCryptoAmount: bet.cashoutCryptoAmount,
        cashoutUsdAmount: bet.cashoutUsdAmount,
        isWinner: bet.isWinner,
        betTime: bet.betTime,
        cashoutTime: bet.cashoutTime
      }))
    });
  } catch (error) {
    logger.error('Error getting round details:', error);
    res.status(500).json({ error: 'Failed to get round details' });
  }
});

/**
 * GET /api/game/statistics
 * Get game statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const totalRounds = await GameRound.countDocuments();
    const completedRounds = await GameRound.countDocuments({ status: 'crashed' });
    const totalBets = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$totalBets' } } }
    ]);
    const totalCashouts = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$totalCashouts' } } }
    ]);
    const totalWinners = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$totalWinners' } } }
    ]);
    const totalLosers = await GameRound.aggregate([
      { $group: { _id: null, total: { $sum: '$totalLosers' } } }
    ]);

    const totalPlayers = await Player.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    res.json({
      totalRounds,
      completedRounds,
      totalBets: totalBets[0]?.total || 0,
      totalCashouts: totalCashouts[0]?.total || 0,
      totalWinners: totalWinners[0]?.total || 0,
      totalLosers: totalLosers[0]?.total || 0,
      totalPlayers,
      totalTransactions,
      houseProfit: (totalBets[0]?.total || 0) - (totalCashouts[0]?.total || 0)
    });
  } catch (error) {
    logger.error('Error getting game statistics:', error);
    res.status(500).json({ error: 'Failed to get game statistics' });
  }
});

module.exports = router; 