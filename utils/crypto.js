const crypto = require('crypto');
const logger = require('./logger');

class CryptoUtils {
  /**
   * Generate a provably fair crash point
   * @param {string} seed - The seed for the round
   * @param {string} roundId - The round ID
   * @returns {Object} - Contains crash point, seed, and hash
   */
  static generateCrashPoint(seed, roundId) {
    try {
      // Create a hash from seed + roundId
      const hashInput = `${seed}-${roundId}`;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
      
      // Use the first 8 bytes of the hash to generate a number
      const hashBytes = Buffer.from(hash.substring(0, 16), 'hex');
      const randomValue = hashBytes.readUInt32BE(0) / Math.pow(2, 32);
      
      // Convert to crash point using house edge
      const houseEdge = 0.01; // 1% house edge
      const crashPoint = Math.max(1, (1 / (1 - randomValue)) * (1 - houseEdge));
      
      // Cap the maximum crash point
      const maxCrash = parseFloat(process.env.MAX_CRASH_MULTIPLIER) || 100;
      const finalCrashPoint = Math.min(crashPoint, maxCrash);
      
      return {
        crashPoint: finalCrashPoint,
        seed: seed,
        hash: hash,
        randomValue: randomValue
      };
    } catch (error) {
      logger.error('Error generating crash point:', error);
      throw new Error('Failed to generate crash point');
    }
  }

  /**
   * Verify a crash point
   * @param {number} crashPoint - The crash point to verify
   * @param {string} seed - The seed used
   * @param {string} roundId - The round ID
   * @returns {boolean} - True if the crash point is valid
   */
  static verifyCrashPoint(crashPoint, seed, roundId) {
    try {
      const generated = this.generateCrashPoint(seed, roundId);
      return Math.abs(generated.crashPoint - crashPoint) < 0.001;
    } catch (error) {
      logger.error('Error verifying crash point:', error);
      return false;
    }
  }

  /**
   * Convert USD to cryptocurrency
   * @param {number} usdAmount - Amount in USD
   * @param {string} currency - Target currency (btc, eth)
   * @param {number} pricePerCrypto - Price of crypto in USD
   * @returns {number} - Amount in cryptocurrency
   */
  static usdToCrypto(usdAmount, currency, pricePerCrypto) {
    if (usdAmount <= 0 || pricePerCrypto <= 0) {
      throw new Error('Invalid amount or price');
    }
    
    const cryptoAmount = usdAmount / pricePerCrypto;
    return parseFloat(cryptoAmount.toFixed(8)); // 8 decimal places for crypto
  }

  /**
   * Convert cryptocurrency to USD
   * @param {number} cryptoAmount - Amount in cryptocurrency
   * @param {string} currency - Source currency (btc, eth)
   * @param {number} pricePerCrypto - Price of crypto in USD
   * @returns {number} - Amount in USD
   */
  static cryptoToUsd(cryptoAmount, currency, pricePerCrypto) {
    if (cryptoAmount <= 0 || pricePerCrypto <= 0) {
      throw new Error('Invalid amount or price');
    }
    
    const usdAmount = cryptoAmount * pricePerCrypto;
    return parseFloat(usdAmount.toFixed(2)); // 2 decimal places for USD
  }

  /**
   * Calculate multiplier at a given time
   * @param {number} elapsedTime - Time elapsed in milliseconds
   * @param {number} growthFactor - Growth factor for the multiplier
   * @returns {number} - Current multiplier
   */
  static calculateMultiplier(elapsedTime, growthFactor = 0.01) {
    const timeInSeconds = elapsedTime / 1000;
    const multiplier = 1 + (timeInSeconds * growthFactor);
    return parseFloat(multiplier.toFixed(4));
  }

  /**
   * Generate a random seed
   * @returns {string} - Random seed
   */
  static generateSeed() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a round ID
   * @returns {string} - Round ID
   */
  static generateRoundId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}`;
  }

  /**
   * Calculate house edge percentage
   * @param {number} totalBets - Total bets in USD
   * @param {number} totalPayouts - Total payouts in USD
   * @returns {number} - House edge percentage
   */
  static calculateHouseEdge(totalBets, totalPayouts) {
    if (totalBets === 0) return 0;
    return ((totalBets - totalPayouts) / totalBets) * 100;
  }

  /**
   * Validate cryptocurrency symbol
   * @param {string} currency - Currency to validate
   * @returns {boolean} - True if valid
   */
  static isValidCurrency(currency) {
    const validCurrencies = ['btc', 'eth'];
    return validCurrencies.includes(currency.toLowerCase());
  }

  /**
   * Format cryptocurrency amount for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency type
   * @returns {string} - Formatted amount
   */
  static formatCryptoAmount(amount, currency) {
    if (currency === 'btc') {
      return amount.toFixed(8);
    } else if (currency === 'eth') {
      return amount.toFixed(6);
    }
    return amount.toFixed(2);
  }

  /**
   * Format USD amount for display
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted USD amount
   */
  static formatUsdAmount(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}

module.exports = CryptoUtils; 