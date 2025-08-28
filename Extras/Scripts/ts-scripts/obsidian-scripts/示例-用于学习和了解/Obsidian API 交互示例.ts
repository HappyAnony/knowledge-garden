/*
  CodeScript Toolkit - Obsidian API 交互示例
  演示如何使用 Obsidian 的各种 API 进行交互
  包括文件操作、元数据处理、命令执行等
*/

// 显式声明全局 app，避免类型丢失
declare const app: App;

// 创建日志函数
function createLogger() {
    return (...args: unknown[]) => {
        console.log('[Obsidian API 示例]', ...args);
        // @ts-ignore
        new (window as any).Notice(String(args[0] ?? ''), 3000);
    };
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export async function invoke(app: App): Promise<void> {
    const log = createLogger();

    try {
        log('🚀 开始执行 Obsidian API 交互示例');

        // 1. Vault 信息获取
        log('📂 获取 Vault 信息...');
        const vault = app.vault;
        const vaultName = vault.getName();
        const vaultPath = vault.adapter.basePath;
        const allFiles = vault.getFiles();
        log(`🏰 Vault: ${vaultName}`);
        log(`📁 路径: ${vaultPath}`);
        log(`📄 文件总数: ${allFiles.length}`);

        // 2. 文件类型统计
        const fileTypes = allFiles.reduce((acc, file) => {
            const ext = file.extension || '无扩展名';
            acc[ext] = (acc[ext] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        log('📊 文件类型统计:');
        Object.entries(fileTypes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .forEach(([ext, count]) => {
                log(`  ${ext}: ${count} 个文件`);
            });

        // 3. 获取当前活动文件
        log('📝 检查当前活动文件...');
        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
            log(`📄 当前文件: ${activeFile.basename}`);
            log(`📂 所在目录: ${activeFile.parent?.path || '根目录'}`);
            log(`📏 文件大小: ${formatFileSize(activeFile.stat.size)}`);
        } else {
            log('⚠️  当前没有活动文件');
        }

        // 4. 元数据缓存操作
        log('🔍 分析元数据缓存...');
        const metadataCache = app.metadataCache;

        if (activeFile) {
            const cache = metadataCache.getFileCache(activeFile);
            if (cache) {
                log(`📋 Frontmatter 字段: ${Object.keys(cache.frontmatter || {}).length} 个`);
                log(`🔗 内部链接: ${cache.links?.length || 0} 个`);
                log(`📎 嵌入内容: ${cache.embeds?.length || 0} 个`);

                if (cache.frontmatter) {
                    log('🏷️  Frontmatter 预览:');
                    Object.entries(cache.frontmatter)
                        .slice(0, 5)
                        .forEach(([key, value]) => {
                            const displayValue = typeof value === 'string' && value.length > 50
                                ? value.substring(0, 50) + '...'
                                : String(value);
                            log(`    ${key}: ${displayValue}`);
                        });
                }
            }
        }

        // 5. 工作区信息
        log('🖥️  工作区状态...');
        const workspace = app.workspace;
        const leaves = workspace.getLeavesOfType('markdown');
        const canvasLeaves = workspace.getLeavesOfType('canvas');
        log(`📄 打开的 Markdown 文件: ${leaves.length} 个`);
        log(`🎨 打开的 Canvas 文件: ${canvasLeaves.length} 个`);

        // 6. 插件信息
        log('🔌 插件状态...');
        const plugins = app.plugins;
        const enabledPlugins = Array.from(plugins.enabledPlugins);
        log(`✅ 已启用插件: ${enabledPlugins.length} 个`);

        // 显示前 5 个插件
        enabledPlugins.slice(0, 5).forEach((pluginId, index) => {
            log(`  ${index + 1}. ${pluginId}`);
        });

        // 7. 演示创建新文件
        log('📝 创建临时测试文件...');
        const testContent = `# CodeScript Toolkit 测试

创建时间: ${new Date().toLocaleString('zh-CN')}

这是一个自动创建的测试文件，用于演示 CodeScript Toolkit 的功能。

## 功能特性

- ✅ 支持 TypeScript 语法
- ✅ 支持 require() 模块导入
- ✅ 支持 Obsidian API 调用
- ✅ 支持异步操作

---
*此文件由脚本自动生成*
`;

        const testFileName = `CodeScript测试-${Date.now()}.md`;
        const testFile = await vault.create(testFileName, testContent);
        log(`✅ 测试文件创建成功: ${testFile.basename}`);

        // 8. 演示文件搜索
        log('🔎 搜索 Markdown 文件...');
        const mdFiles = allFiles.filter(file => file.extension === 'md');
        const recentFiles = mdFiles
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 5);

        log('🕐 最近修改的 Markdown 文件:');
        recentFiles.forEach((file, index) => {
            const modifiedTime = new Date(file.stat.mtime).toLocaleString('zh-CN');
            log(`  ${index + 1}. ${file.basename} (${modifiedTime})`);
        });

        // 9. 清理测试文件
        log('🧹 清理临时文件...');
        try {
            // 延迟一小段时间，确保文件创建操作完全完成
            await new Promise(resolve => setTimeout(resolve, 500));
            await vault.delete(testFile);
            log('✅ 临时文件已清理');
        } catch (deleteError) {
            // 如果删除失败，尝试使用不同的方式
            log(`⚠️  文件删除失败: ${deleteError.message}`);
            try {
                // 等待更长时间后重试
                await new Promise(resolve => setTimeout(resolve, 2000));
                await vault.delete(testFile);
                log('✅ 临时文件已清理 (重试成功)');
            } catch (retryError) {
                log(`⚠️  文件删除重试仍然失败: ${retryError.message}`);
                log('💡 请手动删除测试文件，或忽略此警告');
            }
        }

        log('🎉 Obsidian API 交互示例执行完成！');

    } catch (error) {
        console.error('[Obsidian API 示例] 执行失败:', error);
        // @ts-ignore
        new (window as any).Notice(`执行失败: ${error.message}`, 5000);
        throw error;
    }
}
