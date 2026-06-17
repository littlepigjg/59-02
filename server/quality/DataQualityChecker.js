class DataQualityChecker {
  constructor() {
    this.validators = {
      string: this.validateString.bind(this),
      number: this.validateNumber.bind(this),
      boolean: this.validateBoolean.bind(this),
      date: this.validateDate.bind(this),
      enum: this.validateEnum.bind(this),
      reference: this.validateReference.bind(this)
    };

    this.formatValidators = {
      phone: this.validatePhoneFormat.bind(this),
      email: this.validateEmailFormat.bind(this),
      idCard: this.validateIdCardFormat.bind(this),
      url: this.validateUrlFormat.bind(this),
      ip: this.validateIpFormat.bind(this),
      uuid: this.validateUuidFormat.bind(this)
    };
  }

  check(data, model, options = {}) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('待检查数据不能为空');
    }

    if (!model || !Array.isArray(model.fields)) {
      throw new Error('无效的数据模型');
    }

    const sampleSize = options.sampleSize || 5;
    const startTime = Date.now();

    const fieldStats = {};
    model.fields.forEach(field => {
      fieldStats[field.name] = {
        field: field,
        total: 0,
        passed: 0,
        failed: 0,
        nullCount: 0,
        errors: [],
        samples: []
      };
    });

    let totalRecords = data.length;
    let passedRecords = 0;

    data.forEach((row, rowIndex) => {
      let rowPassed = true;

      model.fields.forEach(field => {
        const value = row[field.name];
        const stat = fieldStats[field.name];
        stat.total++;

        if (value === null || value === undefined) {
          stat.nullCount++;
          if (!field.nullable) {
            stat.failed++;
            rowPassed = false;
            const error = {
              rowIndex,
              field: field.name,
              value,
              error: '字段不能为空',
              rule: 'nullable'
            };
            stat.errors.push(error);
            if (stat.samples.length < sampleSize) {
              stat.samples.push({ row: rowIndex, value, error: error.error });
            }
          } else {
            stat.passed++;
          }
          return;
        }

        const validator = this.validators[field.type];
        if (validator) {
          const result = validator(value, field);
          if (result.passed) {
            stat.passed++;
          } else {
            stat.failed++;
            rowPassed = false;
            const error = {
              rowIndex,
              field: field.name,
              value,
              error: result.error,
              rule: result.rule
            };
            stat.errors.push(error);
            if (stat.samples.length < sampleSize) {
              stat.samples.push({ row: rowIndex, value, error: result.error });
            }
          }
        } else {
          stat.passed++;
        }
      });

      if (rowPassed) {
        passedRecords++;
      }
    });

    const fieldResults = [];
    model.fields.forEach(field => {
      const stat = fieldStats[field.name];
      fieldResults.push({
        field: field.name,
        label: field.label || field.name,
        type: field.type,
        total: stat.total,
        passed: stat.passed,
        failed: stat.failed,
        nullCount: stat.nullCount,
        passRate: stat.total > 0 ? (stat.passed / stat.total * 100).toFixed(2) : '0.00',
        errors: stat.errors.slice(0, options.maxErrors || 100),
        samples: stat.samples
      });
    });

    const overallPassRate = totalRecords > 0 ? (passedRecords / totalRecords * 100).toFixed(2) : '0.00';
    const failedFields = fieldResults.filter(f => f.failed > 0);

    return {
      summary: {
        totalRecords,
        passedRecords,
        failedRecords: totalRecords - passedRecords,
        totalFields: model.fields.length,
        failedFields: failedFields.length,
        overallPassRate,
        duration: ((Date.now() - startTime) / 1000).toFixed(3),
        qualityLevel: this.getQualityLevel(overallPassRate)
      },
      fields: fieldResults,
      failedFields: failedFields,
      suggestions: this.generateSuggestions(failedFields)
    };
  }

  validateString(value, field) {
    if (typeof value !== 'string') {
      return { passed: false, error: `值类型错误，期望字符串，实际为 ${typeof value}`, rule: 'type' };
    }

    const rule = field.rule || {};

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return { passed: false, error: `长度不足，最小长度为 ${rule.minLength}，实际为 ${value.length}`, rule: 'minLength' };
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return { passed: false, error: `长度超出，最大长度为 ${rule.maxLength}，实际为 ${value.length}`, rule: 'maxLength' };
    }

    if (rule.format && this.formatValidators[rule.format]) {
      const formatResult = this.formatValidators[rule.format](value, field);
      if (!formatResult.passed) {
        return formatResult;
      }
    }

    if (rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern);
        if (!regex.test(value)) {
          return { passed: false, error: `不匹配正则表达式 ${rule.pattern}`, rule: 'pattern' };
        }
      } catch (e) {
        return { passed: false, error: `正则表达式无效: ${e.message}`, rule: 'pattern' };
      }
    }

    if (rule.options && rule.options.length > 0) {
      const strippedValue = value.replace(rule.prefix || '').replace(rule.suffix || '');
      if (!rule.options.includes(strippedValue)) {
        return { passed: false, error: `值不在选项列表中`, rule: 'options' };
      }
    }

    return { passed: true };
  }

  validatePhoneFormat(value) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(value)) {
      return { passed: false, error: '手机号格式不正确，应为11位数字且以1开头', rule: 'format.phone' };
    }
    return { passed: true };
  }

  validateEmailFormat(value) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      return { passed: false, error: '邮箱格式不正确，应包含@符号且域名合法', rule: 'format.email' };
    }

    const parts = value.split('@');
    const domain = parts[1];
    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      return { passed: false, error: '邮箱域名不合法', rule: 'format.email' };
    }

    return { passed: true };
  }

  validateIdCardFormat(value) {
    if (!/^\d{17}[\dXx]$/.test(value)) {
      return { passed: false, error: '身份证号格式不正确，应为18位数字或最后一位为X', rule: 'format.idCard' };
    }

    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(value[i]) * weights[i];
    }
    const expectedCheckCode = checkCodes[sum % 11];
    const actualCheckCode = value[17].toUpperCase();
    if (actualCheckCode !== expectedCheckCode) {
      return { passed: false, error: '身份证号校验位不正确', rule: 'format.idCard' };
    }

    return { passed: true };
  }

  validateUrlFormat(value) {
    try {
      new URL(value);
      return { passed: true };
    } catch (e) {
      return { passed: false, error: 'URL格式不正确', rule: 'format.url' };
    }
  }

  validateIpFormat(value) {
    const ipv4Regex = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    if (!ipv4Regex.test(value)) {
      return { passed: false, error: 'IP地址格式不正确，应为合法的IPv4地址', rule: 'format.ip' };
    }
    return { passed: true };
  }

  validateUuidFormat(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return { passed: false, error: 'UUID格式不正确', rule: 'format.uuid' };
    }
    return { passed: true };
  }

  validateNumber(value, field) {
    if (typeof value !== 'number' || isNaN(value)) {
      return { passed: false, error: `值类型错误，期望数字，实际为 ${typeof value}`, rule: 'type' };
    }

    const rule = field.rule || {};

    if (rule.min !== undefined && value < rule.min) {
      return { passed: false, error: `值小于最小值，最小值为 ${rule.min}，实际为 ${value}`, rule: 'min' };
    }

    if (rule.max !== undefined && value > rule.max) {
      return { passed: false, error: `值大于最大值，最大值为 ${rule.max}，实际为 ${value}`, rule: 'max' };
    }

    if (rule.decimal !== undefined) {
      const str = value.toString();
      const decimalPart = str.split('.')[1];
      const actualDecimal = decimalPart ? decimalPart.length : 0;
      if (actualDecimal > rule.decimal) {
        return { passed: false, error: `小数位数超过限制，最多 ${rule.decimal} 位，实际为 ${actualDecimal} 位`, rule: 'decimal' };
      }
    }

    return { passed: true };
  }

  validateBoolean(value, field) {
    if (typeof value !== 'boolean') {
      return { passed: false, error: `值类型错误，期望布尔值，实际为 ${typeof value}`, rule: 'type' };
    }
    return { passed: true };
  }

  validateDate(value, field) {
    if (typeof value !== 'string') {
      return { passed: false, error: `值类型错误，期望日期字符串，实际为 ${typeof value}`, rule: 'type' };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { passed: false, error: '无效的日期格式', rule: 'format' };
    }

    const rule = field.rule || {};

    if (rule.min) {
      const minDate = new Date(rule.min);
      if (date < minDate) {
        return { passed: false, error: `日期早于最小值，最小值为 ${rule.min}`, rule: 'min' };
      }
    }

    if (rule.max) {
      const maxDate = new Date(rule.max);
      if (date > maxDate) {
        return { passed: false, error: `日期晚于最大值，最大值为 ${rule.max}`, rule: 'max' };
      }
    }

    return { passed: true };
  }

  validateEnum(value, field) {
    const rule = field.rule || {};
    if (!rule.options || !Array.isArray(rule.options)) {
      return { passed: true };
    }

    if (!rule.options.includes(value)) {
      return { passed: false, error: `值不在枚举选项中，可选值为: ${rule.options.join(', ')}`, rule: 'options' };
    }

    return { passed: true };
  }

  validateReference(value, field) {
    return { passed: true };
  }

  getQualityLevel(passRate) {
    const rate = parseFloat(passRate);
    if (rate >= 99) return { level: 'excellent', label: '优秀', color: '#67C23A' };
    if (rate >= 95) return { level: 'good', label: '良好', color: '#E6A23C' };
    if (rate >= 80) return { level: 'fair', label: '一般', color: '#F56C6C' };
    return { level: 'poor', label: '较差', color: '#F56C6C' };
  }

  generateSuggestions(failedFields) {
    const suggestions = [];

    failedFields.forEach(field => {
      const errorTypes = {};
      field.errors.forEach(err => {
        errorTypes[err.rule] = errorTypes[err.rule] || 0;
        errorTypes[err.rule]++;
      });

      for (const [rule, count] of Object.entries(errorTypes)) {
        const suggestion = this.getSuggestionByRule(field, rule, count);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    });

    return suggestions;
  }

  getSuggestionByRule(field, rule, count) {
    const fieldLabel = field.label || field.field;

    const suggestionMap = {
      'nullable': `字段「${fieldLabel}」有 ${count} 条数据为空，但该字段不允许为空。建议检查数据生成逻辑或修改字段的 nullable 属性。`,
      'type': `字段「${fieldLabel}」有 ${count} 条数据类型错误。建议检查生成器的类型配置是否正确。`,
      'minLength': `字段「${fieldLabel}」有 ${count} 条数据长度不足。建议调整 minLength 配置或修改生成逻辑。`,
      'maxLength': `字段「${fieldLabel}」有 ${count} 条数据长度超出。建议调整 maxLength 配置或修改生成逻辑。`,
      'min': `字段「${fieldLabel}」有 ${count} 条数据小于最小值。建议检查数据生成器的 min 配置。`,
      'max': `字段「${fieldLabel}」有 ${count} 条数据大于最大值。建议检查数据生成器的 max 配置。`,
      'format.phone': `字段「${fieldLabel}」有 ${count} 条手机号格式不正确。应为11位数字且以1开头。`,
      'format.email': `字段「${fieldLabel}」有 ${count} 条邮箱格式不正确。应包含@符号且域名合法。`,
      'format.idCard': `字段「${fieldLabel}」有 ${count} 条身份证号格式或校验位不正确。`,
      'format.url': `字段「${fieldLabel}」有 ${count} 条URL格式不正确。`,
      'format.ip': `字段「${fieldLabel}」有 ${count} 条IP地址格式不正确。`,
      'format.uuid': `字段「${fieldLabel}」有 ${count} 条UUID格式不正确。`,
      'pattern': `字段「${fieldLabel}」有 ${count} 条数据不匹配正则表达式。建议检查 pattern 配置。`,
      'options': `字段「${fieldLabel}」有 ${count} 条数据不在选项列表中。建议检查 options 配置。`,
      'decimal': `字段「${fieldLabel}」有 ${count} 条数据小数位数超过限制。建议调整 decimal 配置。`
    };

    return suggestionMap[rule] || null;
  }
}

module.exports = DataQualityChecker;
