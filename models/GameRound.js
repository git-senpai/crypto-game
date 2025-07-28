const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  usdAmount: {
    type: Number,
    required: true,
    min: 0
  },
  cryptoAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['btc', 'eth'],
    required: true
  },
  priceAtTime: {
    type: Number,
    required: true
  },
  cashoutMultiplier: {
    type: Number,
    default: null
  },
  cashoutCryptoAmount: {
    type: Number,
    default: null
  },
  cashoutUsdAmount: {
    type: Number,
    default: null
  },
  isWinner: {
    type: Boolean,
    default: false
  },
  betTime: {
    type: Date,
    default: Date.now
  },
  cashoutTime: {
    type: Date,
    default: null
  }
});

const gameRoundSchema = new mongoose.Schema({
  roundId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'crashed', 'completed'],
    default: 'waiting'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  crashPoint: {
    type: Number,
    required: true
  },
  seed: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  maxMultiplier: {
    type: Number,
    default: 0
  },
  bets: [betSchema],
  totalBets: {
    type: Number,
    default: 0
  },
  totalCashouts: {
    type: Number,
    default: 0
  },
  totalWinners: {
    type: Number,
    default: 0
  },
  totalLosers: {
    type: Number,
    default: 0
  },
  houseProfit: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
gameRoundSchema.index({ roundId: 1 });
gameRoundSchema.index({ status: 1 });
gameRoundSchema.index({ startTime: -1 });
gameRoundSchema.index({ 'bets.playerId': 1 });

// Method to add a bet
gameRoundSchema.methods.addBet = async function(betData) {
  // Use updateOne for atomic update
  await this.constructor.updateOne(
    { _id: this._id },
    {
      $push: { bets: betData },
      $inc: { totalBets: betData.usdAmount }
    }
  );
  // Also update the in-memory object for immediate use
  this.bets.push(betData);
  this.totalBets += betData.usdAmount;
};

// Method to process cashout
gameRoundSchema.methods.processCashout = async function(playerId, multiplier) {
  const bet = this.bets.find(b => b.playerId === playerId && !b.cashoutMultiplier);
  if (!bet) {
    throw new Error('No active bet found for player');
  }

  // Prepare update
  const cashoutCryptoAmount = bet.cryptoAmount * multiplier;
  const cashoutUsdAmount = cashoutCryptoAmount * bet.priceAtTime;
  const now = new Date();

  await this.constructor.updateOne(
    { _id: this._id, 'bets.playerId': playerId, 'bets.cashoutMultiplier': null },
    {
      $set: {
        'bets.$.cashoutMultiplier': multiplier,
        'bets.$.cashoutCryptoAmount': cashoutCryptoAmount,
        'bets.$.cashoutUsdAmount': cashoutUsdAmount,
        'bets.$.isWinner': true,
        'bets.$.cashoutTime': now
      },
      $inc: {
        totalCashouts: cashoutUsdAmount,
        totalWinners: 1
      }
    }
  );

  // Update in-memory for immediate use
  bet.cashoutMultiplier = multiplier;
  bet.cashoutCryptoAmount = cashoutCryptoAmount;
  bet.cashoutUsdAmount = cashoutUsdAmount;
  bet.isWinner = true;
  bet.cashoutTime = now;
  this.totalCashouts += cashoutUsdAmount;
  this.totalWinners += 1;
};

// Method to finalize round
gameRoundSchema.methods.finalizeRound = async function() {
  this.status = 'crashed';
  this.endTime = new Date();
  // Calculate losers
  const activeBets = this.bets.filter(b => !b.cashoutMultiplier);
  const totalLosers = activeBets.length;
  // Calculate house profit
  const houseProfit = this.totalBets - this.totalCashouts;
  await this.constructor.updateOne(
    { _id: this._id },
    {
      $set: {
        status: 'crashed',
        endTime: this.endTime,
        totalLosers: totalLosers,
        houseProfit: houseProfit
      }
    }
  );
  this.totalLosers = totalLosers;
  this.houseProfit = houseProfit;
};

// Method to get round statistics
gameRoundSchema.methods.getStatistics = function() {
  return {
    roundId: this.roundId,
    status: this.status,
    crashPoint: this.crashPoint,
    totalBets: this.totalBets,
    totalCashouts: this.totalCashouts,
    totalWinners: this.totalWinners,
    totalLosers: this.totalLosers,
    houseProfit: this.houseProfit,
    duration: this.endTime ? this.endTime - this.startTime : null
  };
};

module.exports = mongoose.model('GameRound', gameRoundSchema); 