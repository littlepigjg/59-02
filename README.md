# Mock Data Generator Service

本地Mock数据生成服务，为开发团队提供快速、可定制的假数据生成能力。

## 功能特性

- **数据模型定义**：支持多种字段类型（字符串、数字、布尔、日期、枚举等）
- **灵活的生成规则**：可配置取值范围、格式、正则表达式等
- **种子生成**：支持自定义种子，确保每次生成的数据一致
- **多格式输出**：支持 JSON 和 CSV 格式导出
- **分页查询**：API 支持分页获取数据
- **可视化编辑器**：Web 界面配置数据模型
- **数据预览**：前端实时预览生成的数据

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

### 3. 访问应用

- 前端界面：http://localhost:3000
- API 文档：http://localhost:3000/api

## 目录结构

```
.
├── server/
│   ├── index.js          # 服务入口
│   ├── models/           # 模型解析器
│   ├── generator/        # 数据生成引擎
│   └── routes/           # API 路由
├── public/               # 前端静态文件
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── package.json
```

## API 接口

### POST /api/generate
生成 mock 数据

**请求体：**
```json
{
  "model": {
    "name": "用户",
    "fields": [
      { "name": "id", "type": "number", "rule": { "min": 1, "max": 1000 } },
      { "name": "name", "type": "string", "rule": { "format": "chineseName" } },
      { "name": "email", "type": "string", "rule": { "format": "email" } }
    ]
  },
  "count": 100,
  "seed": 12345
}
```

**响应：**
```json
{
  "total": 100,
  "data": [...]
}
```

### POST /api/generate/page
分页生成数据

**请求体：**
```json
{
  "model": {...},
  "page": 1,
  "pageSize": 20,
  "seed": 12345
}
```

### POST /api/export/json
导出 JSON 格式

### POST /api/export/csv
导出 CSV 格式

## 支持的字段类型

| 类型 | 说明 | 规则选项 |
|------|------|----------|
| string | 字符串 | format, minLength, maxLength, pattern, options |
| number | 数字 | min, max, decimal, step |
| boolean | 布尔值 | probability |
| date | 日期 | min, max, format |
| enum | 枚举 | options |
| reference | 引用 | model, field |

## 内置格式 (format)

- `chineseName` - 中文名
- `englishName` - 英文名
- `email` - 邮箱
- `phone` - 手机号
- `idCard` - 身份证号
- `address` - 地址
- `company` - 公司名
- `title` - 职位
- `sentence` - 句子
- `paragraph` - 段落
- `url` - 网址
- `ip` - IP地址
- `uuid` - UUID
