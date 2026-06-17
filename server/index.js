const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', apiRoutes);

app.get('/api', (req, res) => {
  res.json({
    name: 'Mock Data Generator API',
    version: '1.0.0',
    endpoints: {
      'POST /api/parse': '解析数据模型',
      'POST /api/generate': '生成数据',
      'POST /api/generate/page': '分页生成数据',
      'POST /api/export/json': '导出JSON',
      'POST /api/export/csv': '导出CSV',
      'GET /api/types': '获取支持的类型和格式',
      'GET /api/templates': '获取预设模板'
    }
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });
  } else {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Mock Data Generator Service Started!                  ║
║                                                            ║
║   Frontend: http://localhost:${PORT}                        ║
║   API:      http://localhost:${PORT}/api                     ║
║                                                            ║
║   Press Ctrl+C to stop the server                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
