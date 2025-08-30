// test/models/GameRound.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const GameRound = require('../../models/GameRound'); // Adjust path as needed

// Mock MongoDB connection (replace with your actual connection string if needed)
const mockConnection = {
  once: sinon.stub(),
  disconnect: sinon.stub(),
};
mongoose.connect = sinon.stub().returns(mockConnection);

describe('GameRound Model', () => {
  let gameRound;
  beforeEach(async () => {
    // Create a new game round before each test
    gameRound = new GameRound({
      roundId: 'testRound1',
      status: 'active',
      startTime: new Date(),
      crashPoint: 100,
      seed: 'testSeed',
      hash: 'testHash',
    });
    await gameRound.save();
  });

  afterEach(async () => {
    // Clean up after each test
    await GameRound.deleteMany({});
  });

  describe('addBet', () => {
    it('should add a valid bet', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await gameRound.addBet(betData);
      expect(gameRound.bets).to.have.lengthOf(1);
      expect(gameRound.totalBets).to.equal(10);
    });

    it('should add multiple bets', async () => {
      const betData1 = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      const betData2 = { playerId: 'player2', username: 'user2', usdAmount: 20, cryptoAmount: 0.02, currency: 'eth', priceAtTime: 2000 };
      await gameRound.addBet(betData1);
      await gameRound.addBet(betData2);
      expect(gameRound.bets).to.have.lengthOf(2);
      expect(gameRound.totalBets).to.equal(30);
    });

    it('should throw an error for negative bet amount', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: -10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await expect(gameRound.addBet(betData)).to.be.rejectedWith(Error, /validation failed/i);
    });

    // Add more tests for addBet as per the test summary
    it('should throw an error for invalid currency', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'usd', priceAtTime: 1000 };
      await expect(gameRound.addBet(betData)).to.be.rejectedWith(mongoose.Error.ValidationError);
    });

    it('should throw an error for missing required fields', async () => {
      const betData = { playerId: 'player1', username: 'user1', cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await expect(gameRound.addBet(betData)).to.be.rejectedWith(mongoose.Error.ValidationError);
    });
  });


  describe('processCashout', () => {
    it('should process a valid cashout', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await gameRound.addBet(betData);
      await gameRound.processCashout('player1', 2);
      expect(gameRound.bets[0].cashoutMultiplier).to.equal(2);
      expect(gameRound.totalCashouts).to.equal(20);
      expect(gameRound.totalWinners).to.equal(1);
    });

    it('should throw an error for non-existent bet', async () => {
      await expect(gameRound.processCashout('player1', 2)).to.be.rejectedWith('No active bet found for player');
    });

    // Add more tests for processCashout as per the test summary
    it('should throw an error for already cashed-out bet', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000, cashoutMultiplier: 1 };
      await gameRound.addBet(betData);
      await expect(gameRound.processCashout('player1', 2)).to.be.rejectedWith('No active bet found for player');
    });

    it('should handle cashout with zero multiplier', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await gameRound.addBet(betData);
      await gameRound.processCashout('player1', 0);
      expect(gameRound.bets[0].cashoutMultiplier).to.equal(0);
      expect(gameRound.totalCashouts).to.equal(0);
      expect(gameRound.totalWinners).to.equal(1);
    });
  });

  describe('finalizeRound', () => {
    it('should finalize a round with bets', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await gameRound.addBet(betData);
      await gameRound.finalizeRound();
      expect(gameRound.status).to.equal('crashed');
      expect(gameRound.totalLosers).to.equal(0);
      expect(gameRound.houseProfit).to.equal(10);
    });

    it('should finalize a round with no bets', async () => {
      await gameRound.finalizeRound();
      expect(gameRound.status).to.equal('crashed');
      expect(gameRound.totalLosers).to.equal(0);
      expect(gameRound.houseProfit).to.equal(0);
    });

    // Add more tests for finalizeRound as per the test summary

  });

  describe('getStatistics', () => {
    it('should retrieve statistics for a completed round', async () => {
      await gameRound.finalizeRound();
      const stats = gameRound.getStatistics();
      expect(stats.status).to.equal('crashed');
      expect(stats.totalBets).to.equal(0);
      expect(stats.totalCashouts).to.equal(0);
    });

    // Add more tests for getStatistics as per the test summary
    it('should retrieve statistics for an active round', async () => {
      const stats = gameRound.getStatistics();
      expect(stats.status).to.equal('active');
      expect(stats.totalBets).to.equal(0);
      expect(stats.totalCashouts).to.equal(0);
    });

    it('should retrieve statistics for a round with no bets', async () => {
      const stats = gameRound.getStatistics();
      expect(stats.totalBets).to.equal(0);
      expect(stats.totalCashouts).to.equal(0);
      expect(stats.totalWinners).to.equal(0);
      expect(stats.totalLosers).to.equal(0);
      expect(stats.houseProfit).to.equal(0);
    });
  });


  describe('Integration Tests', () => {
    it('should test the entire flow: addBet -> processCashout -> finalizeRound', async () => {
      const betData = { playerId: 'player1', username: 'user1', usdAmount: 10, cryptoAmount: 0.01, currency: 'btc', priceAtTime: 1000 };
      await gameRound.addBet(betData);
      await gameRound.processCashout('player1', 2);
      await gameRound.finalizeRound();
      expect(gameRound.status).to.equal('crashed');
      expect(gameRound.totalCashouts).to.equal(20);
      expect(gameRound.totalWinners).to.equal(1);
      expect(gameRound.totalLosers).to.equal(0);
      expect(gameRound.houseProfit).to.equal(-10);
    });

    // Add more integration tests as per the test summary (data persistence, concurrency, error handling) - these will require a running MongoDB instance.
  });


  describe('Edge Cases', () => {
    it('should handle extremely large bet amounts', async () => {
      const largeAmount = Number.MAX_SAFE_INTEGER;
      const betData = { playerId: 'player1', username: 'user1', usdAmount: largeAmount, cryptoAmount: largeAmount, currency: 'btc', priceAtTime: 1000 };
      await gameRound.addBet(betData); // This might fail depending on your database schema limits
      expect(gameRound.totalBets).to.equal(largeAmount);
    });

    // Add more edge case tests as per the test summary (large number of bets, invalid data types, long seed, large crashPoint, race conditions)
  });
});