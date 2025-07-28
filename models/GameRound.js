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
gameRoundSchema.methods.addBet = function(betData) {
  this.bets.push(betData);
  this.totalBets += betData.usdAmount;
  return this.save();
};

// Method to process cashout
gameRoundSchema.methods.processCashout = function(playerId, multiplier) {
  const bet = this.bets.find(b => b.playerId === playerId && !b.cashoutMultiplier);
  if (!bet) {
    throw new Error('No active bet found for player');
  }

  bet.cashoutMultiplier = multiplier;
  bet.cashoutCryptoAmount = bet.cryptoAmount * multiplier;
  bet.cashoutUsdAmount = bet.cashoutCryptoAmount * bet.priceAtTime;
  bet.isWinner = true;
  bet.cashoutTime = new Date();

  this.totalCashouts += bet.cashoutUsdAmount;
  this.totalWinners += 1;

  return this.save();
};

// Method to finalize round
gameRoundSchema.methods.finalizeRound = function() {
  this.status = 'crashed';
  this.endTime = new Date();
  
  // Calculate losers
  const activeBets = this.bets.filter(b => !b.cashoutMultiplier);
  this.totalLosers = activeBets.length;
  
  // Calculate house profit
  this.houseProfit = this.totalBets - this.totalCashouts;
  
  return this.save();
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