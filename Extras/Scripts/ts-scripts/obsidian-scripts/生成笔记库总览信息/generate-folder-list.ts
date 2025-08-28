/*
- Author: Qoder AI based on existing script patterns
- Create Time: 2025-01-23
- Description: 这个脚本用于列出当前Obsidian仓库中的所有文件夹结构，
-            包括每个文件夹中的文件数量，并生成一个总结报告。
-            脚本会扫描整个vault，统计文件夹层级结构，
-            然后生成一个包含详细文件夹信息的markdown文件。
-            【AI优化】: 支持参数化配置，可以控制显示深度和最小文件数量，
-            避免生成过长的报告内容，特别适合AI阅读和分析。
-            支持通过URL参数动态调整筛选条件。
- warning: 这个脚本的最前面，不能放任何文本，frontmatter也不行。
- Version: 1.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;

// --- 配置项 ---
const OUTPUT_FILENAME_BASE = "📁 文件夹结构报告";
const OUTPUT_PATH = "/";  // 根目录

// AI优化配置 - 控制报告长度
const DEFAULT_MIN_FILE_COUNT = 1;       // 默认只显示文件数量>=1的文件夹
const DEFAULT_MAX_DEPTH = 10;           // 默认最大显示深度
const DEFAULT_SHOW_EMPTY_FOLDERS = true; // 默认显示空文件夹

// 运行时配置（可以通过参数传入）
interface Config {
    minFileCount: number;        // 最小文件数量阈值
    maxDepth: number;           // 最大显示深度
    showEmptyFolders: boolean;  // 是否显示空文件夹
    showFileList: boolean;      // 是否显示每个文件夹的文件列表
}
// --- END ---

interface FolderStats {
    [folderPath: string]: {
        fileCount: number;
        subFolderCount: number;
        depth: number;
        files: string[];
        subFolders: string[];
    };
}

function generateTimestampedFilename(): string {
    const now = new Date();
    const timestamp = now.getFullYear() +
        '-' + String(now.getMonth() + 1).padStart(2, '0') +
        '-' + String(now.getDate()).padStart(2, '0') +
        '-' + String(now.getHours()).padStart(2, '0') +
        '-' + String(now.getMinutes()).padStart(2, '0') +
        '-' + String(now.getSeconds()).padStart(2, '0');
    return `${OUTPUT_FILENAME_BASE}-${timestamp}.md`;
}

function parseConfig(): Config {
    // 解析URL参数（如果有的话）
    let urlParams: { [key: string]: string } = {};
    try {
        // 尝试获取当前URL参数（如果是通过URL调用的）
        if (typeof window !== 'undefined' && window.location) {
            const url = new URL(window.location.href);
            url.searchParams.forEach((value, key) => {
                urlParams[key] = value;
            });
        }
    } catch (e) {
        console.log('无法获取URL参数，使用默认配置');
    }

    return {
        minFileCount: urlParams.minFileCount ? parseInt(urlParams.minFileCount) : DEFAULT_MIN_FILE_COUNT,
        maxDepth: urlParams.maxDepth ? parseInt(urlParams.maxDepth) : DEFAULT_MAX_DEPTH,
        showEmptyFolders: urlParams.showEmptyFolders !== 'false',
        showFileList: urlParams.showFileList === 'true'
    };
}

function getFolderDepth(folderPath: string): number {
    if (folderPath === '' || folderPath === '/') return 0;
    return folderPath.split('/').filter(part => part.length > 0).length;
}

function collectFolderStatistics(): FolderStats {
    const folderStats: FolderStats = {};
    const allFiles = app.vault.getAllLoadedFiles();

    // 初始化根目录
    folderStats['/'] = {
        fileCount: 0,
        subFolderCount: 0,
        depth: 0,
        files: [],
        subFolders: []
    };

    // 收集所有文件夹
    for (const file of allFiles) {
        if (file.children) {
            // 这是一个文件夹
            const folderPath = file.path === '' ? '/' : file.path;
            if (!folderStats[folderPath]) {
                folderStats[folderPath] = {
                    fileCount: 0,
                    subFolderCount: 0,
                    depth: getFolderDepth(folderPath),
                    files: [],
                    subFolders: []
                };
            }
        }
    }

    // 统计每个文件夹的内容
    for (const file of allFiles) {
        if (!file.children) {
            // 这是一个文件
            const parentPath = file.parent ? file.parent.path : '/';
            const normalizedParentPath = parentPath === '' ? '/' : parentPath;

            if (folderStats[normalizedParentPath]) {
                folderStats[normalizedParentPath].fileCount++;
                folderStats[normalizedParentPath].files.push(file.path);
            }
        } else {
            // 这是一个文件夹，更新父文件夹的子文件夹计数
            const parentPath = file.parent ? file.parent.path : '/';
            const normalizedParentPath = parentPath === '' ? '/' : parentPath;

            if (folderStats[normalizedParentPath] && file.path !== '') {
                folderStats[normalizedParentPath].subFolderCount++;
                folderStats[normalizedParentPath].subFolders.push(file.path);
            }
        }
    }

    return folderStats;
}

function generateMarkdownReport(folderStats: FolderStats, config: Config): string {
    // 筛选文件夹（根据配置）
    const filteredFolderStats = Object.keys(folderStats).reduce((filtered: FolderStats, folderPath) => {
        const stats = folderStats[folderPath];
        
        // 检查深度限制
        if (stats.depth > config.maxDepth) return filtered;
        
        // 检查文件数量和空文件夹显示设置
        if (!config.showEmptyFolders && stats.fileCount === 0 && stats.subFolderCount === 0) {
            return filtered;
        }
        
        if (stats.fileCount >= config.minFileCount || stats.subFolderCount > 0 || config.showEmptyFolders) {
            filtered[folderPath] = stats;
        }
        
        return filtered;
    }, {});

    const sortedFolders = Object.keys(filteredFolderStats).sort((a, b) => {
        // 首先按深度排序
        const depthDiff = filteredFolderStats[a].depth - filteredFolderStats[b].depth;
        if (depthDiff !== 0) return depthDiff;
        
        // 然后按路径字母顺序排序
        return a.localeCompare(b);
    });

    const totalFolders = Object.keys(folderStats).length;
    const displayedFolders = sortedFolders.length;
    const totalFiles = Object.values(folderStats).reduce((sum, stats) => sum + stats.fileCount, 0);

    let markdown = `# 📁 文件夹结构报告

> 生成时间: ${new Date().toLocaleString('zh-CN')}
> 总文件夹数: ${totalFolders} | 显示文件夹数: ${displayedFolders}
> 总文件数: ${totalFiles}
> 筛选条件: 最小文件数 ≥ ${config.minFileCount}, 最大深度 ≤ ${config.maxDepth}

## 📊 统计概览

| 文件夹路径 | 深度 | 文件数 | 子文件夹数 |
|------------|------|--------|------------|
`;

    // 添加表格内容
    for (const folderPath of sortedFolders) {
        const stats = filteredFolderStats[folderPath];
        const displayPath = folderPath === '/' ? '根目录' : folderPath;
        const indent = '　'.repeat(stats.depth);
        markdown += `| ${indent}${displayPath} | ${stats.depth} | ${stats.fileCount} | ${stats.subFolderCount} |\n`;
    }

    // 添加详细树状结构
    markdown += `\n## 🌳 文件夹树状结构\n\n`;

    for (const folderPath of sortedFolders) {
        const stats = filteredFolderStats[folderPath];
        const indent = '　'.repeat(stats.depth * 2);
        const folderIcon = stats.fileCount > 0 || stats.subFolderCount > 0 ? '📁' : '📂';
        const displayPath = folderPath === '/' ? '根目录' : folderPath.split('/').pop();

        markdown += `${indent}${folderIcon} **${displayPath}** (${stats.fileCount}个文件, ${stats.subFolderCount}个子文件夹)\n`;

        // 如果启用了文件列表显示且文件数量不太多
        if (config.showFileList && stats.files.length > 0 && stats.files.length <= 20) {
            for (const file of stats.files.slice(0, 10)) {
                const fileName = file.split('/').pop();
                markdown += `${indent}　📄 ${fileName}\n`;
            }
            if (stats.files.length > 10) {
                markdown += `${indent}　... 还有 ${stats.files.length - 10} 个文件\n`;
            }
        } else if (stats.files.length > 20) {
            markdown += `${indent}　📄 (文件过多，已隐藏显示)\n`;
        }

        markdown += '\n';
    }

    return markdown;
}

// 主函数：生成文件夹结构报告
async function main() {
    try {
        new Notice("正在扫描文件夹结构...", 2000);

        // 获取配置
        const config = parseConfig();
        console.log('使用配置:', config);

        // 收集统计数据
        const folderStats = collectFolderStatistics();

        if (Object.keys(folderStats).length === 0) {
            new Notice("未找到任何文件夹", 3000);
            return;
        }

        // 生成报告内容
        const reportContent = generateMarkdownReport(folderStats, config);

        // 生成带时间戳的文件名
        const outputFilename = generateTimestampedFilename();
        const outputFile = OUTPUT_PATH + outputFilename;

        // 创建新文件（每次生成新文件，避免覆盖历史记录）
        await app.vault.create(outputFile, reportContent);

        new Notice(`✅ 文件夹结构报告已生成: ${outputFilename}`, 4000);

    } catch (error) {
        const errorMessage = `生成文件夹结构报告时出错: ${(error as Error).message}`;
        new Notice(errorMessage, 5000);
        console.error(errorMessage, error);
    }
}

// 导出 invoke 函数，供 fix-require-modules 插件调用
export async function invoke() {
    await main();
}