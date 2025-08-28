/*
- Author: Sonic AI based on existing script patterns
- Create Time: 2024-12-19
- Description: 这个脚本用于统计当前Obsidian仓库中所有frontmatter属性的使用情况，
-            包括每个property的使用次数、值分布等，并生成一个总结报告。
-            脚本会扫描所有markdown文件，解析frontmatter中的properties，
-            然后生成一个包含详细统计信息的markdown文件。
-            【AI优化】: 支持参数化配置，默认只显示高频properties和限制值数量，
-            避免生成过长的报告内容，特别适合AI阅读和分析。
-            支持通过URL参数动态调整筛选条件。
- warning: 这个脚本的最前面，不能放任何文本，frontmatter也不行。
- Version: 1.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;

// --- 配置项 ---
const OUTPUT_FILENAME_BASE = "📊 Properties统计报告";
const OUTPUT_PATH = "/";  // 根目录

// AI优化配置 - 控制报告长度
const DEFAULT_MIN_PROPERTY_COUNT = 5;        // 默认只显示使用次数>=5的properties
const DEFAULT_MAX_VALUES_PER_PROPERTY = 10;   // 默认每个property最多显示10个不同值
const DEFAULT_MAX_FILES_PER_PROPERTY = 15;    // 默认每个property最多显示15个文件

// 运行时配置（可以通过参数传入）
interface Config {
    minPropertyCount: number;         // 最小property使用次数阈值
    maxValuesPerProperty: number;     // 每个property最多显示的不同值数量
    maxFilesPerProperty: number;      // 每个property最多显示的文件数
    showAllProperties: boolean;       // 是否显示所有properties（忽略minPropertyCount）
    showAllValues: boolean;          // 是否显示所有值（忽略maxValuesPerProperty）
    showAllFiles: boolean;           // 是否显示所有文件（忽略maxFilesPerProperty）
}
// --- END ---

interface PropertyStats {
    [property: string]: {
        count: number;                    // 使用次数
        files: string[];                  // 相关文件
        valueDistribution: { [value: string]: number }; // 值分布
        uniqueValues: number;             // 不同值的数量
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
        minPropertyCount: urlParams.minPropertyCount ? parseInt(urlParams.minPropertyCount) : DEFAULT_MIN_PROPERTY_COUNT,
        maxValuesPerProperty: urlParams.maxValuesPerProperty ? parseInt(urlParams.maxValuesPerProperty) : DEFAULT_MAX_VALUES_PER_PROPERTY,
        maxFilesPerProperty: urlParams.maxFilesPerProperty ? parseInt(urlParams.maxFilesPerProperty) : DEFAULT_MAX_FILES_PER_PROPERTY,
        showAllProperties: urlParams.showAllProperties === 'true',
        showAllValues: urlParams.showAllValues === 'true',
        showAllFiles: urlParams.showAllFiles === 'true'
    };
}

function normalizeValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) {
        return '[' + value.map(v => normalizeValue(v)).join(', ') + ']';
    }
    if (typeof value === 'object') {
        return '{' + Object.keys(value).join(', ') + '}';
    }
    return String(value);
}

function collectPropertyStatistics(): PropertyStats {
    const propertyStats: PropertyStats = {};
    const markdownFiles = app.vault.getMarkdownFiles();

    for (const file of markdownFiles) {
        try {
            // 获取文件缓存
            const cache = app.metadataCache.getFileCache(file);
            if (!cache || !cache.frontmatter) continue;

            // 统计每个property
            for (const [property, value] of Object.entries(cache.frontmatter)) {
                if (!propertyStats[property]) {
                    propertyStats[property] = {
                        count: 0,
                        files: [],
                        valueDistribution: {},
                        uniqueValues: 0
                    };
                }

                propertyStats[property].count++;
                if (!propertyStats[property].files.includes(file.path)) {
                    propertyStats[property].files.push(file.path);
                }

                // 统计值分布
                const normalizedValue = normalizeValue(value);
                if (!propertyStats[property].valueDistribution[normalizedValue]) {
                    propertyStats[property].valueDistribution[normalizedValue] = 0;
                }
                propertyStats[property].valueDistribution[normalizedValue]++;
                propertyStats[property].uniqueValues = Object.keys(propertyStats[property].valueDistribution).length;
            }
        } catch (error) {
            console.warn(`处理文件 ${file.path} 时出错:`, error);
        }
    }

    return propertyStats;
}

function generateMarkdownReport(propertyStats: PropertyStats, config: Config): string {
    // 筛选properties（根据配置）
    const filteredPropertyStats = Object.keys(propertyStats).reduce((filtered: PropertyStats, property) => {
        const stats = propertyStats[property];
        if (config.showAllProperties || stats.count >= config.minPropertyCount) {
            filtered[property] = stats;
        }
        return filtered;
    }, {});

    const sortedProperties = Object.keys(filteredPropertyStats).sort((a, b) => {
        // 首先按使用次数降序排序
        const countDiff = filteredPropertyStats[b].count - filteredPropertyStats[a].count;
        if (countDiff !== 0) return countDiff;
        // 如果使用次数相同，按属性名升序排序
        return a.localeCompare(b);
    });

    const totalMarkdownFiles = app.vault.getMarkdownFiles().length;
    const totalProperties = Object.keys(propertyStats).length;
    const displayedProperties = sortedProperties.length;

    let markdown = `# 📊 Properties统计报告

> 生成时间: ${new Date().toLocaleString('zh-CN')}
> 总属性数: ${totalProperties} | 显示属性数: ${displayedProperties}
> 总文件数: ${totalMarkdownFiles}
> 筛选条件: 使用次数 ≥ ${config.showAllProperties ? '0' : config.minPropertyCount}

## 📈 统计概览

| 属性名 | 使用次数 | 不同值数量 | 使用率 | 文件覆盖率 |
|--------|----------|------------|--------|------------|
`;

    // 添加表格内容
    for (const property of sortedProperties) {
        const stats = filteredPropertyStats[property];
        const usageRate = ((stats.count / totalMarkdownFiles) * 100).toFixed(1);
        const fileCoverage = ((stats.files.length / totalMarkdownFiles) * 100).toFixed(1);
        markdown += `| \`${property}\` | ${stats.count} | ${stats.uniqueValues} | ${usageRate}% | ${fileCoverage}% |\n`;
    }

    // 添加详细列表
    markdown += `\n## 📝 详细属性列表\n\n`;

    for (const property of sortedProperties) {
        const stats = filteredPropertyStats[property];

        // 截断文件列表
        const displayFiles = config.showAllFiles
            ? stats.files
            : stats.files.slice(0, config.maxFilesPerProperty);
        const hasMoreFiles = !config.showAllFiles && stats.files.length > config.maxFilesPerProperty;

        // 截断值分布
        const sortedValues = Object.entries(stats.valueDistribution)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, config.showAllValues ? undefined : config.maxValuesPerProperty);

        const hasMoreValues = !config.showAllValues && Object.keys(stats.valueDistribution).length > config.maxValuesPerProperty;

        markdown += `### \`${property}\` (${stats.count}次使用, ${stats.uniqueValues}个不同值)

**使用文件:**
${displayFiles.map(file => `- [[${file}]]`).join('\n')}${hasMoreFiles ? `\n- ... 还有 ${stats.files.length - config.maxFilesPerProperty} 个文件` : ''}

**值分布:**
${sortedValues.map(([value, count]) => `- \`${value}\`: ${count}次`).join('\n')}${hasMoreValues ? `\n- ... 还有 ${Object.keys(stats.valueDistribution).length - config.maxValuesPerProperty} 个其他值` : ''}

---
`;
    }

    return markdown;
}

// 主函数：生成properties统计报告
async function main() {
    try {
        new Notice("正在统计properties使用情况...", 2000);

        // 获取配置
        const config = parseConfig();
        console.log('使用配置:', config);

        // 收集统计数据
        const propertyStats = collectPropertyStatistics();

        if (Object.keys(propertyStats).length === 0) {
            new Notice("未找到任何properties", 3000);
            return;
        }

        // 生成报告内容
        const reportContent = generateMarkdownReport(propertyStats, config);

        // 生成带时间戳的文件名
        const outputFilename = generateTimestampedFilename();
        const outputFile = OUTPUT_PATH + outputFilename;

        // 创建新文件（每次生成新文件，避免覆盖历史记录）
        await app.vault.create(outputFile, reportContent);

        new Notice(`✅ Properties统计报告已生成: ${outputFilename}`, 4000);

    } catch (error) {
        const errorMessage = `生成Properties统计报告时出错: ${(error as Error).message}`;
        new Notice(errorMessage, 5000);
        console.error(errorMessage, error);
    }
}

// 导出 invoke 函数，供 fix-require-modules 插件调用
export async function invoke() {
    await main();
}





