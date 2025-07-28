const logger = require('../utils/logger');

class WebSocketService {
  constructor(io, gameService) {
    this.io = io;
    this.gameService = gameService;
    this.connectedClients = new Map(); // socketId -> playerData
    this.playerSockets = new Map(); // playerId -> socketId

    this.setupEventHandlers();
    this.setupGameEventListeners();
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle player authentication
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });

      // Handle bet placement
      socket.on('placeBet', (data) => {
        this.handlePlaceBet(socket, data);
      });

      // Handle cashout request
      socket.on('cashout', (data) => {
        this.handleCashout(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send current game state to new connection
      this.sendGameState(socket);
    });
  }

  /**
   * Setup game service event listeners
   */
  setupGameEventListeners() {
    // Round start event
    this.gameService.on('roundStart', (data) => {
      this.broadcastToAll('roundStart', {
        roundId: data.roundId,
        startTime: data.startTime,
        seed: data.seed,
        hash: data.hash,
        status: 'waiting'
      });
    });

    // Round activated event
    this.gameService.on('roundActivated', (data) => {
      this.broadcastToAll('roundActivated', {
        roundId: data.roundId,
        startTime: data.startTime,
        status: 'active'
      });
    });

    // Multiplier update event
    this.gameService.on('multiplierUpdate', (data) => {
      this.broadcastToAll('multiplierUpdate', {
        roundId: data.roundId,
        multiplier: data.multiplier,
        elapsedTime: data.elapsedTime
      });
    });

    // Round crashed event
    this.gameService.on('roundCrashed', (data) => {
      this.broadcastToAll('roundCrashed', {
        roundId: data.roundId,
        crashPoint: data.crashPoint,
        finalMultiplier: data.finalMultiplier,
        statistics: data.statistics
      });
    });

    // Bet placed event
    this.gameService.on('betPlaced', (data) => {
      this.broadcastToAll('betPlaced', {
        roundId: data.roundId,
        playerId: data.playerId,
        username: data.username,
        usdAmount: data.usdAmount,
        cryptoAmount: data.cryptoAmount,
        currency: data.currency
      });
    });

    // Cashout processed event
    this.gameService.on('cashoutProcessed', (data) => {
      this.broadcastToAll('cashoutProcessed', {
        roundId: data.roundId,
        playerId: data.playerId,
        username: data.username,
        multiplier: data.multiplier,
        payoutCrypto: data.payoutCrypto,
        payoutUsd: data.payoutUsd,
        currency: data.currency
      });
    });
  }

  /**
   * Handle player authentication
   */
  async handleAuthentication(socket, data) {
    try {
      const { playerId, username } = data;

      if (!playerId || !username) {
        socket.emit('error', { message: 'Player ID and username are required' });
        return;
      }

      // Store player data
      this.connectedClients.set(socket.id, { playerId, username });
      this.playerSockets.set(playerId, socket.id);

      // Add to game service
      this.gameService.addConnectedPlayer(playerId);

      // Send authentication success
      socket.emit('authenticated', {
        playerId,
        username,
        connectedPlayers: this.gameService.getConnectedPlayersCount()
      });

      // Broadcast player joined
      this.broadcastToAll('playerJoined', {
        playerId,
        username,
        connectedPlayers: this.gameService.getConnectedPlayersCount()
      });

      logger.info(`Player authenticated: ${username} (${playerId})`);

    } catch (error) {
      logger.error('Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  }

  /**
   * Handle bet placement
   */
  async handlePlaceBet(socket, data) {
    try {
      const playerData = this.connectedClients.get(socket.id);
      if (!playerData) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { usdAmount, currency } = data;

      // Validate input
      if (!usdAmount || usdAmount <= 0) {
        socket.emit('error', { message: 'Invalid bet amount' });
        return;
      }

      if (!currency || !['btc', 'eth'].includes(currency.toLowerCase())) {
        socket.emit('error', { message: 'Invalid currency' });
        return;
      }

      // Place bet through game service
      const result = await this.gameService.placeBet(
        playerData.playerId,
        playerData.username,
        usdAmount,
        currency
      );

      // Send success response
      socket.emit('betPlaced', {
        success: true,
        betData: result.betData,
        playerBalance: result.playerBalance
      });

      logger.info(`Bet placed via WebSocket: ${playerData.username} bet $${usdAmount} in ${currency}`);

    } catch (error) {
      logger.error('Bet placement error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle cashout request
   */
  async handleCashout(socket, data) {
    try {
      const playerData = this.connectedClients.get(socket.id);
      if (!playerData) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Process cashout through game service
      const result = await this.gameService.processCashout(
        playerData.playerId,
        playerData.username
      );

      // Send success response
      socket.emit('cashoutProcessed', {
        success: true,
        multiplier: result.multiplier,
        payoutCrypto: result.payoutCrypto,
        payoutUsd: result.payoutUsd,
        playerBalance: result.playerBalance
      });

      logger.info(`Cashout processed via WebSocket: ${playerData.username} cashed out at ${result.multiplier}x`);

    } catch (error) {
      logger.error('Cashout error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(socket) {
    const playerData = this.connectedClients.get(socket.id);
    
    if (playerData) {
      // Remove from game service
      this.gameService.removeConnectedPlayer(playerData.playerId);
      
      // Remove from tracking maps
      this.connectedClients.delete(socket.id);
      this.playerSockets.delete(playerData.playerId);

      // Broadcast player left
      this.broadcastToAll('playerLeft', {
        playerId: playerData.playerId,
        username: playerData.username,
        connectedPlayers: this.gameService.getConnectedPlayersCount()
      });

      logger.info(`Player disconnected: ${playerData.username} (${playerData.playerId})`);
    }

    logger.info(`Client disconnected: ${socket.id}`);
  }

  /**
   * Send current game state to a specific socket
   */
  sendGameState(socket) {
    const gameState = this.gameService.getGameState();
    socket.emit('gameState', gameState);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send message to specific player
   */
  sendToPlayer(playerId, event, data) {
    const socketId = this.playerSockets.get(playerId);
    if (socketId) {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send message to specific socket
   */
  sendToSocket(socketId, event, data) {
    this.io.to(socketId).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected players count
   */
  getConnectedPlayersCount() {
    return this.connectedClients.size;
  }

  /**
   * Get connected players list
   */
  getConnectedPlayers() {
    const players = [];
    for (const [socketId, playerData] of this.connectedClients) {
      players.push({
        socketId,
        playerId: playerData.playerId,
        username: playerData.username
      });
    }
    return players;
  }

  /**
   * Send round history to a specific socket
   */
  async sendRoundHistory(socket, limit = 10) {
    try {
      const history = await this.gameService.getRoundHistory(limit);
      socket.emit('roundHistory', history);
    } catch (error) {
      logger.error('Error sending round history:', error);
      socket.emit('error', { message: 'Failed to get round history' });
    }
  }

  /**
   * Send crypto prices to a specific socket
   */
  async sendCryptoPrices(socket) {
    try {
      const prices = await this.gameService.cryptoApi.getAllPrices();
      socket.emit('cryptoPrices', prices);
    } catch (error) {
      logger.error('Error sending crypto prices:', error);
      socket.emit('error', { message: 'Failed to get crypto prices' });
    }
  }

  /**
   * Broadcast crypto prices to all clients
   */
  async broadcastCryptoPrices() {
    try {
      const prices = await this.gameService.cryptoApi.getAllPrices();
      this.broadcastToAll('cryptoPrices', prices);
    } catch (error) {
      logger.error('Error broadcasting crypto prices:', error);
    }
  }

  /**
   * Start periodic crypto price updates
   */
  startCryptoPriceUpdates() {
    // Update crypto prices every 10 seconds
    setInterval(() => {
      this.broadcastCryptoPrices();
    }, 10000);
  }
}

module.exports = WebSocketService; 