/*
  CodeScript Toolkit - 插件开发示例
  演示如何创建临时插件
  包括插件生命周期、命令注册、设置管理等
*/

// 显式声明全局 app，避免类型丢失
declare const app: App;

// 创建日志函数
function createLogger() {
    return (...args: unknown[]) => {
        console.log('[插件开发示例]', ...args);
        // @ts-ignore
        new (window as any).Notice(String(args[0] ?? ''), 3000);
    };
}

// 示例插件类
// @ts-ignore
class ExamplePlugin extends (window as any).Plugin {
    private log: (...args: unknown[]) => void;
    private settings: {
        enableAutoSave: boolean;
        autoSaveInterval: number;
        enableStatusBar: boolean;
    };

    constructor(app: App, logger: (...args: unknown[]) => void) {
        super(app);
        this.log = logger;
        this.settings = {
            enableAutoSave: true,
            autoSaveInterval: 30000, // 30秒
            enableStatusBar: true
        };
    }

    async onload() {
        this.log('🔌 ExamplePlugin 正在加载...');

        // 1. 注册命令
        this.addCommand({
            id: 'example-plugin-show-stats',
            name: '显示仓库统计',
            callback: () => this.showVaultStats()
        });

        this.addCommand({
            id: 'example-plugin-create-note',
            name: '创建快速笔记',
            callback: () => this.createQuickNote()
        });

        this.addCommand({
            id: 'example-plugin-toggle-autosave',
            name: '切换自动保存',
            callback: () => this.toggleAutoSave()
        });

        // 2. 添加状态栏项
        if (this.settings.enableStatusBar) {
            const statusBarItem = this.addStatusBarItem();
            statusBarItem.setText('📝 插件已加载');
            statusBarItem.onClickEvent(() => {
                // @ts-ignore
                new (window as any).Notice('ExamplePlugin - 点击状态栏！');
            });
        }

        // 3. 注册文件变更监听器
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (this.settings.enableAutoSave && file instanceof TFile && file.extension === 'md') {
                    this.debouncedAutoSave(file);
                }
            })
        );

        // 4. 添加设置变更监听器
        this.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.log(`📄 新文件创建: ${file.basename}`);
                }
            })
        );

        // 5. 注册自动保存功能
        this.debouncedAutoSave = debounce(this.autoSaveFile.bind(this), this.settings.autoSaveInterval);

        this.log('✅ ExamplePlugin 加载完成');
        this.log('💡 可用命令: 显示仓库统计, 创建快速笔记, 切换自动保存');
    }

    onunload() {
        this.log('🔌 ExamplePlugin 正在卸载...');
        this.log('✅ ExamplePlugin 已卸载');
    }

    // 显示仓库统计
    private async showVaultStats() {
        const vault = this.app.vault;
        const files = vault.getFiles();
        const mdFiles = files.filter(f => f.extension === 'md');

        const stats = {
            totalFiles: files.length,
            mdFiles: mdFiles.length,
            canvasFiles: files.filter(f => f.extension === 'canvas').length,
            totalSize: files.reduce((sum, f) => sum + f.stat.size, 0),
            avgFileSize: Math.round(files.reduce((sum, f) => sum + f.stat.size, 0) / files.length),
            largestFile: files.reduce((max, f) => f.stat.size > max.stat.size ? f : max)
        };

        const message = `
仓库统计报告 📊
━━━━━━━━━━━━━━━━━━━━
总文件数: ${stats.totalFiles}
Markdown 文件: ${stats.mdFiles}
Canvas 文件: ${stats.canvasFiles}
总大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB
平均文件大小: ${Math.round(stats.avgFileSize / 1024)} KB
最大文件: ${stats.largestFile.basename} (${Math.round(stats.largestFile.stat.size / 1024)} KB)
━━━━━━━━━━━━━━━━━━━━
        `.trim();

        // @ts-ignore
        new (window as any).Notice(message, 8000);
        console.log('仓库统计:', stats);
    }

    // 创建快速笔记
    private async createQuickNote() {
        const vault = this.app.vault;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `快速笔记-${timestamp}.md`;

        const content = `# 快速笔记

创建时间: ${new Date().toLocaleString('zh-CN')}

## 内容

在这里记录你的想法...

## 标签
#快速笔记 #临时记录

---
*由 ExamplePlugin 创建*
`;

        try {
            const file = await vault.create(fileName, content);
            // 打开新创建的文件
            await this.app.workspace.openLinkText(file.basename, '', false);
            this.log(`✅ 快速笔记创建成功: ${file.basename}`);
        } catch (error) {
            this.log(`❌ 创建快速笔记失败: ${error.message}`);
        }
    }

    // 切换自动保存
    private toggleAutoSave() {
        this.settings.enableAutoSave = !this.settings.enableAutoSave;
        const status = this.settings.enableAutoSave ? '启用' : '禁用';
        this.log(`💾 自动保存已${status}`);
        // @ts-ignore
        new (window as any).Notice(`自动保存已${status}`, 3000);
    }

    // 自动保存文件
    private debouncedAutoSave: (file: TFile) => void;

    private async autoSaveFile(file: TFile) {
        try {
            // 这里可以添加自动保存逻辑
            // 例如：备份文件、同步到其他位置等
            this.log(`💾 文件已自动处理: ${file.basename}`);
        } catch (error) {
            console.error('自动保存失败:', error);
        }
    }
}

// 另一个示例插件 - 文件模板管理器
// @ts-ignore
class TemplateManagerPlugin extends (window as any).Plugin {
    private log: (...args: unknown[]) => void;
    private templates: { [key: string]: string } = {};

    constructor(app: App, logger: (...args: unknown[]) => void) {
        super(app);
        this.log = logger;
        this.initializeTemplates();
    }

    private initializeTemplates() {
        this.templates = {
            '会议记录': `# 会议记录

**会议主题**: [主题]
**参会人员**: [人员列表]
**会议时间**: ${new Date().toLocaleString('zh-CN')}
**会议地点**: [地点]

## 会议议题

1. [议题1]
   - 讨论内容
   - 决定事项

2. [议题2]
   - 讨论内容
   - 决定事项

## 行动项

- [ ] [行动项1] - 负责人: [姓名] - 截止日期: [日期]
- [ ] [行动项2] - 负责人: [姓名] - 截止日期: [日期]

## 会议总结

[总结内容]

---
*模板: 会议记录*
`,

            '项目计划': `# 项目计划

**项目名称**: [项目名]
**项目经理**: [姓名]
**开始日期**: [开始日期]
**结束日期**: [结束日期]
**项目状态**: 🚀 进行中

## 项目目标

[项目目标描述]

## 里程碑

- [ ] 里程碑1 - [日期]
- [ ] 里程碑2 - [日期]
- [ ] 里程碑3 - [日期]

## 任务清单

### 高优先级
- [ ] [任务1]
- [ ] [任务2]

### 中优先级
- [ ] [任务3]
- [ ] [任务4]

### 低优先级
- [ ] [任务5]
- [ ] [任务6]

## 资源需求

- [资源1]: [数量]
- [资源2]: [数量]

## 风险评估

- [风险1]: [影响] [概率]
- [风险2]: [影响] [概率]

---
*模板: 项目计划*
`,

            '读书笔记': `# 读书笔记

**书名**: [书名]
**作者**: [作者]
**阅读开始日期**: ${new Date().toLocaleString('zh-CN')}
**阅读完成日期**: [完成日期]

## 书籍信息

- **出版年份**: [年份]
- **页数**: [页数]
- **ISBN**: [ISBN]
- **推荐指数**: ⭐⭐⭐⭐⭐

## 核心观点

[书籍的核心观点和主要思想]

## 精彩摘录

> [摘录1] - 第[页码]页
>
> [摘录2] - 第[页码]页

## 个人感想

[阅读后的感想和收获]

## 相关书籍推荐

- [书籍1] - [作者]
- [书籍2] - [作者]

---
*模板: 读书笔记*
`
        };
    }

    async onload() {
        this.log('📚 TemplateManagerPlugin 正在加载...');

        // 注册模板应用命令
        Object.keys(this.templates).forEach(templateName => {
            this.addCommand({
                id: `template-manager-apply-${templateName.toLowerCase().replace(/\s+/g, '-')}`,
                name: `应用模板: ${templateName}`,
                callback: () => this.applyTemplate(templateName)
            });
        });

        // 注册列出模板命令
        this.addCommand({
            id: 'template-manager-list-templates',
            name: '列出所有模板',
            callback: () => this.listTemplates()
        });

        this.log('✅ TemplateManagerPlugin 加载完成');
        this.log('📋 可用模板: 会议记录, 项目计划, 读书笔记');
    }

    onunload() {
        this.log('📚 TemplateManagerPlugin 正在卸载...');
    }

    private async applyTemplate(templateName: string) {
        const template = this.templates[templateName];
        if (!template) {
            // @ts-ignore
            new (window as any).Notice(`模板 "${templateName}" 不存在`);
            return;
        }

        const vault = this.app.vault;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `${templateName}-${timestamp}.md`;

        try {
            const file = await vault.create(fileName, template);
            await this.app.workspace.openLinkText(file.basename, '', false);
            this.log(`✅ 模板 "${templateName}" 已应用: ${file.basename}`);
        } catch (error) {
            this.log(`❌ 应用模板失败: ${error.message}`);
        }
    }

    private listTemplates() {
        const templateList = Object.keys(this.templates).join(', ');
        const message = `📚 可用模板: ${templateList}`;
        // @ts-ignore
        new (window as any).Notice(message, 5000);
        console.log('可用模板:', this.templates);
    }
}

export async function invoke(app: App): Promise<void> {
    const log = createLogger();

    try {
        log('🚀 开始执行插件开发示例');

        // 检查 registerTempPlugin 函数是否可用
        if (typeof (window as any).registerTempPlugin === 'undefined') {
            log('⚠️  registerTempPlugin 函数不可用');
            log('🔧 请尝试以下解决方案：');
            log('   1. 确保 CodeScript Toolkit 插件已正确安装并启用');
            log('   2. 重启 Obsidian');
            log('   3. 在 CodeScript Toolkit 的脚本编辑器中运行此脚本');
            log('   4. 不要在代码按钮块中运行此脚本');

            // 创建故障排除指南文件
            const troubleshootContent = `# 插件开发示例 - 故障排除指南

## 问题：registerTempPlugin is not defined

### 可能原因
1. **CodeScript Toolkit 插件未安装或未启用**
2. **在错误的上下文中运行脚本**
3. **插件版本不兼容**

### 解决方案

#### 方案1：检查插件安装
1. 打开设置 → 社区插件
2. 搜索 "CodeScript Toolkit"
3. 确保插件已安装并启用

#### 方案2：正确运行方式
**推荐：在 CodeScript Toolkit 的脚本编辑器中运行**
- 按 \`Ctrl/Cmd + P\` 打开命令面板
- 搜索 "CodeScript Toolkit: Invoke Script"
- 选择 "插件开发示例.ts"

**或者使用 require() 方式：**
\`\`\`javascript
require('./Extras/Scripts/ts-scripts/obsidian-scripts/插件开发示例.ts').invoke(app);
\`\`\`

#### 方案3：环境检查
运行以下脚本检查环境：
\`\`\`javascript
require('./Extras/Scripts/ts-scripts/obsidian-scripts/脚本运行状态检查.ts').invoke(app);
\`\`\`

### 临时解决方法
如果问题持续存在，可以：
1. 重启 Obsidian
2. 重新启用 CodeScript Toolkit 插件
3. 检查控制台是否有其他错误信息

---
*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

            const vault = app.vault;
            const troubleshootFile = await vault.create('插件开发示例-故障排除指南.md', troubleshootContent);
            log(`📋 故障排除指南已创建: ${troubleshootFile.basename}`);

            return;
        }

        // 1. 注册第一个示例插件
        log('🔌 注册 ExamplePlugin...');
        const examplePlugin = new ExamplePlugin(app, log);
        (window as any).registerTempPlugin(examplePlugin);
        log('✅ ExamplePlugin 注册成功');

        // 2. 注册第二个示例插件
        log('📚 注册 TemplateManagerPlugin...');
        const templatePlugin = new TemplateManagerPlugin(app, log);
        (window as any).registerTempPlugin(templatePlugin);
        log('✅ TemplateManagerPlugin 注册成功');

        // 3. 演示插件功能
        log('🎯 演示插件功能...');

        // 等待一秒让插件初始化
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 自动执行一些命令来演示
        setTimeout(() => {
            log('📊 执行仓库统计命令...');
            app.commands.executeCommandById('example-plugin-show-stats');
        }, 2000);

        setTimeout(() => {
            log('📋 列出可用模板...');
            app.commands.executeCommandById('template-manager-list-templates');
        }, 4000);

        // 4. 显示插件管理信息
        log('📝 临时插件管理信息:');
        log('💡 使用命令面板 (Ctrl/Cmd + P) 可以看到新注册的命令');
        log('🔧 使用 "CodeScript Toolkit: Unload Temp Plugin" 可以卸载临时插件');
        log('📚 可用插件: ExamplePlugin, TemplateManagerPlugin');

        // 5. 创建使用说明文件
        const usageContent = `# CodeScript Toolkit 插件开发示例

## 已创建的临时插件

### ExamplePlugin
- **显示仓库统计**: 显示当前仓库的文件统计信息
- **创建快速笔记**: 创建带时间戳的快速笔记
- **切换自动保存**: 切换文件自动保存功能
- **状态栏**: 显示插件加载状态

### TemplateManagerPlugin
- **应用模板: 会议记录**: 创建会议记录模板
- **应用模板: 项目计划**: 创建项目计划模板
- **应用模板: 读书笔记**: 创建读书笔记模板
- **列出所有模板**: 显示所有可用模板

## 使用方法

1. 使用命令面板 (Ctrl/Cmd + P) 搜索相关命令
2. 或者使用快捷键 (如果已设置)
3. 点击状态栏的项目图标查看插件状态

## 清理

使用以下命令卸载临时插件:
- "CodeScript Toolkit: Unload Temp Plugin: ExamplePlugin"
- "CodeScript Toolkit: Unload Temp Plugin: TemplateManagerPlugin"
- "CodeScript Toolkit: Unload Temp Plugins" (卸载所有)

---
*自动生成于: ${new Date().toLocaleString('zh-CN')}*
`;

        const vault = app.vault;
        const usageFile = await vault.create('CodeScript插件示例使用说明.md', usageContent);
        log(`✅ 使用说明已创建: ${usageFile.basename}`);

        log('🎉 插件开发示例执行完成！');
        log('💡 提示: 查看刚创建的使用说明文件了解如何使用这些插件');

    } catch (error) {
        console.error('[插件开发示例] 执行失败:', error);
        // @ts-ignore
        new (window as any).Notice(`执行失败: ${error.message}`, 5000);
        throw error;
    }
}
