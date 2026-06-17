const { createApp, ref, reactive, computed, watch, onMounted, markRaw } = Vue;
const { ElMessage, ElMessageBox } = ElementPlus;

const CLIENT_PAGINATION_THRESHOLD = 1000;

const app = createApp({
  setup() {
    const activeTab = ref('config');
    const editingFieldIndex = ref(-1);
    const generating = ref(false);
    const loadingPage = ref(false);
    const paginationMode = ref('client');
    const serverTotalCount = ref(10000);

    const generatedData = ref([]);
    const currentPageData = ref([]);

    const generateCount = ref(100);
    const actualGeneratedCount = ref(0);
    const currentPage = ref(1);
    const pageSize = ref(20);
    const seed = ref(12345);
    const selectedTemplate = ref('');
    const fieldTypes = ref([]);
    const formats = ref([]);
    const templates = ref([]);

    const modelForm = reactive({
      name: '用户',
      fields: []
    });

    const currentField = computed(() => {
      if (editingFieldIndex.value >= 0 && editingFieldIndex.value < modelForm.fields.length) {
        return modelForm.fields[editingFieldIndex.value];
      }
      return null;
    });

    const hasDataToDisplay = computed(() => {
      if (paginationMode.value === 'client') {
        return generatedData.value.length > 0;
      }
      return currentPageData.value.length > 0;
    });

    const hasDataToExport = computed(() => {
      if (paginationMode.value === 'client') {
        return generatedData.value.length > 0;
      }
      return currentPageData.value.length > 0;
    });

    const displayTotalCount = computed(() => {
      if (paginationMode.value === 'client') {
        return generatedData.value.length;
      }
      return serverTotalCount.value;
    });

    const generateApiExample = computed(() => {
      return `// 请求 - 前端分页（一次性生成）
POST /api/generate
Content-Type: application/json

{
  "model": {
    "name": "${modelForm.name}",
    "fields": [...]
  },
  "count": 100,
  "seed": ${seed.value}
}

// 响应
{
  "success": true,
  "data": {
    "total": 100,
    "seed": ${seed.value},
    "data": [...]
  }
}`;
    });

    const pageApiExample = computed(() => {
      return `// 请求 - 后端分页（按需加载）
POST /api/generate/skip
Content-Type: application/json

{
  "model": {
    "name": "${modelForm.name}",
    "fields": [...]
  },
  "skip": 0,
  "limit": 20,
  "seed": ${seed.value},
  "total": 10000
}

// 响应
{
  "success": true,
  "data": {
    "data": [...],
    "total": 10000,
    "skip": 0,
    "limit": 20,
    "seed": ${seed.value}
  }
}`;
    });

    const getDefaultRule = (type) => {
      switch (type) {
        case 'string':
          return {
            format: null,
            pattern: null,
            minLength: 1,
            maxLength: 20,
            options: [],
            prefix: '',
            suffix: ''
          };
        case 'number':
          return {
            min: 0,
            max: 100,
            decimal: 0,
            step: 1
          };
        case 'boolean':
          return {
            probability: 0.5
          };
        case 'date':
          return {
            min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
            max: new Date().toISOString().slice(0, 19),
            format: 'YYYY-MM-DD HH:mm:ss'
          };
        case 'enum':
          return {
            options: [],
            weights: []
          };
        default:
          return {};
      }
    };

    const addField = () => {
      const newField = {
        name: `field_${modelForm.fields.length + 1}`,
        label: `字段${modelForm.fields.length + 1}`,
        type: 'string',
        rule: getDefaultRule('string'),
        nullable: false,
        nullProbability: 0
      };
      modelForm.fields.push(newField);
      editingFieldIndex.value = modelForm.fields.length - 1;
      ElMessage.success('字段已添加');
    };

    const removeField = (index) => {
      ElMessageBox.confirm('确定要删除这个字段吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        modelForm.fields.splice(index, 1);
        if (editingFieldIndex.value >= modelForm.fields.length) {
          editingFieldIndex.value = modelForm.fields.length - 1;
        }
        ElMessage.success('字段已删除');
      }).catch(() => {});
    };

    const selectField = (index) => {
      editingFieldIndex.value = index;
    };

    const onTypeChange = (newType) => {
      if (currentField.value) {
        currentField.value.rule = getDefaultRule(newType);
      }
    };

    const getTypeIcon = (type) => {
      const icons = {
        string: '📝',
        number: '🔢',
        boolean: '✅',
        date: '📅',
        enum: '📋'
      };
      return icons[type] || '❓';
    };

    const getTypeLabel = (type) => {
      const labels = {
        string: '字符串',
        number: '数字',
        boolean: '布尔值',
        date: '日期',
        enum: '枚举'
      };
      return labels[type] || type;
    };

    const randomSeed = () => {
      seed.value = Math.floor(Math.random() * 999999999);
    };

    const formatCellValue = (value) => {
      if (value === null || value === undefined) {
        return 'null';
      }
      if (typeof value === 'boolean') {
        return value ? '是' : '否';
      }
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      return value;
    };

    const onPaginationModeChange = (mode) => {
      generatedData.value = [];
      currentPageData.value = [];
      currentPage.value = 1;
      actualGeneratedCount.value = 0;

      if (mode === 'server' && generateCount.value > CLIENT_PAGINATION_THRESHOLD) {
        serverTotalCount.value = generateCount.value;
      }
    };

    const generateData = async () => {
      if (modelForm.fields.length === 0) {
        ElMessage.warning('请至少添加一个字段');
        return;
      }

      if (paginationMode.value === 'client') {
        await generateClientMode();
      } else {
        await generateServerMode();
      }
    };

    const generateClientMode = async () => {
      if (generateCount.value > CLIENT_PAGINATION_THRESHOLD) {
        try {
          await ElMessageBox.confirm(
            `当前要生成 ${generateCount.value.toLocaleString()} 条数据，这可能会占用大量浏览器内存。\n\n建议切换到「后端分页」模式以获得更好的性能。\n\n是否继续使用前端分页模式？`,
            '大数据量警告',
            {
              confirmButtonText: '继续生成',
              cancelButtonText: '切换到后端分页',
              type: 'warning',
              dangerouslyUseHTMLString: true
            }
          );
        } catch {
          paginationMode.value = 'server';
          serverTotalCount.value = generateCount.value;
          ElMessage.info('已切换到后端分页模式');
          return;
        }
      }

      generating.value = true;
      try {
        const startTime = Date.now();
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelForm,
            count: generateCount.value,
            seed: seed.value
          })
        });

        const result = await response.json();

        if (result.success) {
          generatedData.value = result.data.data;
          actualGeneratedCount.value = result.data.total;
          seed.value = result.data.seed;
          currentPage.value = 1;

          updateCurrentPageData();

          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          ElMessage.success(`成功生成 ${result.data.total.toLocaleString()} 条数据，耗时 ${duration}s`);
          activeTab.value = 'preview';
        } else {
          ElMessage.error(result.error || '生成失败');
        }
      } catch (error) {
        ElMessage.error('请求失败：' + error.message);
      } finally {
        generating.value = false;
      }
    };

    const generateServerMode = async () => {
      generating.value = true;
      currentPage.value = 1;
      try {
        await loadServerPage(1, pageSize.value);
        ElMessage.success(`后端分页模式已启动，总数据量：${serverTotalCount.value.toLocaleString()} 条`);
        activeTab.value = 'preview';
      } catch (error) {
        ElMessage.error('请求失败：' + error.message);
      } finally {
        generating.value = false;
      }
    };

    const loadServerPage = async (page, size) => {
      loadingPage.value = true;
      try {
        const skip = (page - 1) * size;
        const response = await fetch('/api/generate/skip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelForm,
            skip: skip,
            limit: size,
            seed: seed.value,
            total: serverTotalCount.value
          })
        });

        const result = await response.json();

        if (result.success) {
          currentPageData.value = result.data.data;
          seed.value = result.data.seed;
        } else {
          throw new Error(result.error || '加载失败');
        }
      } finally {
        loadingPage.value = false;
      }
    };

    const updateCurrentPageData = () => {
      if (paginationMode.value === 'client') {
        const start = (currentPage.value - 1) * pageSize.value;
        const end = start + pageSize.value;
        currentPageData.value = generatedData.value.slice(start, end);
      }
    };

    const onPageChange = async (page) => {
      currentPage.value = page;

      if (paginationMode.value === 'client') {
        updateCurrentPageData();
      } else {
        await loadServerPage(page, pageSize.value);
      }
    };

    const onPageSizeChange = async (size) => {
      const oldPageSize = pageSize.value;
      pageSize.value = size;

      if (paginationMode.value === 'client') {
        const firstItemIndex = (currentPage.value - 1) * oldPageSize;
        currentPage.value = Math.floor(firstItemIndex / size) + 1;
        updateCurrentPageData();
      } else {
        currentPage.value = 1;
        await loadServerPage(1, size);
      }
    };

    const exportJSON = async () => {
      try {
        let exportCount, exportData;

        if (paginationMode.value === 'client') {
          exportCount = generatedData.value.length;
          exportData = generatedData.value;
        } else {
          ElMessage.info(`正在生成 ${serverTotalCount.value.toLocaleString()} 条数据并导出，请稍候...`);
          exportCount = serverTotalCount.value;
          exportData = null;
        }

        const response = await fetch('/api/export/json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelForm,
            count: exportCount,
            seed: seed.value,
            data: exportData
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '导出失败');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${modelForm.name || 'data'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ElMessage.success(`JSON 导出成功，共 ${exportCount.toLocaleString()} 条数据`);
      } catch (error) {
        ElMessage.error('导出失败：' + error.message);
      }
    };

    const exportCSV = async () => {
      try {
        let exportCount, exportData;

        if (paginationMode.value === 'client') {
          exportCount = generatedData.value.length;
          exportData = generatedData.value;
        } else {
          ElMessage.info(`正在生成 ${serverTotalCount.value.toLocaleString()} 条数据并导出，请稍候...`);
          exportCount = serverTotalCount.value;
          exportData = null;
        }

        const response = await fetch('/api/export/csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelForm,
            count: exportCount,
            seed: seed.value,
            data: exportData
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '导出失败');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${modelForm.name || 'data'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ElMessage.success(`CSV 导出成功，共 ${exportCount.toLocaleString()} 条数据`);
      } catch (error) {
        ElMessage.error('导出失败：' + error.message);
      }
    };

    const applyTemplate = async (templateName) => {
      if (!templateName) return;

      const template = templates.value.find(t => t.name === templateName);
      if (template) {
        modelForm.name = template.label;
        modelForm.fields = JSON.parse(JSON.stringify(template.fields));
        editingFieldIndex.value = 0;
        ElMessage.success(`已应用模板：${template.label}`);
      }
    };

    const loadMeta = async () => {
      try {
        const [typesRes, templatesRes] = await Promise.all([
          fetch('/api/types'),
          fetch('/api/templates')
        ]);

        const typesData = await typesRes.json();
        const templatesData = await templatesRes.json();

        if (typesData.success) {
          fieldTypes.value = typesData.data.types;
          formats.value = typesData.data.formats;
        }

        if (templatesData.success) {
          templates.value = templatesData.data;
        }
      } catch (error) {
        console.error('加载元数据失败:', error);
      }
    };

    const initDefaultModel = () => {
      modelForm.fields = [
        {
          name: 'id',
          label: 'ID',
          type: 'number',
          rule: { min: 1, max: 99999, decimal: 0, step: 1 },
          nullable: false,
          nullProbability: 0
        },
        {
          name: 'name',
          label: '姓名',
          type: 'string',
          rule: { format: 'chineseName', pattern: null, minLength: 1, maxLength: 20, options: [], prefix: '', suffix: '' },
          nullable: false,
          nullProbability: 0
        },
        {
          name: 'email',
          label: '邮箱',
          type: 'string',
          rule: { format: 'email', pattern: null, minLength: 1, maxLength: 20, options: [], prefix: '', suffix: '' },
          nullable: false,
          nullProbability: 0
        },
        {
          name: 'phone',
          label: '手机号',
          type: 'string',
          rule: { format: 'phone', pattern: null, minLength: 1, maxLength: 20, options: [], prefix: '', suffix: '' },
          nullable: true,
          nullProbability: 0.1
        },
        {
          name: 'age',
          label: '年龄',
          type: 'number',
          rule: { min: 18, max: 65, decimal: 0, step: 1 },
          nullable: false,
          nullProbability: 0
        },
        {
          name: 'gender',
          label: '性别',
          type: 'enum',
          rule: { options: ['男', '女', '未知'], weights: [0.48, 0.48, 0.04] },
          nullable: false,
          nullProbability: 0
        },
        {
          name: 'status',
          label: '状态',
          type: 'boolean',
          rule: { probability: 0.85 },
          nullable: false,
          nullProbability: 0
        },
        {
          name: 'createdAt',
          label: '创建时间',
          type: 'date',
          rule: {
            min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
            max: new Date().toISOString().slice(0, 19),
            format: 'YYYY-MM-DD HH:mm:ss'
          },
          nullable: false,
          nullProbability: 0
        }
      ];
      editingFieldIndex.value = 0;
    };

    watch(currentPage, () => {
      if (paginationMode.value === 'client') {
        updateCurrentPageData();
      }
    });

    watch(pageSize, () => {
      if (paginationMode.value === 'client') {
        updateCurrentPageData();
      }
    });

    onMounted(() => {
      loadMeta();
      initDefaultModel();
    });

    return {
      activeTab,
      editingFieldIndex,
      generating,
      loadingPage,
      paginationMode,
      serverTotalCount,
      generatedData,
      currentPageData,
      generateCount,
      actualGeneratedCount,
      currentPage,
      pageSize,
      seed,
      selectedTemplate,
      fieldTypes,
      formats,
      templates,
      modelForm,
      currentField,
      hasDataToDisplay,
      hasDataToExport,
      displayTotalCount,
      generateApiExample,
      pageApiExample,
      addField,
      removeField,
      selectField,
      onTypeChange,
      getTypeIcon,
      getTypeLabel,
      randomSeed,
      formatCellValue,
      onPaginationModeChange,
      generateData,
      onPageChange,
      onPageSizeChange,
      exportJSON,
      exportCSV,
      applyTemplate
    };
  }
});

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(ElementPlus);
app.mount('#app');
