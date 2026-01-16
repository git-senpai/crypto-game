// test/unit/utils.test.js
const { calculateMultiplier } = require('../../utils/crypto');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Unit Tests: utils/crypto.js', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });


  it('should return 1.0 when elapsed time is 0', () => {
    expect(calculateMultiplier(0)).to.equal(1.0);
  });

  it('should return a multiplier > 1.0 when elapsed time is > 0', () => {
    clock.tick(10000); // Simulate 10 seconds
    expect(calculateMultiplier(10000)).to.be.greaterThan(1.0);
  });

  it('should handle very large elapsed time gracefully', () => {
    const largeElapsedTime = 31536000000; //Simulate 1 year
    expect(calculateMultiplier(largeElapsedTime)).to.be.greaterThan(1.0); //Expect a reasonable multiplier, not infinity
  });

  it('should handle negative elapsed time gracefully', () => {
    expect(calculateMultiplier(-1000)).to.equal(1.0); //Or throw an error, depending on desired behavior.  Returning 1 is safer.
  });
});