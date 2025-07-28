const axios = require('axios');
const logger = require('../utils/logger');

class CryptoApiService {
  constructor() {
    this.baseUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheTimeout = 10000; // 10 seconds
    this.lastFetch = 0;
    this.prices = {
      btc: 0,
      eth: 0
    };
  }

  /**
   * Fetch current cryptocurrency prices
   * @returns {Promise<Object>} - Current prices for BTC and ETH
   */
  async fetchPrices() {
    try {
      const now = Date.now();
      
      // Check if we have recent cached data
      if (now - this.lastFetch < this.cacheTimeout && this.prices.btc > 0) {
        logger.debug('Using cached crypto prices');
        return this.prices;
      }

      logger.info('Fetching fresh crypto prices from CoinGecko');
      
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: 'bitcoin,ethereum',
          vs_currencies: 'usd',
          include_24hr_change: false
        },
        timeout: 5000
      });

      if (response.data && response.data.bitcoin && response.data.ethereum) {
        this.prices = {
          btc: response.data.bitcoin.usd,
          eth: response.data.ethereum.usd
        };
        
        this.lastFetch = now;
        
        logger.info('Crypto prices updated:', this.prices);
        return this.prices;
      } else {
        throw new Error('Invalid response format from CoinGecko API');
      }
    } catch (error) {
      logger.error('Error fetching crypto prices:', error.message);
      
      // Return cached prices if available, otherwise use fallback prices
      if (this.prices.btc > 0) {
        logger.warn('Using cached prices due to API error');
        return this.prices;
      } else {
        logger.warn('Using fallback prices due to API error');
        return {
          btc: 60000, // Fallback BTC price
          eth: 3000   // Fallback ETH price
        };
      }
    }
  }

  /**
   * Get price for a specific cryptocurrency
   * @param {string} currency - Currency symbol (btc, eth)
   * @returns {Promise<number>} - Price in USD
   */
  async getPrice(currency) {
    const prices = await this.fetchPrices();
    return prices[currency.toLowerCase()] || 0;
  }

  /**
   * Get all supported cryptocurrency prices
   * @returns {Promise<Object>} - All prices
   */
  async getAllPrices() {
    return await this.fetchPrices();
  }

  /**
   * Convert USD to cryptocurrency
   * @param {number} usdAmount - Amount in USD
   * @param {string} currency - Target currency (btc, eth)
   * @returns {Promise<number>} - Amount in cryptocurrency
   */
  async usdToCrypto(usdAmount, currency) {
    const price = await this.getPrice(currency);
    if (price <= 0) {
      throw new Error(`Invalid price for ${currency}`);
    }
    
    const cryptoAmount = usdAmount / price;
    return parseFloat(cryptoAmount.toFixed(8));
  }

  /**
   * Convert cryptocurrency to USD
   * @param {number} cryptoAmount - Amount in cryptocurrency
   * @param {string} currency - Source currency (btc, eth)
   * @returns {Promise<number>} - Amount in USD
   */
  async cryptoToUsd(cryptoAmount, currency) {
    const price = await this.getPrice(currency);
    if (price <= 0) {
      throw new Error(`Invalid price for ${currency}`);
    }
    
    const usdAmount = cryptoAmount * price;
    return parseFloat(usdAmount.toFixed(2));
  }

  /**
   * Get price history for a cryptocurrency (simplified)
   * @param {string} currency - Currency symbol
   * @param {number} days - Number of days
   * @returns {Promise<Array>} - Price history
   */
  async getPriceHistory(currency, days = 7) {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/${currency}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days
        },
        timeout: 10000
      });

      if (response.data && response.data.prices) {
        return response.data.prices.map(([timestamp, price]) => ({
          timestamp,
          price
        }));
      }
      
      return [];
    } catch (error) {
      logger.error(`Error fetching price history for ${currency}:`, error.message);
      return [];
    }
  }

  /**
   * Get market statistics
   * @returns {Promise<Object>} - Market statistics
   */
  async getMarketStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/global`, {
        timeout: 5000
      });

      if (response.data && response.data.data) {
        return {
          totalMarketCap: response.data.data.total_market_cap.usd,
          totalVolume: response.data.data.total_volume.usd,
          marketCapChange: response.data.data.market_cap_change_percentage_24h_usd
        };
      }
      
      return {};
    } catch (error) {
      logger.error('Error fetching market stats:', error.message);
      return {};
    }
  }

  /**
   * Validate if a currency is supported
   * @param {string} currency - Currency to validate
   * @returns {boolean} - True if supported
   */
  isSupportedCurrency(currency) {
    const supported = ['btc', 'eth', 'bitcoin', 'ethereum'];
    return supported.includes(currency.toLowerCase());
  }

  /**
   * Get service status
   * @returns {Promise<Object>} - Service status
   */
  async getStatus() {
    try {
      const prices = await this.fetchPrices();
      return {
        status: 'healthy',
        lastUpdate: this.lastFetch,
        prices: prices,
        cacheAge: Date.now() - this.lastFetch
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastUpdate: this.lastFetch
      };
    }
  }
}

module.exports = CryptoApiService; 