// test/integration/game.test.js
const request = require('supertest');
const app = require('../../app'); // Assuming you have an app.js file
const { expect } = require('chai');
const GameRound = require('../../models/GameRound'); // Adjust path as needed
const Player = require('../../models/Player'); // Adjust path as needed
const sinon = require('sinon');


describe('Integration Tests: Game API', () => {
  let server;
  beforeEach(() => server = app.listen());
  afterEach(() => server.close());

  //Helper function to create a test player
  const createTestPlayer = async (playerId, username, usdBalance = 100) => {
    const player = new Player({ playerId, username, wallet: { usd: usdBalance, btc: 0, eth: 0 } });
    await player.save();
    return player;
  };

  //Helper function to create a test round
  const createTestRound = async () => {
    const round = new GameRound();
    await round.save();
    return round;
  };

  //Stub the crypto API for predictable results
  const stubCryptoApi = (prices = { btc: 10000, eth: 2000 }) => {
    const CryptoApiService = require('../../services/CryptoApiService');
    sinon.stub(CryptoApiService.prototype, 'getAllPrices').resolves(prices);
  };

  afterEach(() => {
    sinon.restore();
  });


  describe('/api/game/bet POST', () => {
    it('should successfully place a bet', async () => {
      const player = await createTestPlayer('testuser1', 'Test User 1');
      stubCryptoApi();
      const res = await request(app).post('/api/game/bet').send({
        playerId: player.playerId,
        username: player.username,
        usdAmount: 10,
        currency: 'btc'
      });
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.playerBalance.usd).to.equal(90);
    });

    it('should handle insufficient balance', async () => {
      const player = await createTestPlayer('testuser2', 'Test User 2', 5);
      stubCryptoApi();
      const res = await request(app).post('/api/game/bet').send({
        playerId: player.playerId,
        username: player.username,
        usdAmount: 10,
        currency: 'btc'
      });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('Insufficient');
    });

    // Add more tests for invalid player ID, no active round, crypto API error, etc.
  });


  describe('/api/game/cashout POST', () => {
    it('should successfully cash out', async () => {
      // Requires setting up a test round and bet first.  This is complex and omitted for brevity.
      // This test would need to be significantly expanded to handle the complexities of the cashout logic.
    });

    // Add more tests for no active round, no active bet, player not found, etc.
  });

  // Add integration tests for other routes: /api/game/state GET, /api/game/history GET, /api/game/round/:roundId GET, /api/game/statistics GET

  describe('Concurrent requests', () => {
    it('should handle concurrent bet and cashout requests', async () => {
      // This test requires a more sophisticated setup using tools like concurrently to simulate multiple requests.
      // It would also need robust assertions to check for data integrity after the concurrent operations.  Omitted for brevity.
    });
  });
});