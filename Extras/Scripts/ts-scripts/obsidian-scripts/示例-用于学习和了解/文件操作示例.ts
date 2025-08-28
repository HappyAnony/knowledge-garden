/*
  CodeScript Toolkit - 文件操作示例
  演示如何读取、处理和操作 vault 中的文件
  包括文件读写、内容分析、属性读取等（已优化以确保稳定性）
*/

// 显式声明全局 app，避免类型丢失
declare const app: App;

// 创建日志函数
function createLogger() {
    return (...args: unknown[]) => {
        console.log('[文件操作示例]', ...args);
        // @ts-ignore
        new (window as any).Notice(String(args[0] ?? ''), 3000);
    };
}

// 分析文件内容统计
function analyzeFileContent(content: string): {
    lines: number;
    words: number;
    chars: number;
    links: number;
    headers: number;
    codeBlocks: number;
} {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    const chars = content.length;

    // 统计各种 Markdown 元素
    const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    const headers = (content.match(/^#{1,6}\s/gm) || []).length;
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;

    return { lines, words, chars, links, headers, codeBlocks };
}

// 生成文件报告
function generateFileReport(file: TFile, content: string): string {
    const stats = analyzeFileContent(content);
    const modifiedTime = new Date(file.stat.mtime).toLocaleString('zh-CN');
    const createdTime = new Date(file.stat.ctime).toLocaleString('zh-CN');

    return `# 文件分析报告: ${file.basename}

## 基本信息
- **文件名**: ${file.name}
- **路径**: ${file.path}
- **大小**: ${file.stat.size} 字节
- **创建时间**: ${createdTime}
- **修改时间**: ${modifiedTime}

## 内容统计
- **行数**: ${stats.lines}
- **单词数**: ${stats.words}
- **字符数**: ${stats.chars}
- **Markdown 链接**: ${stats.links}
- **标题数量**: ${stats.headers}
- **代码块数量**: ${stats.codeBlocks}

---
*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
`;
}

export async function invoke(app: App): Promise<void> {
    const log = createLogger();

    // 定义变量以确保作用域正确
    let reportFileName = '';
    let newName = '';
    let subDir = '';
    let testDir = '';

    try {
        log('🚀 开始执行文件操作示例');

        const vault = app.vault;

        // 1. 获取并分析 Markdown 文件
        log('📄 扫描 Markdown 文件...');
        const mdFiles = vault.getFiles().filter(file => file.extension === 'md');
        log(`📊 发现 ${mdFiles.length} 个 Markdown 文件`);

        // 2. 选择一个中等大小的文件进行详细分析
        const suitableFiles = mdFiles
            .filter(file => file.stat.size > 1000 && file.stat.size < 50000) // 1KB 到 50KB
            .sort((a, b) => b.stat.size - a.stat.size)
            .slice(0, 5);

        if (suitableFiles.length === 0) {
            log('⚠️  未找到合适大小的文件进行分析');
            return;
        }

        const targetFile = suitableFiles[0];
        log(`🎯 选择分析文件: ${targetFile.basename} (${targetFile.stat.size} 字节)`);

        // 3. 读取文件内容
        log('📖 读取文件内容...');
        const content = await vault.read(targetFile);
        log(`✅ 文件读取成功，长度: ${content.length} 字符`);

        // 4. 分析文件内容
        log('🔍 分析文件内容...');
        const stats = analyzeFileContent(content);
        log(`📊 分析结果:
  - 行数: ${stats.lines}
  - 单词数: ${stats.words}
  - 字符数: ${stats.chars}
  - 链接数: ${stats.links}
  - 标题数: ${stats.headers}
  - 代码块数: ${stats.codeBlocks}`);

        // 5. 生成并保存分析报告
        log('📋 生成分析报告...');
        const reportContent = generateFileReport(targetFile, content);
        reportFileName = `${targetFile.basename.replace('.md', '')}-分析报告.md`;

        const reportFile = await vault.create(reportFileName, reportContent);
        log(`✅ 分析报告已保存: ${reportFile.basename}`);

        // 6. 演示文件搜索功能
        log('🔎 搜索包含特定关键词的文件...');
        const searchTerm = 'obsidian';
        const searchResults = [];

        for (const file of mdFiles.slice(0, 20)) { // 只搜索前20个文件作为示例
            try {
                const fileContent = await vault.read(file);
                if (fileContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                    searchResults.push(file.basename);
                }
            } catch (error) {
                // 忽略读取错误
            }
        }

        log(`🔍 包含 "${searchTerm}" 的文件 (${searchResults.length} 个):`);
        searchResults.slice(0, 10).forEach((fileName, index) => {
            log(`  ${index + 1}. ${fileName}`);
        });

        // 7. 演示批量文件操作
        log('📂 执行批量文件操作...');
        const recentFiles = mdFiles
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 10);

        log('🕐 最近修改的 10 个文件:');
        recentFiles.forEach((file, index) => {
            const modifiedTime = new Date(file.stat.mtime).toLocaleDateString('zh-CN');
            const size = (file.stat.size / 1024).toFixed(1);
            log(`  ${index + 1}. ${file.basename} (${size}KB, ${modifiedTime})`);
        });

        // 8. 演示安全的文件操作
        log('📁 演示安全的文件操作...');

        try {
            // 创建一个简单的测试文件
            const testContent = `# CodeScript 测试文件

这是由脚本自动创建的测试文件。
创建时间: ${new Date().toLocaleString('zh-CN')}

---
*此文件将在演示结束后自动清理*
`;

            const testFileName = `CodeScript测试-${Date.now()}.md`;
            const testFile = await vault.create(testFileName, testContent);
            log(`✅ 测试文件创建成功: ${testFile.basename}`);

            // 演示文件属性读取（替代重命名演示，避免API兼容性问题）
            log('📋 演示文件属性读取...');

            try {
                // 读取文件属性
                const fileStats = testFile.stat;
                log(`📊 文件属性:
  - 大小: ${fileStats.size} 字节
  - 创建时间: ${new Date(fileStats.ctime).toLocaleString('zh-CN')}
  - 修改时间: ${new Date(fileStats.mtime).toLocaleString('zh-CN')}
  - 路径: ${testFile.path}
  - 扩展名: ${testFile.extension}`);

                // 演示文件内容重新读取
                log('📖 重新读取文件内容...');
                const reReadContent = await vault.read(testFile);
                log(`✅ 文件重新读取成功，内容长度: ${reReadContent.length} 字符`);

                newName = testFileName; // 保存文件名用于清理

            } catch (propertyError) {
                log(`⚠️  文件属性读取失败: ${propertyError.message}`);
                newName = testFileName; // 使用原始文件名
            }

        } catch (createError) {
            log(`⚠️  文件创建失败: ${createError.message}`);
            log('💡 将跳过文件操作演示，继续其他功能');
        }

        // 9. 清理示例文件
        log('🧹 清理示例文件...');
        try {
            // 等待一段时间确保文件操作完全完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            const fileNamesToDelete = [
                newName,
                reportFileName
            ].filter(Boolean);

            log(`🔍 发现 ${fileNamesToDelete.length} 个文件需要清理`);

            for (const fileName of fileNamesToDelete) {
                try {
                    // 直接通过文件名查找并删除文件
                    const file = vault.getAbstractFileByPath(fileName);
                    if (file) {
                        await vault.delete(file);
                        log(`✅ 删除文件: ${fileName}`);
                    } else {
                        log(`ℹ️  文件不存在: ${fileName}`);
                    }
                } catch (deleteError) {
                    log(`⚠️  删除文件失败 ${fileName}: ${deleteError.message}`);
                    // 继续删除其他文件
                }
            }

            log('✅ 示例文件清理完成');
        } catch (error) {
            log(`⚠️  清理失败: ${error.message}`);
            log('💡 请手动删除临时文件，或忽略此警告');
        }

        log('🎉 文件操作示例执行完成！');

    } catch (error) {
        console.error('[文件操作示例] 执行失败:', error);
        // @ts-ignore
        new (window as any).Notice(`执行失败: ${error.message}`, 5000);
        throw error;
    }
}
