const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playerId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  transactionType: {
    type: String,
    enum: ['bet', 'cashout', 'deposit', 'withdrawal'],
    required: true
  },
  roundId: {
    type: String,
    default: null,
    index: true
  },
  currency: {
    type: String,
    enum: ['btc', 'eth', 'usd'],
    required: true
  },
  usdAmount: {
    type: Number,
    required: true
  },
  cryptoAmount: {
    type: Number,
    required: true
  },
  priceAtTime: {
    type: Number,
    required: true
  },
  multiplier: {
    type: Number,
    default: null
  },
  transactionHash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  balanceBefore: {
    usd: Number,
    btc: Number,
    eth: Number
  },
  balanceAfter: {
    usd: Number,
    btc: Number,
    eth: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ playerId: 1, timestamp: -1 });
transactionSchema.index({ roundId: 1, timestamp: -1 });
transactionSchema.index({ transactionType: 1, timestamp: -1 });
transactionSchema.index({ currency: 1, timestamp: -1 });

// Method to get transaction summary
transactionSchema.methods.getSummary = function() {
  return {
    transactionId: this.transactionId,
    playerId: this.playerId,
    username: this.username,
    type: this.transactionType,
    roundId: this.roundId,
    currency: this.currency,
    usdAmount: this.usdAmount,
    cryptoAmount: this.cryptoAmount,
    multiplier: this.multiplier,
    status: this.status,
    timestamp: this.timestamp
  };
};

// Static method to generate transaction hash
transactionSchema.statics.generateTransactionHash = function(data) {
  const crypto = require('crypto');
  const hashData = `${data.playerId}-${data.transactionType}-${data.usdAmount}-${data.cryptoAmount}-${Date.now()}`;
  return crypto.createHash('sha256').update(hashData).digest('hex');
};

// Static method to generate transaction ID
transactionSchema.statics.generateTransactionId = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
};

module.exports = mongoose.model('Transaction', transactionSchema); 