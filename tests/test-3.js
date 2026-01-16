// test/unit/schemas.test.js
const Joi = require('joi');
const { expect } = require('chai');
const { betSchema, cashoutSchema } = require('../../routes/game');


describe('Unit Tests: Validation Schemas', () => {
  describe('betSchema', () => {
    it('should validate valid input data', () => {
      const validData = {
        playerId: 'player123',
        username: 'testuser',
        usdAmount: 10,
        currency: 'btc'
      };
      const { error } = betSchema.validate(validData);
      expect(error).to.be.null;
    });

    it('should not validate missing required fields', () => {
      const invalidData = {
        playerId: 'player123',
        username: 'testuser',
        currency: 'btc'
      };
      const { error } = betSchema.validate(invalidData);
      expect(error).to.not.be.null;
      expect(error.details[0].message).to.include('required');
    });

    it('should not validate invalid data types', () => {
      const invalidData = {
        playerId: 123,
        username: 'testuser',
        usdAmount: 'ten',
        currency: 'btc'
      };
      const { error } = betSchema.validate(invalidData);
      expect(error).to.not.be.null;
      expect(error.details[0].message).to.include('type');
    });

    it('should not validate invalid currency values', () => {
      const invalidData = {
        playerId: 'player123',
        username: 'testuser',
        usdAmount: 10,
        currency: 'usd'
      };
      const { error } = betSchema.validate(invalidData);
      expect(error).to.not.be.null;
      expect(error.details[0].message).to.include('valid');
    });

    it('should not validate negative usdAmount', () => {
      const invalidData = {
        playerId: 'player123',
        username: 'testuser',
        usdAmount: -10,
        currency: 'btc'
      };
      const { error } = betSchema.validate(invalidData);
      expect(error).to.not.be.null;
      expect(error.details[0].message).to.include('positive');
    });

    it('should not validate zero usdAmount', () => {
      const invalidData = {
        playerId: 'player123',
        username: 'testuser',
        usdAmount: 0,
        currency: 'btc'
      };
      const { error } = betSchema.validate(invalidData);
      expect(error).to.not.be.null;
      expect(error.details[0].message).to.include('positive');
    });
  });

  describe('cashoutSchema', () => {
    it('should validate valid input data', () => {
      const validData = {
        playerId: 'player123',
        username: 'testuser'
      };
      const { error } = cashoutSchema.validate(validData);
      expect(error).to.be.null;
    });

    it('should not validate missing required fields', () => {
      const invalidData = {
        playerId: 'player123'
      };
      const { error } = cashoutSchema.validate(invalidData);
      expect(error).to.not.be.null;
      expect(error.details[0].message).to.include('required');
    });
  });
});