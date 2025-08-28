/*
  该脚本用于在 CodeScript Toolkit 中运行，快速采集并打印 Obsidian API 的关键信息：
  - Vault 文件统计（总数、按扩展名计数、Top N 大文件）
  - 当前活动文件与其元数据缓存情况（frontmatter/links/embeds 等）
  - Workspace 打开的面板类型、Markdown/Canvas 窗口数量
  - 已启用插件列表（前若干项）

  使用方法：在 Obsidian 的 CodeScript Toolkit 中选择该脚本运行，查看控制台输出
*/

import type { App, TFile } from 'obsidian';

// 显式声明全局 app，避免类型丢失
declare const app: App;

const useNotice = false;

function createLogger() {
    return (...args: unknown[]) => {
        if (useNotice) {
            // @ts-ignore
            new (window as any).Notice(String(args[0] ?? ''));
        }
        console.log('[Obsidian API Info]', ...args);
    };
}

function countByExtension(files: TFile[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const file of files) {
        const ext = file.extension || '';
        stats[ext] = (stats[ext] ?? 0) + 1;
    }
    return stats;
}

function pickTopLargest(files: TFile[], topN: number): Array<{ path: string; size: number }> {
    const sortable: Array<{ path: string; size: number }> = files.map((f: TFile) => ({
        path: f.path,
        size: f.stat?.size ?? 0,
    }));
    sortable.sort((a, b) => b.size - a.size);
    return sortable.slice(0, Math.max(0, topN));
}

async function main(): Promise<void> {
    const log = createLogger();

    // Vault 概览
    const files: TFile[] = app.vault.getFiles();
    const byExt = countByExtension(files);
    const mdCount = byExt['md'] ?? 0;
    const canvasCount = byExt['canvas'] ?? 0;
    const total = files.length;
    const topLargest = pickTopLargest(files, 5);

    log('Vault 统计：', { totalFiles: total, byExtension: byExt, markdownCount: mdCount, canvasCount });
    log('Top 5 大文件：', topLargest);

    // Workspace 概览
    const activeFile: TFile | null = app.workspace.getActiveFile();
    const mdLeaves = app.workspace.getLeavesOfType('markdown');
    const canvasLeaves = app.workspace.getLeavesOfType('canvas');
    log('Workspace：', {
        activeFile: activeFile ? { path: activeFile.path } : null,
        markdownLeaves: mdLeaves.length,
        canvasLeaves: canvasLeaves.length,
    });

    // MetadataCache 概览（针对当前活动文件）
    if (activeFile) {
        const cache = app.metadataCache.getFileCache(activeFile);
        const frontmatterKeys = cache?.frontmatter ? Object.keys(cache.frontmatter) : [];
        const linksCount = cache?.links?.length ?? 0;
        const embedsCount = cache?.embeds?.length ?? 0;
        log('ActiveFile 元数据缓存：', {
            path: activeFile.path,
            frontmatterKeys,
            linksCount,
            embedsCount,
        });
    } else {
        log('当前无活动文件');
    }

    // 插件启用情况（已在扩展声明中为 App.plugins 增补了类型）
    const enabledPlugins = Array.from(app.plugins.enabledPlugins);
    log('已启用插件（最多前 20 项预览）：', enabledPlugins.slice(0, 20));
}

// CodeScript Toolkit 需要导出的入口函数
export async function invoke(): Promise<void> {
    try {
        await main();
    } catch (err) {
        console.error('[Obsidian API Info] 执行异常：', err);
        throw err;
    }
}


