module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  limits: {
    maxGenerateCount: 10000,
    maxPageSize: 1000,
    maxFields: 100,
    maxStringLength: 10000
  }
};
