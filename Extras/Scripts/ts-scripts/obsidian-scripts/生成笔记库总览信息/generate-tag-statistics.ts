/*
- Author: Sonic AI based on existing script patterns
- Create Time: 2024-12-19
- Description: 这个脚本用于统计当前Obsidian仓库中所有tags的使用情况，
-            包括每个tag对应的文件数量，并生成一个总结报告。
-            脚本会扫描所有markdown文件，解析frontmatter中的tags，
-            然后生成一个包含详细统计信息的markdown文件。
-            【AI优化】: 支持参数化配置，默认只显示高频tags和限制文件数量，
-            避免生成过长的报告内容，特别适合AI阅读和分析。
-            支持通过URL参数动态调整筛选条件。
- warning: 这个脚本的最前面，不能放任何文本，frontmatter也不行。
- Version: 2.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;

// --- 配置项 ---
const OUTPUT_FILENAME_BASE = "🏷️ Tags统计报告";
const OUTPUT_PATH = "/";  // 根目录

// AI优化配置 - 控制报告长度
const DEFAULT_MIN_TAG_COUNT = 5;        // 默认只显示文件数量>=5的tags
const DEFAULT_MAX_FILES_PER_TAG = 20;   // 默认每个tag最多显示20个文件

// 运行时配置（可以通过参数传入）
interface Config {
    minTagCount: number;         // 最小tag文件数量阈值
    maxFilesPerTag: number;      // 每个tag最多显示的文件数
    showAllTags: boolean;        // 是否显示所有tags（忽略minTagCount）
    showAllFiles: boolean;       // 是否显示所有文件（忽略maxFilesPerTag）
}
// --- END ---

interface TagStats {
    [tag: string]: {
        count: number;
        files: string[];
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
        minTagCount: urlParams.minTagCount ? parseInt(urlParams.minTagCount) : DEFAULT_MIN_TAG_COUNT,
        maxFilesPerTag: urlParams.maxFilesPerTag ? parseInt(urlParams.maxFilesPerTag) : DEFAULT_MAX_FILES_PER_TAG,
        showAllTags: urlParams.showAllTags === 'true',
        showAllFiles: urlParams.showAllFiles === 'true'
    };
}

function parseTags(tags: any): string[] {
    if (!tags) return [];

    if (Array.isArray(tags)) {
        return tags.map(tag => String(tag).trim()).filter(Boolean);
    }

    if (typeof tags === 'string' && tags.length > 0) {
        return tags.split(',')
            .map((tag: string) => tag.trim())
            .filter(tag => tag.length > 0);
    }

    return [];
}

function collectTagStatistics(): TagStats {
    const tagStats: TagStats = {};
    const markdownFiles = app.vault.getMarkdownFiles();

    for (const file of markdownFiles) {
        try {
            // 获取文件缓存
            const cache = app.metadataCache.getFileCache(file);
            if (!cache || !cache.frontmatter) continue;

            // 解析tags
            const tags = parseTags(cache.frontmatter.tags);
            if (tags.length === 0) continue;

            // 统计每个tag
            for (const tag of tags) {
                if (!tagStats[tag]) {
                    tagStats[tag] = {
                        count: 0,
                        files: []
                    };
                }
                tagStats[tag].count++;
                tagStats[tag].files.push(file.path);
            }
        } catch (error) {
            console.warn(`处理文件 ${file.path} 时出错:`, error);
        }
    }

    return tagStats;
}

function generateMarkdownReport(tagStats: TagStats, config: Config): string {
    // 筛选tags（根据配置）
    const filteredTagStats = Object.keys(tagStats).reduce((filtered: TagStats, tag) => {
        const stats = tagStats[tag];
        if (config.showAllTags || stats.count >= config.minTagCount) {
            filtered[tag] = stats;
        }
        return filtered;
    }, {});

    const sortedTags = Object.keys(filteredTagStats).sort((a, b) => {
        // 首先按文件数量降序排序
        const countDiff = filteredTagStats[b].count - filteredTagStats[a].count;
        if (countDiff !== 0) return countDiff;
        // 如果数量相同，按标签名升序排序
        return a.localeCompare(b);
    });

    const totalMarkdownFiles = app.vault.getMarkdownFiles().length;
    const totalTags = Object.keys(tagStats).length;
    const displayedTags = sortedTags.length;

    let markdown = `# 🏷️ Tags统计报告

> 生成时间: ${new Date().toLocaleString('zh-CN')}
> 总标签数: ${totalTags} | 显示标签数: ${displayedTags}
> 总文件数: ${totalMarkdownFiles}
> 筛选条件: 文件数量 ≥ ${config.showAllTags ? '0' : config.minTagCount}

## 📊 统计概览

| 标签 | 文件数量 | 使用率 |
|------|----------|--------|
`;

    // 添加表格内容
    for (const tag of sortedTags) {
        const stats = filteredTagStats[tag];
        const usageRate = ((stats.count / totalMarkdownFiles) * 100).toFixed(1);
        markdown += `| #${tag} | ${stats.count} | ${usageRate}% |\n`;
    }

    // 添加详细列表
    markdown += `\n## 📝 详细标签列表\n\n`;

    for (const tag of sortedTags) {
        const stats = filteredTagStats[tag];

        // 截断文件列表
        const displayFiles = config.showAllFiles
            ? stats.files
            : stats.files.slice(0, config.maxFilesPerTag);
        const hasMoreFiles = !config.showAllFiles && stats.files.length > config.maxFilesPerTag;

        markdown += `### #${tag} (${stats.count}个文件)

**相关文件:**
${displayFiles.map(file => `- [[${file}]]`).join('\n')}${hasMoreFiles ? `\n- ... 还有 ${stats.files.length - config.maxFilesPerTag} 个文件` : ''}

---
`;
    }

    return markdown;
}

// 主函数：生成tags统计报告
async function main() {
    try {
        new Notice("正在统计tags使用情况...", 2000);

        // 获取配置
        const config = parseConfig();
        console.log('使用配置:', config);

        // 收集统计数据
        const tagStats = collectTagStatistics();

        if (Object.keys(tagStats).length === 0) {
            new Notice("未找到任何tags", 3000);
            return;
        }

        // 生成报告内容
        const reportContent = generateMarkdownReport(tagStats, config);

        // 生成带时间戳的文件名
        const outputFilename = generateTimestampedFilename();
        const outputFile = OUTPUT_PATH + outputFilename;

        // 创建新文件（每次生成新文件，避免覆盖历史记录）
        await app.vault.create(outputFile, reportContent);

        new Notice(`✅ Tags统计报告已生成: ${outputFilename}`, 4000);

    } catch (error) {
        const errorMessage = `生成Tags统计报告时出错: ${(error as Error).message}`;
        new Notice(errorMessage, 5000);
        console.error(errorMessage, error);
    }
}

// 导出 invoke 函数，供 fix-require-modules 插件调用
export async function invoke() {
    await main();
}
