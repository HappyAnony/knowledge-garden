/*
- Author: Sonic AI based on existing script patterns
- Create Time: 2025-08-22
- Description: 生成当前操作系统（优先 macOS，兼容 Windows）已安装第三方应用的统计报告。
-            会扫描系统应用列表，与库内已有笔记（按文件名或 frontmatter.title 匹配）进行比对，
-            生成一个 Markdown 报告，包含：
-            1) 已安装且已有笔记；2) 已安装但没有笔记。笔记使用 [[双链]] 格式。
- warning: 这个脚本的最前面，不能放任何文本，frontmatter也不行。
- Version: 1.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;
// Node 全局声明以避免类型问题（实际运行由桌面端提供）
declare const process: any;
declare const Buffer: any;

// Node 能力（Obsidian 桌面端可用）
// 通过 window.require 获取，以避免打包器处理
const nodeRequire: any = (typeof window !== 'undefined' && (window as any).require)
    ? (window as any).require
    : undefined;

// --- 配置项 ---
const OUTPUT_FILENAME_BASE = "🧰 已安装应用统计报告";
const OUTPUT_PATH = "/";  // 根目录

// AI优化配置 - 控制报告长度
const DEFAULT_INCLUDE_SYSTEM_APPS = false;   // 默认排除系统内置（macOS: com.apple.* 或 /System/Applications）
const DEFAULT_MAX_ITEMS_PER_SECTION = 200;   // 每个列表最多展示的应用数量（避免超长）

// 运行时配置（可以通过参数传入）
interface Config {
    includeSystemApps: boolean;       // 是否包含系统内置应用
    maxItemsPerSection: number;       // 每个分区最多显示的条数
    showAll: boolean;                 // 是否忽略限制展示全部
}
// --- END ---

interface InstalledAppInfo {
    name: string;
    path?: string;
    bundleId?: string;
    isAppleSystem?: boolean;
    source: 'macos' | 'windows' | 'unknown';
}

interface MatchResult {
    installedWithNote: Array<{ app: InstalledAppInfo; notePath: string }>; // 已安装且已有笔记
    installedWithoutNote: InstalledAppInfo[];                               // 已安装但没有笔记
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
        if (typeof window !== 'undefined' && (window as any).location) {
            const url = new URL((window as any).location.href);
            url.searchParams.forEach((value, key) => {
                urlParams[key] = value;
            });
        }
    } catch (e) {
        console.log('无法获取URL参数，使用默认配置');
    }

    return {
        includeSystemApps: urlParams.includeSystemApps === 'true' ? true : DEFAULT_INCLUDE_SYSTEM_APPS,
        maxItemsPerSection: urlParams.maxItemsPerSection ? parseInt(urlParams.maxItemsPerSection) : DEFAULT_MAX_ITEMS_PER_SECTION,
        showAll: urlParams.showAll === 'true'
    };
}

function normalizeAppName(name: string): string {
    return String(name || '')
        .replace(/\.app$/i, '')
        .trim()
        .toLowerCase();
}

function execShell(command: string): string {
    if (!nodeRequire) return '';
    try {
        const { execSync } = nodeRequire('child_process');

        // Windows平台特殊处理
        if (detectPlatform() === 'windows') {
            // 使用chcp 65001设置UTF-8编码，然后执行命令
            const windowsCommand = `chcp 65001 >nul && ${command}`;
            const output = execSync(windowsCommand, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                shell: 'cmd.exe'
            });
            return output;
        } else {
            // macOS/Linux使用默认处理
            const output = execSync(command, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            });
            return output;
        }
    } catch (e) {
        console.warn('执行命令失败:', command, e);
        return '';
    }
}

function listMacOSApps(): InstalledAppInfo[] {
    const results: InstalledAppInfo[] = [];
    if (!nodeRequire) return results;

    const pathCandidates = [
        '/Applications',
        '/System/Applications',
        `${process.env.HOME || ''}/Applications`
    ].filter(Boolean);

    const { readdirSync, statSync } = nodeRequire('fs');
    const { join } = nodeRequire('path');

    for (const base of pathCandidates) {
        let entries: string[] = [];
        try {
            entries = readdirSync(base);
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.toLowerCase().endsWith('.app')) continue;
            const fullPath = join(base, entry);
            try {
                const st = statSync(fullPath);
                if (!st.isDirectory()) continue;
            } catch {
                continue;
            }

            const name = entry.replace(/\.app$/i, '');
            let bundleId = '';
            try {
                const raw = execShell(`mdls -name kMDItemCFBundleIdentifier -raw ${JSON.stringify(fullPath)}`);
                bundleId = String(raw || '').trim();
            } catch { }

            const isAppleSystem = (fullPath.startsWith('/System/Applications')) || (bundleId.startsWith('com.apple.'));

            results.push({
                name,
                path: fullPath,
                bundleId: bundleId || undefined,
                isAppleSystem,
                source: 'macos'
            });
        }
    }

    // 去重（同名应用按优先路径保留一条）
    const seen = new Set<string>();
    const deduped: InstalledAppInfo[] = [];
    for (const appInfo of results) {
        const key = normalizeAppName(appInfo.name);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(appInfo);
    }
    return deduped;
}

function listWindowsApps(): InstalledAppInfo[] {
    if (!nodeRequire) return [];

    // 方法1：使用改进的PowerShell命令，指定UTF-8编码输出
    const cmd1 = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-StartApps | Select-Object -ExpandProperty Name | Sort-Object -Unique } Catch { $Error.Clear() }"`;
    let out = execShell(cmd1);

    // 方法2：如果方法1失败，尝试使用chcp设置编码
    if (!out.trim()) {
        const cmd2 = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Try { chcp 65001 | Out-Null; Get-StartApps | Select-Object -ExpandProperty Name | Sort-Object -Unique } Catch { $Error.Clear() }"`;
        out = execShell(cmd2);
    }

    // 方法3：如果方法2也失败，使用最基础的命令
    if (!out.trim()) {
        const cmd3 = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-StartApps | Select-Object -ExpandProperty Name | Sort-Object -Unique"`;
        out = execShell(cmd3);
    }

    // 如果所有方法都失败，返回空数组
    if (!out.trim()) {
        console.warn('无法获取Windows应用列表');
        return [];
    }

    const lines = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return processWindowsAppNames(lines);
}

// 新增：处理Windows应用名称，修复常见的中文乱码
function processWindowsAppNames(appNames: string[]): InstalledAppInfo[] {
    const apps: InstalledAppInfo[] = [];
    const encodingFixes: Array<{ original: string; fixed: string }> = [];

    for (const name of appNames) {
        // 修复常见的中文乱码
        const fixedName = fixChineseEncoding(name);

        // 记录编码修复信息
        if (fixedName !== name) {
            encodingFixes.push({ original: name, fixed: fixedName });
        }

        apps.push({ name: fixedName, source: 'windows' });
    }

    // 如果有编码修复，输出调试信息
    if (encodingFixes.length > 0) {
        console.log(`检测到 ${encodingFixes.length} 个应用名称进行了编码修复:`);
        encodingFixes.forEach(({ original, fixed }) => {
            console.log(`  "${original}" → "${fixed}"`);
        });
    }

    // 去重
    const seen = new Set<string>();
    const deduped: InstalledAppInfo[] = [];
    for (const appInfo of apps) {
        const key = normalizeAppName(appInfo.name);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(appInfo);
    }
    return deduped;
}

// 新增：修复常见的中文乱码
function fixChineseEncoding(text: string): string {
    if (!text) return text;

    // 检测是否包含乱码字符（非ASCII、非中文字符）
    const hasGarbledChars = /[^\x00-\x7F\u4e00-\u9fff\s\-\(\)\[\]\.]/.test(text);
    if (!hasGarbledChars) {
        return text; // 没有乱码，直接返回
    }

    // 常见的中文乱码映射（基于实际观察到的乱码）
    const encodingFixes: { [key: string]: string } = {
        'ٴ': '快速创建',
        '': '管理器',
        '': '管理器',
        '': '数据源',
        'Ƥ': '皮肤管理器',
        'ʾ': '命令行提示符',
        '칫׼': '办公软件',
        'ڴ': '内存诊断',
        'ȫ': '安全中心',
        '': '设置',
        'ϵͳϢ': '系统信息',
        'ϵͳ': '系统工具',
        'ϸʿ': '详细信息',
        'жػ': '卸载程序',
        'ж': '卸载',
        'ж΢': '卸载微信',
        'ע༭': '注册表编辑器',
        '΢': '微信',
        '¼鿴': '事件查看器',
        'δ嵥': '开始菜单',
        'ٷվ': '官方网站',
        '߼ȫ Windows Defender ǽ': '高级安全 Windows Defender 防火墙',
        'ȡ': '获取帮助',
        'ƬŻ': '照片查看器优化工具',
        'ַӳ': '字符映射表',
        'Ѷ': '腾讯视频',
        'Դ': '资源监视器',
        '': '帮助',
        'ذȫ': '本地安全策略',
        'ްȫ': '本地安全策略',
        '뷨޸': '输入法修改器',
        '뷨': '输入法设置',
        '': '设置',
        ' Java': '下载 Java',
        ' Java.com': '下载 Java.com',
        '˿': '下载驱动程序',
        'ƻ': '下载苹果软件',
        '': '下载中心',
        '־': '下载日志',
        '': '下载管理',
        '': '下载设置',
        'ָ': '恢复环境',
        'ܼ': '加密文件系统',
        'ִ(Ԥ)': '高级用户执行(预览)',
        '༭': '高级用户编辑器',
        '': '高级用户设置'
    };

    let fixedText = text;

    // 应用修复
    for (const [garbled, correct] of Object.entries(encodingFixes)) {
        if (fixedText.includes(garbled)) {
            fixedText = fixedText.replace(new RegExp(garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
        }
    }

    // 如果修复后仍有乱码，尝试使用更通用的方法
    if (/[^\x00-\x7F\u4e00-\u9fff\s\-\(\)\[\]\.]/.test(fixedText)) {
        // 尝试移除或替换剩余的乱码字符
        fixedText = fixedText.replace(/[^\x00-\x7F\u4e00-\u9fff\s\-\(\)\[\]\.]/g, '');
        // 清理多余的空格
        fixedText = fixedText.replace(/\s+/g, ' ').trim();
    }

    return fixedText;
}

function detectPlatform(): 'macos' | 'windows' | 'unknown' {
    try {
        const platform = (typeof process !== 'undefined' ? process.platform : 'browser');
        if (platform === 'darwin') return 'macos';
        if (platform === 'win32') return 'windows';
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

function getInstalledApps(config: Config): InstalledAppInfo[] {
    const platform = detectPlatform();
    let apps: InstalledAppInfo[] = [];

    if (platform === 'macos') {
        apps = listMacOSApps();
        if (!config.includeSystemApps) {
            apps = apps.filter(a => !a.isAppleSystem);
        }
    } else if (platform === 'windows') {
        apps = listWindowsApps();
        // Windows 暂不区分系统/第三方，后续可用签名/发布者进一步过滤
    } else {
        console.warn('未识别的平台，返回空列表');
    }

    // 排序：按名称
    apps.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return apps;
}

function buildNoteTitleIndex(): Map<string, string> {
    // key: 规范化标题，value: 文件路径
    const index = new Map<string, string>();
    const markdownFiles = app.vault.getMarkdownFiles();
    for (const file of markdownFiles) {
        try {
            const basename = (file.basename || '').trim();
            if (basename) {
                index.set(normalizeAppName(basename), file.path);
            }

            const cache = app.metadataCache.getFileCache(file);
            const fmTitle = cache?.frontmatter?.title;
            if (fmTitle && typeof fmTitle === 'string') {
                const norm = normalizeAppName(fmTitle);
                if (!index.has(norm)) {
                    index.set(norm, file.path);
                }
            }

            // 兼容 aliases/alias，数组或字符串，参与匹配（忽略大小写）
            const fm = cache?.frontmatter as any;
            const rawAliases = fm?.aliases ?? fm?.alias;
            if (rawAliases) {
                const addAlias = (aliasValue: string) => {
                    const alias = String(aliasValue || '').trim();
                    if (!alias) return;
                    const normAlias = normalizeAppName(alias);
                    if (!index.has(normAlias)) {
                        index.set(normAlias, file.path);
                    }
                };
                if (Array.isArray(rawAliases)) {
                    for (const a of rawAliases) addAlias(a);
                } else if (typeof rawAliases === 'string') {
                    addAlias(rawAliases);
                }
            }
        } catch (err) {
            console.warn(`索引文件 ${file.path} 时出错:`, err);
        }
    }
    return index;
}

function matchAppsToNotes(installedApps: InstalledAppInfo[]): MatchResult {
    const noteIndex = buildNoteTitleIndex();
    const installedWithNote: Array<{ app: InstalledAppInfo; notePath: string }> = [];
    const installedWithoutNote: InstalledAppInfo[] = [];

    for (const appInfo of installedApps) {
        const key = normalizeAppName(appInfo.name);
        const notePath = noteIndex.get(key);
        if (notePath) {
            installedWithNote.push({ app: appInfo, notePath });
        } else {
            installedWithoutNote.push(appInfo);
        }
    }

    return { installedWithNote, installedWithoutNote };
}

function generateMarkdownReport(result: MatchResult, config: Config, platform: string): string {
    const totalInstalled = result.installedWithNote.length + result.installedWithoutNote.length;
    const limit = config.showAll ? Number.MAX_SAFE_INTEGER : config.maxItemsPerSection;

    let markdown = `# 🧰 已安装应用统计报告\n\n` +
        `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n` +
        `> 平台: ${platform}\n` +
        `> 总安装数: ${totalInstalled} | 已有关联笔记: ${result.installedWithNote.length} | 无笔记: ${result.installedWithoutNote.length}\n` +
        `> 筛选: 包含系统应用 = ${config.includeSystemApps ? '是' : '否'}；每区最多展示 = ${config.showAll ? '全部' : limit}\n`;

    // 添加编码状态提示
    if (platform === 'windows') {
        markdown += `> 编码处理: 已启用Windows中文乱码自动修复\n`;
    }

    markdown += `\n`;

    markdown += `## ✅ 已安装且已有笔记 (${result.installedWithNote.length})\n\n`;
    const withNoteDisplay = result.installedWithNote.slice(0, limit);
    for (const item of withNoteDisplay) {
        const details: string[] = [];
        if (item.app.bundleId) details.push(item.app.bundleId);
        if (item.app.path) details.push(item.app.path);
        const detailStr = details.length ? ` — ${details.join(' | ')}` : '';
        markdown += `- ${item.app.name} → [[${item.notePath}]]${detailStr}\n`;
    }
    if (result.installedWithNote.length > withNoteDisplay.length) {
        markdown += `- ... 还有 ${result.installedWithNote.length - withNoteDisplay.length} 个应用\n`;
    }

    markdown += `\n## 📝 已安装但没有笔记 (${result.installedWithoutNote.length})\n\n`;
    const withoutNoteDisplay = result.installedWithoutNote.slice(0, limit);
    for (const appInfo of withoutNoteDisplay) {
        const details: string[] = [];
        if (appInfo.bundleId) details.push(appInfo.bundleId);
        if (appInfo.path) details.push(appInfo.path);
        const detailStr = details.length ? ` — ${details.join(' | ')}` : '';
        markdown += `- [[${appInfo.name}]]${detailStr}\n`;
    }
    if (result.installedWithoutNote.length > withoutNoteDisplay.length) {
        markdown += `- ... 还有 ${result.installedWithoutNote.length - withoutNoteDisplay.length} 个应用\n`;
    }

    return markdown;
}

// 主函数
async function main() {
    try {
        new Notice("正在收集系统已安装应用...", 2000);

        const config = parseConfig();
        const platform = detectPlatform();
        console.log('使用配置:', config, '平台:', platform);

        const installedApps = getInstalledApps(config);
        if (installedApps.length === 0) {
            new Notice("未获取到已安装应用，或当前平台未适配", 4000);
            return;
        }

        const matchResult = matchAppsToNotes(installedApps);
        const reportContent = generateMarkdownReport(matchResult, config, platform);

        const outputFilename = generateTimestampedFilename();
        const outputFile = OUTPUT_PATH + outputFilename;
        await app.vault.create(outputFile, reportContent);

        new Notice(`✅ 已安装应用统计报告已生成: ${outputFilename}`, 4000);
    } catch (error) {
        const errorMessage = `生成已安装应用统计报告时出错: ${(error as Error).message}`;
        new Notice(errorMessage, 5000);
        console.error(errorMessage, error);
    }
}

// 导出 invoke 函数，供 fix-require-modules 插件调用
export async function invoke() {
    await main();
}


