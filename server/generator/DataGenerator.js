const RandomGenerator = require('../utils/random');
const DICTIONARIES = require('../data/dictionaries');

class DataGenerator {
  constructor(seed = null) {
    this.baseSeed = seed;
    this.random = new RandomGenerator(seed);
  }

  setSeed(seed) {
    this.baseSeed = seed;
    this.random.setSeed(seed);
  }

  getSeed() {
    return this.baseSeed;
  }

  generate(model, count = 10, options = {}) {
    if (!model || !model.fields) {
      throw new Error('无效的数据模型');
    }

    if (options.seed !== undefined) {
      this.setSeed(options.seed);
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.generateOne(model, i));
    }

    return results;
  }

  generateOne(model, rowIndex = 0) {
    const rowRng = RandomGenerator.createRowGenerator(this.baseSeed, rowIndex);
    const result = {};

    model.fields.forEach(field => {
      if (field.nullable && rowRng.random() < field.nullProbability) {
        result[field.name] = null;
      } else {
        result[field.name] = this.generateField(field, rowRng);
      }
    });

    return result;
  }

  generateField(field, rng) {
    switch (field.type) {
      case 'string':
        return this.generateString(field.rule, rng);
      case 'number':
        return this.generateNumber(field.rule, rng);
      case 'boolean':
        return this.generateBoolean(field.rule, rng);
      case 'date':
        return this.generateDate(field.rule, rng);
      case 'enum':
        return this.generateEnum(field.rule, rng);
      default:
        return null;
    }
  }

  generateWithSkipLimit(model, skip, limit, options = {}) {
    if (!model || !model.fields) {
      throw new Error('无效的数据模型');
    }

    if (options.seed !== undefined) {
      this.setSeed(options.seed);
    }

    const total = options.total || skip + limit;
    const results = [];

    for (let i = skip; i < skip + limit && i < total; i++) {
      results.push(this.generateOne(model, i));
    }

    return {
      data: results,
      total: total,
      skip: skip,
      limit: limit,
      seed: this.baseSeed
    };
  }

  generateWithPagination(model, page = 1, pageSize = 20, options = {}) {
    const skip = (page - 1) * pageSize;
    const total = options.total || page * pageSize;

    return this.generateWithSkipLimit(model, skip, pageSize, {
      ...options,
      total: total
    });
  }

  generateString(rule, rng) {
    if (rule.options && rule.options.length > 0) {
      return rule.prefix + rng.randomChoice(rule.options) + rule.suffix;
    }

    if (rule.pattern) {
      return rule.prefix + this.generateFromPattern(rule.pattern, rng) + rule.suffix;
    }

    if (rule.format) {
      return rule.prefix + this.generateFormat(rule.format, rng) + rule.suffix;
    }

    return rule.prefix + this.generateRandomString(rule.minLength, rule.maxLength, rng) + rule.suffix;
  }

  generateFormat(format, rng) {
    switch (format) {
      case 'chineseName':
        return this.generateChineseName(rng);
      case 'englishName':
        return this.generateEnglishName(rng);
      case 'email':
        return this.generateEmail(rng);
      case 'phone':
        return this.generatePhone(rng);
      case 'idCard':
        return this.generateIdCard(rng);
      case 'address':
        return this.generateAddress(rng);
      case 'company':
        return this.generateCompany(rng);
      case 'title':
        return this.generateTitle(rng);
      case 'sentence':
        return this.generateSentence(rng);
      case 'paragraph':
        return this.generateParagraph(rng);
      case 'url':
        return this.generateUrl(rng);
      case 'ip':
        return this.generateIp(rng);
      case 'uuid':
        return this.generateUuid(rng);
      default:
        return this.generateRandomString(5, 15, rng);
    }
  }

  generateChineseName(rng) {
    return rng.randomChoice(DICTIONARIES.surnames) + rng.randomChoice(DICTIONARIES.names);
  }

  generateEnglishName(rng) {
    return rng.randomChoice(DICTIONARIES.englishFirst) + ' ' + rng.randomChoice(DICTIONARIES.englishLast);
  }

  generateEmail(rng) {
    const username = rng.randomChoice(DICTIONARIES.englishFirst).toLowerCase() + rng.randomInt(100, 9999);
    return username + '@' + rng.randomChoice(DICTIONARIES.emailDomains);
  }

  generatePhone(rng) {
    const prefix = rng.randomChoice(DICTIONARIES.phonePrefixes);
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += rng.randomInt(0, 9);
    }
    return prefix + suffix;
  }

  generateIdCard(rng) {
    const areaCode = rng.randomChoice(DICTIONARIES.areaCodes);

    const year = rng.randomInt(1950, 2005);
    const month = String(rng.randomInt(1, 12)).padStart(2, '0');
    const day = String(rng.randomInt(1, 28)).padStart(2, '0');
    const birthday = `${year}${month}${day}`;

    let sequence = '';
    for (let i = 0; i < 3; i++) {
      sequence += rng.randomInt(0, 9);
    }

    const id17 = areaCode + birthday + sequence;

    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(id17[i]) * weights[i];
    }
    const checkCode = checkCodes[sum % 11];

    return id17 + checkCode;
  }

  generateAddress(rng) {
    return rng.randomChoice(DICTIONARIES.provinces) +
           rng.randomChoice(DICTIONARIES.cities) +
           rng.randomChoice(DICTIONARIES.districts) +
           rng.randomChoice(DICTIONARIES.streets) +
           rng.randomInt(1, 999) + '号';
  }

  generateCompany(rng) {
    const prefix = rng.randomChoice(DICTIONARIES.englishFirst);
    return prefix + rng.randomChoice(DICTIONARIES.companies) + rng.randomChoice(DICTIONARIES.companySuffix);
  }

  generateTitle(rng) {
    return rng.randomChoice(DICTIONARIES.titles);
  }

  generateSentence(rng) {
    return rng.randomChoice(DICTIONARIES.sentenceStart) +
           rng.randomChoice(DICTIONARIES.sentenceMiddle) +
           rng.randomChoice(DICTIONARIES.sentenceEnd) + '。';
  }

  generateParagraph(rng) {
    const sentenceCount = rng.randomInt(3, 8);
    let paragraph = '';
    for (let i = 0; i < sentenceCount; i++) {
      paragraph += this.generateSentence(rng);
    }
    return paragraph;
  }

  generateUrl(rng) {
    const protocol = rng.random() > 0.5 ? 'https://' : 'http://';
    const www = rng.random() > 0.5 ? 'www.' : '';
    const domain = rng.randomChoice(DICTIONARIES.urlDomains);
    const path = rng.randomChoice(DICTIONARIES.urlPaths);
    return protocol + www + domain + path;
  }

  generateIp(rng) {
    return `${rng.randomInt(1, 255)}.${rng.randomInt(0, 255)}.${rng.randomInt(0, 255)}.${rng.randomInt(1, 254)}`;
  }

  generateUuid(rng) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = rng.randomInt(0, 15);
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateFromPattern(pattern, rng) {
    let result = '';
    let i = 0;
    while (i < pattern.length) {
      const char = pattern[i];

      if (char === '\\' && i + 1 < pattern.length) {
        result += pattern[i + 1];
        i += 2;
        continue;
      }

      if (char === '[') {
        const endIndex = pattern.indexOf(']', i);
        if (endIndex !== -1) {
          const charClass = pattern.substring(i + 1, endIndex);
          result += this.generateFromCharClass(charClass, rng);
          i = endIndex + 1;
          continue;
        }
      }

      if (char === '{') {
        const endIndex = pattern.indexOf('}', i);
        if (endIndex !== -1) {
          const quantifier = pattern.substring(i + 1, endIndex);
          const prevChar = result[result.length - 1] || 'x';
          result = result.slice(0, -1);

          const range = quantifier.split(',');
          const min = parseInt(range[0]) || 1;
          const max = parseInt(range[1]) || min;
          const count = rng.randomInt(min, max);

          for (let j = 0; j < count; j++) {
            result += prevChar;
          }
          i = endIndex + 1;
          continue;
        }
      }

      if (char === 'd') {
        result += rng.randomInt(0, 9);
      } else if (char === 'w') {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        result += chars[rng.randomInt(0, chars.length - 1)];
      } else if (char === 'W') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        result += chars[rng.randomInt(0, chars.length - 1)];
      } else if (char === 'c') {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        result += chars[rng.randomInt(0, chars.length - 1)];
      } else if (char === 'C') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        result += chars[rng.randomInt(0, chars.length - 1)];
      } else if (char === 's') {
        result += ' ';
      } else if (char === 'x') {
        const chars = '0123456789abcdef';
        result += chars[rng.randomInt(0, chars.length - 1)];
      } else if (char === 'X') {
        const chars = '0123456789ABCDEF';
        result += chars[rng.randomInt(0, chars.length - 1)];
      } else {
        result += char;
      }

      i++;
    }

    return result;
  }

  generateFromCharClass(charClass, rng) {
    let chars = '';

    let i = 0;
    while (i < charClass.length) {
      if (charClass[i] === '-' && i > 0 && i < charClass.length - 1) {
        const start = charClass[i - 1];
        const end = charClass[i + 1];
        for (let c = start.charCodeAt(0); c <= end.charCodeAt(0); c++) {
          chars += String.fromCharCode(c);
        }
        i += 3;
      } else {
        chars += charClass[i];
        i++;
      }
    }

    if (chars.length === 0) {
      return 'x';
    }

    return chars[rng.randomInt(0, chars.length - 1)];
  }

  generateRandomString(minLength, maxLength, rng) {
    const length = rng.randomInt(minLength, maxLength);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[rng.randomInt(0, chars.length - 1)];
    }
    return result;
  }

  generateNumber(rule, rng) {
    if (rule.decimal > 0) {
      return rng.randomFloat(rule.min, rule.max, rule.decimal);
    }
    return rng.randomInt(rule.min, rule.max);
  }

  generateBoolean(rule, rng) {
    return rng.random() < rule.probability;
  }

  generateDate(rule, rng) {
    const minDate = new Date(rule.min).getTime();
    const maxDate = new Date(rule.max).getTime();
    const randomTime = rng.randomInt(minDate, maxDate);
    return this.formatDate(new Date(randomTime), rule.format);
  }

  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace(/YYYY/g, year)
      .replace(/MM/g, month)
      .replace(/DD/g, day)
      .replace(/HH/g, hours)
      .replace(/mm/g, minutes)
      .replace(/ss/g, seconds);
  }

  generateEnum(rule, rng) {
    return rng.randomWeightedChoice(rule.options, rule.weights);
  }
}

module.exports = DataGenerator;
