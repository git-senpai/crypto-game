const EventEmitter = require('events');
const CryptoUtils = require('../utils/crypto');
const CryptoApiService = require('./CryptoApiService');
const GameRound = require('../models/GameRound');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

class GameService extends EventEmitter {
  constructor() {
    super();
    this.cryptoApi = new CryptoApiService();
    this.currentRound = null;
    this.gameInterval = null;
    this.multiplierInterval = null;
    this.roundDuration = parseInt(process.env.GAME_ROUND_DURATION) || 10000; // 10 seconds
    this.multiplierUpdateInterval = parseInt(process.env.MULTIPLIER_UPDATE_INTERVAL) || 100; // 100ms
    this.growthFactor = parseFloat(process.env.GROWTH_FACTOR) || 0.01;
    this.isRunning = false;
    this.connectedPlayers = new Set();
  }

  /**
   * Start the game service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Game service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting game service');
    
    // Start the first round
    this.startNewRound();
  }

  /**
   * Stop the game service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Game service is not running');
      return;
    }

    this.isRunning = false;
    logger.info('Stopping game service');

    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }

    if (this.multiplierInterval) {
      clearInterval(this.multiplierInterval);
      this.multiplierInterval = null;
    }

    // Finalize current round if active
    if (this.currentRound && this.currentRound.status === 'active') {
      this.finalizeRound();
    }
  }

  /**
   * Start a new game round
   */
  async startNewRound() {
    try {
      // Generate round data
      const roundId = CryptoUtils.generateRoundId();
      const seed = CryptoUtils.generateSeed();
      const crashData = CryptoUtils.generateCrashPoint(seed, roundId);
      
      // Create new round
      this.currentRound = new GameRound({
        roundId: roundId,
        status: 'waiting',
        startTime: new Date(),
        crashPoint: crashData.crashPoint,
        seed: crashData.seed,
        hash: crashData.hash
      });

      await this.currentRound.save();
      
      logger.info(`New round started: ${roundId}, crash point: ${crashData.crashPoint}x`);
      
      // Emit round start event
      this.emit('roundStart', {
        roundId: roundId,
        startTime: this.currentRound.startTime,
        seed: crashData.seed,
        hash: crashData.hash
      });

      // Start the round after a short delay
      setTimeout(() => {
        this.activateRound();
      }, 3000); // 3 second waiting period

    } catch (error) {
      logger.error('Error starting new round:', error);
      // Retry after a delay
      setTimeout(() => this.startNewRound(), 5000);
    }
  }

  /**
   * Activate the current round
   */
  activateRound() {
    if (!this.currentRound || this.currentRound.status !== 'waiting') {
      return;
    }

    this.currentRound.status = 'active';
    this.currentRound.save();

    const startTime = Date.now();
    let currentMultiplier = 1.0;

    logger.info(`Round ${this.currentRound.roundId} activated`);

    // Emit round activation
    this.emit('roundActivated', {
      roundId: this.currentRound.roundId,
      startTime: startTime
    });

    // Start multiplier updates
    this.multiplierInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      currentMultiplier = CryptoUtils.calculateMultiplier(elapsedTime, this.growthFactor);

      // Update max multiplier
      if (currentMultiplier > this.currentRound.maxMultiplier) {
        this.currentRound.maxMultiplier = currentMultiplier;
      }

      // Emit multiplier update
      this.emit('multiplierUpdate', {
        roundId: this.currentRound.roundId,
        multiplier: currentMultiplier,
        elapsedTime: elapsedTime
      });

      // Check if game should crash
      if (currentMultiplier >= this.currentRound.crashPoint) {
        this.crashRound(currentMultiplier);
      }
    }, this.multiplierUpdateInterval);

    // Set timeout for round end
    setTimeout(() => {
      if (this.currentRound && this.currentRound.status === 'active') {
        this.crashRound(currentMultiplier);
      }
    }, this.roundDuration);
  }

  /**
   * Crash the current round
   */
  async crashRound(finalMultiplier) {
    if (!this.currentRound || this.currentRound.status !== 'active') {
      return;
    }

    // Clear multiplier interval
    if (this.multiplierInterval) {
      clearInterval(this.multiplierInterval);
      this.multiplierInterval = null;
    }

    // Finalize the round
    await this.currentRound.finalizeRound();

    logger.info(`Round ${this.currentRound.roundId} crashed at ${finalMultiplier}x`);

    // Emit crash event
    this.emit('roundCrashed', {
      roundId: this.currentRound.roundId,
      crashPoint: this.currentRound.crashPoint,
      finalMultiplier: finalMultiplier,
      statistics: this.currentRound.getStatistics()
    });

    // Start next round after a delay
    setTimeout(() => {
      this.startNewRound();
    }, 5000); // 5 second delay between rounds
  }

  /**
   * Place a bet in the current round
   */
  async placeBet(playerId, username, usdAmount, currency) {
    try {
      // Validate inputs
      if (!usdAmount || usdAmount <= 0) {
        throw new Error('Invalid bet amount');
      }

      if (!CryptoUtils.isValidCurrency(currency)) {
        throw new Error('Invalid currency');
      }

      if (!this.currentRound || this.currentRound.status !== 'waiting') {
        throw new Error('No active round accepting bets');
      }

      // Get current crypto prices
      const prices = await this.cryptoApi.getAllPrices();
      const pricePerCrypto = prices[currency.toLowerCase()];

      if (!pricePerCrypto || pricePerCrypto <= 0) {
        throw new Error('Unable to get current crypto price');
      }

      // Convert USD to crypto
      const cryptoAmount = CryptoUtils.usdToCrypto(usdAmount, currency, pricePerCrypto);

      // Get or create player
      let player = await Player.findOne({ playerId: playerId });
      if (!player) {
        player = new Player({
          playerId: playerId,
          username: username
        });
      }

      // Check if player has sufficient balance
      if (player.wallet.usd < usdAmount) {
        throw new Error('Insufficient USD balance');
      }

      // Create bet data
      const betData = {
        playerId: playerId,
        username: username,
        usdAmount: usdAmount,
        cryptoAmount: cryptoAmount,
        currency: currency.toLowerCase(),
        priceAtTime: pricePerCrypto,
        betTime: new Date()
      };

      // Add bet to round
      await this.currentRound.addBet(betData);

      // Update player balance
      await player.updateWallet('usd', -usdAmount);

      // Create transaction record
      const transaction = new Transaction({
        transactionId: Transaction.generateTransactionId(),
        playerId: playerId,
        username: username,
        transactionType: 'bet',
        roundId: this.currentRound.roundId,
        currency: currency.toLowerCase(),
        usdAmount: usdAmount,
        cryptoAmount: cryptoAmount,
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

      logger.info(`Bet placed: ${username} bet $${usdAmount} in ${currency}`);

      // Emit bet placed event
      this.emit('betPlaced', {
        roundId: this.currentRound.roundId,
        playerId: playerId,
        username: username,
        usdAmount: usdAmount,
        cryptoAmount: cryptoAmount,
        currency: currency
      });

      return {
        success: true,
        betData: betData,
        playerBalance: player.wallet
      };

    } catch (error) {
      logger.error('Error placing bet:', error);
      throw error;
    }
  }

  /**
   * Process a cashout request
   */
  async processCashout(playerId, username) {
    try {
      if (!this.currentRound || this.currentRound.status !== 'active') {
        throw new Error('No active round for cashout');
      }

      // Find player's active bet
      const activeBet = this.currentRound.bets.find(
        bet => bet.playerId === playerId && !bet.cashoutMultiplier
      );

      if (!activeBet) {
        throw new Error('No active bet found for player');
      }

      // Calculate current multiplier
      const elapsedTime = Date.now() - this.currentRound.startTime.getTime();
      const currentMultiplier = CryptoUtils.calculateMultiplier(elapsedTime, this.growthFactor);

      // Process cashout
      await this.currentRound.processCashout(playerId, currentMultiplier);

      // Get player
      const player = await Player.findOne({ playerId: playerId });
      if (!player) {
        throw new Error('Player not found');
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
        playerId: playerId,
        username: username,
        transactionType: 'cashout',
        roundId: this.currentRound.roundId,
        currency: activeBet.currency,
        usdAmount: payoutUsd,
        cryptoAmount: payoutCrypto,
        priceAtTime: activeBet.priceAtTime,
        multiplier: currentMultiplier,
        transactionHash: Transaction.generateTransactionHash({
          playerId: playerId,
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

      logger.info(`Cashout processed: ${username} cashed out at ${currentMultiplier}x for $${payoutUsd}`);

      // Emit cashout event
      this.emit('cashoutProcessed', {
        roundId: this.currentRound.roundId,
        playerId: playerId,
        username: username,
        multiplier: currentMultiplier,
        payoutCrypto: payoutCrypto,
        payoutUsd: payoutUsd,
        currency: activeBet.currency
      });

      return {
        success: true,
        multiplier: currentMultiplier,
        payoutCrypto: payoutCrypto,
        payoutUsd: payoutUsd,
        playerBalance: player.wallet
      };

    } catch (error) {
      logger.error('Error processing cashout:', error);
      throw error;
    }
  }

  /**
   * Get current game state
   */
  getGameState() {
    if (!this.currentRound) {
      return {
        status: 'waiting',
        currentRound: null
      };
    }

    return {
      status: this.currentRound.status,
      currentRound: {
        roundId: this.currentRound.roundId,
        status: this.currentRound.status,
        startTime: this.currentRound.startTime,
        crashPoint: this.currentRound.crashPoint,
        totalBets: this.currentRound.totalBets,
        totalCashouts: this.currentRound.totalCashouts,
        totalWinners: this.currentRound.totalWinners,
        totalLosers: this.currentRound.totalLosers
      }
    };
  }

  /**
   * Get round history
   */
  async getRoundHistory(limit = 10) {
    try {
      const rounds = await GameRound.find()
        .sort({ startTime: -1 })
        .limit(limit)
        .select('roundId status crashPoint totalBets totalCashouts totalWinners totalLosers startTime endTime');

      return rounds.map(round => ({
        roundId: round.roundId,
        status: round.status,
        crashPoint: round.crashPoint,
        totalBets: round.totalBets,
        totalCashouts: round.totalCashouts,
        totalWinners: round.totalWinners,
        totalLosers: round.totalLosers,
        startTime: round.startTime,
        endTime: round.endTime
      }));
    } catch (error) {
      logger.error('Error getting round history:', error);
      return [];
    }
  }

  /**
   * Add connected player
   */
  addConnectedPlayer(playerId) {
    this.connectedPlayers.add(playerId);
  }

  /**
   * Remove connected player
   */
  removeConnectedPlayer(playerId) {
    this.connectedPlayers.delete(playerId);
  }

  /**
   * Get connected players count
   */
  getConnectedPlayersCount() {
    return this.connectedPlayers.size;
  }
}

module.exports = GameService; 