/*
- Author: AI Assistant
- Create Time: 2025-01-27
- Description: 简化版脚本v2，用于批量为包含review标签的md文件添加notetoolbar: SpacedRepetition属性
-             确保notetoolbar字段紧跟在tags字段后面
- Version: 2.0
*/

// Obsidian 类型声明
declare const app: any;
declare const Notice: any;

// 配置项
const TARGET_TAG = "review";
const TOOLBAR_PROPERTY = "notetoolbar";
const TOOLBAR_VALUE = "SpacedRepetition";

// 主函数
async function main() {
    try {
        new Notice("开始搜索包含review标签的文件...", 2000);

        // 获取所有md文件
        const allFiles = app.vault.getMarkdownFiles();
        console.log(`找到 ${allFiles.length} 个md文件`);

        // 筛选包含review标签且没有notetoolbar属性的文件
        const filesToProcess: any[] = [];

        for (const file of allFiles) {
            try {
                const cache = app.metadataCache.getFileCache(file);
                if (cache?.frontmatter?.tags) {
                    const tags = Array.isArray(cache.frontmatter.tags)
                        ? cache.frontmatter.tags
                        : [cache.frontmatter.tags];

                    if (tags.includes(TARGET_TAG) &&
                        cache.frontmatter[TOOLBAR_PROPERTY] !== TOOLBAR_VALUE) {
                        filesToProcess.push(file);
                    }
                }
            } catch (error) {
                console.error(`检查文件 ${file.path} 时出错:`, error);
            }
        }

        console.log(`需要处理的文件数量: ${filesToProcess.length}`);

        if (filesToProcess.length === 0) {
            new Notice("没有找到需要处理的文件", 3000);
            return;
        }

        // 批量处理文件
        let successCount = 0;
        let errorCount = 0;

        for (const file of filesToProcess) {
            try {
                await app.fileManager.processFrontMatter(file, (frontmatter: any) => {
                    // 使用更简单的方法：直接设置属性，Obsidian会自动保持顺序
                    // 删除现有的 notetoolbar 属性（如果存在）
                    if (frontmatter[TOOLBAR_PROPERTY]) {
                        delete frontmatter[TOOLBAR_PROPERTY];
                    }

                    // 重新添加 notetoolbar 属性，它会紧跟在 tags 后面
                    frontmatter[TOOLBAR_PROPERTY] = TOOLBAR_VALUE;
                });

                successCount++;
                console.log(`成功处理: ${file.path}`);

                // 显示进度
                if (successCount % 10 === 0) {
                    new Notice(`已处理 ${successCount}/${filesToProcess.length} 个文件`, 1000);
                }

            } catch (error) {
                errorCount++;
                console.error(`处理文件 ${file.path} 时出错:`, error);
            }
        }

        // 显示结果
        const message = `处理完成！\n成功: ${successCount} 个文件\n错误: ${errorCount} 个文件`;
        new Notice(message, 5000);
        console.log(message);

    } catch (error) {
        const errorMessage = `批量处理过程中出错: ${(error as Error).message}`;
        new Notice(errorMessage, 5000);
        console.error(errorMessage);
    }
}

// 导出函数供插件调用
export async function invoke() {
    await main();
}

// 非Obsidian环境下的处理
if (typeof app === 'undefined') {
    console.log("在非Obsidian环境中运行，跳过执行");
}
