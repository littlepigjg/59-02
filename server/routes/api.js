const express = require('express');
const router = express.Router();
const ModelParser = require('../models/ModelParser');
const DataGenerator = require('../generator/DataGenerator');
const DataConverter = require('../utils/converter');

const modelParser = new ModelParser();

router.post('/parse', (req, res) => {
  try {
    const { model } = req.body;
    const parsedModel = modelParser.parse(model);
    res.json({
      success: true,
      data: parsedModel
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/generate', (req, res) => {
  try {
    const { model, count = 10, seed } = req.body;
    const parsedModel = modelParser.parse(model);
    const generator = new DataGenerator(seed);
    const data = generator.generate(parsedModel, count);

    res.json({
      success: true,
      data: {
        total: count,
        seed: generator.getSeed(),
        data: data
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/generate/skip', (req, res) => {
  try {
    const { model, skip = 0, limit = 20, seed, total } = req.body;
    const parsedModel = modelParser.parse(model);
    const generator = new DataGenerator(seed);

    const result = generator.generateWithSkipLimit(parsedModel, skip, limit, {
      total: total || 1000
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/generate/page', (req, res) => {
  try {
    const { model, page = 1, pageSize = 20, seed, total } = req.body;
    const parsedModel = modelParser.parse(model);
    const generator = new DataGenerator(seed);

    const result = generator.generateWithPagination(parsedModel, page, pageSize, {
      total: total || 1000
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/export/json', (req, res) => {
  try {
    const { model, count = 100, seed, data } = req.body;

    let exportData = data;
    let exportModel = model;

    if (!exportData || !Array.isArray(exportData)) {
      const parsedModel = modelParser.parse(model);
      const generator = new DataGenerator(seed);
      exportData = generator.generate(parsedModel, count);
      exportModel = parsedModel;
    }

    const filename = `${exportModel.name || 'data'}.json`;
    DataConverter.downloadJSON(res, exportData, filename);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/export/csv', (req, res) => {
  try {
    const { model, count = 100, seed, data } = req.body;

    let exportData = data;
    let exportModel = model;

    if (!exportData || !Array.isArray(exportData)) {
      const parsedModel = modelParser.parse(model);
      const generator = new DataGenerator(seed);
      exportData = generator.generate(parsedModel, count);
      exportModel = parsedModel;
    }

    const filename = `${exportModel.name || 'data'}.csv`;
    DataConverter.downloadCSV(res, exportData, exportModel.fields, filename);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      types: [
        { value: 'string', label: '字符串', icon: '📝' },
        { value: 'number', label: '数字', icon: '🔢' },
        { value: 'boolean', label: '布尔值', icon: '✅' },
        { value: 'date', label: '日期', icon: '📅' },
        { value: 'enum', label: '枚举', icon: '📋' }
      ],
      formats: [
        { value: 'chineseName', label: '中文名' },
        { value: 'englishName', label: '英文名' },
        { value: 'email', label: '邮箱' },
        { value: 'phone', label: '手机号' },
        { value: 'idCard', label: '身份证号' },
        { value: 'address', label: '地址' },
        { value: 'company', label: '公司名' },
        { value: 'title', label: '职位' },
        { value: 'sentence', label: '句子' },
        { value: 'paragraph', label: '段落' },
        { value: 'url', label: '网址' },
        { value: 'ip', label: 'IP地址' },
        { value: 'uuid', label: 'UUID' },
        { value: 'custom', label: '自定义正则' }
      ]
    }
  });
});

router.get('/templates', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        name: '用户',
        label: '用户信息',
        icon: '👤',
        fields: [
          { name: 'id', type: 'number', label: 'ID', rule: { min: 1, max: 99999 } },
          { name: 'username', type: 'string', label: '用户名', rule: { format: 'englishName', minLength: 4, maxLength: 12 } },
          { name: 'name', type: 'string', label: '姓名', rule: { format: 'chineseName' } },
          { name: 'email', type: 'string', label: '邮箱', rule: { format: 'email' } },
          { name: 'phone', type: 'string', label: '手机号', rule: { format: 'phone' } },
          { name: 'age', type: 'number', label: '年龄', rule: { min: 18, max: 65 } },
          { name: 'gender', type: 'enum', label: '性别', rule: { options: ['男', '女', '未知'], weights: [0.48, 0.48, 0.04] } },
          { name: 'address', type: 'string', label: '地址', rule: { format: 'address' } },
          { name: 'status', type: 'boolean', label: '状态', rule: { probability: 0.85 } },
          { name: 'createdAt', type: 'date', label: '创建时间', rule: { format: 'YYYY-MM-DD HH:mm:ss' } }
        ]
      },
      {
        name: 'product',
        label: '商品信息',
        icon: '🛍️',
        fields: [
          { name: 'id', type: 'number', label: '商品ID', rule: { min: 1000, max: 99999 } },
          { name: 'name', type: 'string', label: '商品名称', rule: { minLength: 2, maxLength: 20 } },
          { name: 'category', type: 'enum', label: '分类', rule: { options: ['电子产品', '服装', '食品', '家居', '图书', '运动'] } },
          { name: 'price', type: 'number', label: '价格', rule: { min: 9.9, max: 9999.99, decimal: 2 } },
          { name: 'stock', type: 'number', label: '库存', rule: { min: 0, max: 1000 } },
          { name: 'description', type: 'string', label: '描述', rule: { format: 'sentence' } },
          { name: 'brand', type: 'string', label: '品牌', rule: { minLength: 2, maxLength: 15 } },
          { name: 'isOnSale', type: 'boolean', label: '是否在售', rule: { probability: 0.9 } },
          { name: 'url', type: 'string', label: '商品链接', rule: { format: 'url' } }
        ]
      },
      {
        name: 'order',
        label: '订单信息',
        icon: '📦',
        fields: [
          { name: 'orderId', type: 'string', label: '订单号', rule: { pattern: 'ORD{8}d', prefix: '' } },
          { name: 'userId', type: 'number', label: '用户ID', rule: { min: 1, max: 10000 } },
          { name: 'productId', type: 'number', label: '商品ID', rule: { min: 1000, max: 99999 } },
          { name: 'quantity', type: 'number', label: '数量', rule: { min: 1, max: 10 } },
          { name: 'amount', type: 'number', label: '金额', rule: { min: 10, max: 99999, decimal: 2 } },
          { name: 'status', type: 'enum', label: '订单状态', rule: { options: ['待支付', '已支付', '已发货', '已完成', '已取消'], weights: [0.1, 0.2, 0.2, 0.4, 0.1] } },
          { name: 'paymentMethod', type: 'enum', label: '支付方式', rule: { options: ['微信支付', '支付宝', '银行卡', '货到付款'] } },
          { name: 'shippingAddress', type: 'string', label: '收货地址', rule: { format: 'address' } },
          { name: 'createdAt', type: 'date', label: '下单时间', rule: { format: 'YYYY-MM-DD HH:mm:ss' } }
        ]
      },
      {
        name: 'employee',
        label: '员工信息',
        icon: '👔',
        fields: [
          { name: 'empId', type: 'string', label: '工号', rule: { pattern: 'EMP{4}d', prefix: '' } },
          { name: 'name', type: 'string', label: '姓名', rule: { format: 'chineseName' } },
          { name: 'email', type: 'string', label: '企业邮箱', rule: { format: 'email' } },
          { name: 'phone', type: 'string', label: '手机号', rule: { format: 'phone' } },
          { name: 'department', type: 'enum', label: '部门', rule: { options: ['技术部', '产品部', '设计部', '市场部', '销售部', '人力资源部', '财务部', '行政部', '运营部'] } },
          { name: 'title', type: 'string', label: '职位', rule: { format: 'title' } },
          { name: 'level', type: 'enum', label: '职级', rule: { options: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] } },
          { name: 'salary', type: 'number', label: '月薪', rule: { min: 5000, max: 80000, decimal: 2 } },
          { name: 'entryDate', type: 'date', label: '入职日期', rule: { format: 'YYYY-MM-DD' } },
          { name: 'isFullTime', type: 'boolean', label: '是否全职', rule: { probability: 0.95 } }
        ]
      }
    ]
  });
});

module.exports = router;
