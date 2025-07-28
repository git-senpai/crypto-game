const express = require('express');
const CryptoApiService = require('../services/CryptoApiService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/crypto/prices
 * Get current cryptocurrency prices
 */
router.get('/prices', async (req, res) => {
  try {
    const cryptoApi = new CryptoApiService();
    const prices = await cryptoApi.getAllPrices();

    res.json({
      success: true,
      prices: prices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting crypto prices:', error);
    res.status(500).json({ error: 'Failed to get crypto prices' });
  }
});

/**
 * GET /api/crypto/price/:currency
 * Get price for a specific cryptocurrency
 */
router.get('/price/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const cryptoApi = new CryptoApiService();

    if (!cryptoApi.isSupportedCurrency(currency)) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const price = await cryptoApi.getPrice(currency);

    res.json({
      success: true,
      currency: currency.toLowerCase(),
      price: price,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting ${req.params.currency} price:`, error);
    res.status(500).json({ error: 'Failed to get crypto price' });
  }
});

/**
 * GET /api/crypto/convert
 * Convert between USD and cryptocurrency
 */
router.get('/convert', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.query;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'Amount, fromCurrency, and toCurrency are required' });
    }

    const cryptoApi = new CryptoApiService();
    const { usdToCrypto, cryptoToUsd } = require('../utils/crypto');

    let result;
    if (fromCurrency.toLowerCase() === 'usd' && ['btc', 'eth'].includes(toCurrency.toLowerCase())) {
      const price = await cryptoApi.getPrice(toCurrency);
      const cryptoAmount = usdToCrypto(parseFloat(amount), toCurrency, price);
      result = {
        fromAmount: parseFloat(amount),
        fromCurrency: 'usd',
        toAmount: cryptoAmount,
        toCurrency: toCurrency.toLowerCase(),
        rate: price
      };
    } else if (['btc', 'eth'].includes(fromCurrency.toLowerCase()) && toCurrency.toLowerCase() === 'usd') {
      const price = await cryptoApi.getPrice(fromCurrency);
      const usdAmount = cryptoToUsd(parseFloat(amount), fromCurrency, price);
      result = {
        fromAmount: parseFloat(amount),
        fromCurrency: fromCurrency.toLowerCase(),
        toAmount: usdAmount,
        toCurrency: 'usd',
        rate: price
      };
    } else {
      return res.status(400).json({ error: 'Invalid conversion pair' });
    }

    res.json({
      success: true,
      conversion: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

/**
 * GET /api/crypto/history/:currency
 * Get price history for a cryptocurrency
 */
router.get('/history/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const days = parseInt(req.query.days) || 7;
    const cryptoApi = new CryptoApiService();

    if (!cryptoApi.isSupportedCurrency(currency)) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const history = await cryptoApi.getPriceHistory(currency, days);

    res.json({
      success: true,
      currency: currency.toLowerCase(),
      history: history,
      days: days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting ${req.params.currency} history:`, error);
    res.status(500).json({ error: 'Failed to get price history' });
  }
});

/**
 * GET /api/crypto/market-stats
 * Get market statistics
 */
router.get('/market-stats', async (req, res) => {
  try {
    const cryptoApi = new CryptoApiService();
    const stats = await cryptoApi.getMarketStats();

    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting market stats:', error);
    res.status(500).json({ error: 'Failed to get market statistics' });
  }
});

/**
 * GET /api/crypto/status
 * Get crypto API service status
 */
router.get('/status', async (req, res) => {
  try {
    const cryptoApi = new CryptoApiService();
    const status = await cryptoApi.getStatus();

    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    logger.error('Error getting crypto service status:', error);
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

/**
 * GET /api/crypto/supported
 * Get list of supported cryptocurrencies
 */
router.get('/supported', async (req, res) => {
  try {
    const cryptoApi = new CryptoApiService();
    
    res.json({
      success: true,
      supported: [
        {
          symbol: 'btc',
          name: 'Bitcoin',
          description: 'The first and most well-known cryptocurrency'
        },
        {
          symbol: 'eth',
          name: 'Ethereum',
          description: 'A decentralized platform for smart contracts'
        }
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting supported currencies:', error);
    res.status(500).json({ error: 'Failed to get supported currencies' });
  }
});

module.exports = router; 