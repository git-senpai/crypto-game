const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  wallet: {
    btc: {
      type: Number,
      default: 0,
      min: 0
    },
    eth: {
      type: Number,
      default: 0,
      min: 0
    },
    usd: {
      type: Number,
      default: 1000, // Starting balance
      min: 0
    }
  },
  totalBets: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  totalLosses: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
playerSchema.index({ playerId: 1 });
playerSchema.index({ username: 1 });
playerSchema.index({ 'wallet.usd': 1 });

// Method to update wallet balance
playerSchema.methods.updateWallet = function(currency, amount) {
  if (currency === 'usd') {
    this.wallet.usd += amount;
  } else if (currency === 'btc') {
    this.wallet.btc += amount;
  } else if (currency === 'eth') {
    this.wallet.eth += amount;
  }
  this.lastActive = new Date();
  return this.save();
};

// Method to get USD equivalent of crypto balance
playerSchema.methods.getUsdEquivalent = function(cryptoPrices) {
  const btcUsd = cryptoPrices.btc || 0;
  const ethUsd = cryptoPrices.eth || 0;
  
  return {
    btc: this.wallet.btc,
    eth: this.wallet.eth,
    usd: this.wallet.usd,
    btcUsd: this.wallet.btc * btcUsd,
    ethUsd: this.wallet.eth * ethUsd,
    totalUsd: this.wallet.usd + (this.wallet.btc * btcUsd) + (this.wallet.eth * ethUsd)
  };
};

module.exports = mongoose.model('Player', playerSchema); 