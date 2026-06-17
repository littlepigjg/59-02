class DataConverter {
  static toJSON(data, pretty = true) {
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  static toCSV(data, fields, includeBOM = true) {
    if (!Array.isArray(data) || data.length === 0) {
      return includeBOM ? '\uFEFF' : '';
    }

    const headers = fields.map(f => f.label || f.name);
    const fieldNames = fields.map(f => f.name);

    let csv = headers.join(',') + '\n';

    data.forEach(row => {
      const values = fieldNames.map(name => {
        let value = row[name];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    return includeBOM ? '\uFEFF' + csv : csv;
  }

  static downloadJSON(res, data, filename = 'data.json') {
    const jsonData = this.toJSON(data);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonData);
  }

  static downloadCSV(res, data, fields, filename = 'data.csv') {
    const csvData = this.toCSV(data, fields);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  }

  static formatValue(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }
}

module.exports = DataConverter;
