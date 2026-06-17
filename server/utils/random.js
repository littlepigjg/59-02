const seedrandom = require('seedrandom');

class RandomGenerator {
  constructor(seed = null) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    if (seed !== null && seed !== undefined) {
      this.seed = seed;
      this.rng = seedrandom(seed.toString());
    } else {
      this.seed = Date.now();
      this.rng = seedrandom(this.seed.toString());
    }
  }

  getSeed() {
    return this.seed;
  }

  random() {
    return this.rng();
  }

  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  randomFloat(min, max, decimal = 2) {
    const value = this.random() * (max - min) + min;
    return Number(value.toFixed(decimal));
  }

  randomChoice(array) {
    if (!array || array.length === 0) return null;
    return array[this.randomInt(0, array.length - 1)];
  }

  randomWeightedChoice(options, weights = []) {
    if (!options || options.length === 0) return null;

    if (weights.length === 0) {
      return this.randomChoice(options);
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.random() * totalWeight;

    for (let i = 0; i < options.length; i++) {
      random -= weights[i] || 0;
      if (random <= 0) {
        return options[i];
      }
    }

    return options[options.length - 1];
  }

  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  static createSeededGenerator(seed) {
    return new RandomGenerator(seed);
  }

  static createRowGenerator(baseSeed, rowIndex) {
    const rowSeed = `${baseSeed}-row-${rowIndex}`;
    return new RandomGenerator(rowSeed);
  }
}

module.exports = RandomGenerator;
