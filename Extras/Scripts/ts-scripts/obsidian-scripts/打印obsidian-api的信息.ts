/*
- Author: oldwinter + AI assistant
- Create Time: 2025-08-17
- Description: 学习/探索 Obsidian API 的控制台打印脚本。
-            运行后在开发者工具（Ctrl/Cmd+Shift+I）控制台中打印常用模块的结构化信息，
-            包括 app、vault、workspace、metadataCache、fileManager、commands、plugins 等。
- warning: 文件开头不要放 frontmatter（YAML）或普通文本，避免被当作模版内容插入笔记。
- Version: 1.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;

// --- 配置项 ---
const MAX_FILE_PREVIEW = 10; // 预览显示的文件数量上限
const MAX_COMMAND_PREVIEW = 15; // 预览显示的命令数量上限
const MAX_KEYS_PREVIEW = 25; // 预览显示的对象键名数量上限
// --- END ---

// 工具：安全获取函数名/类型名
function getTypeName(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    const basic = typeof value;
    if (basic !== "object") return basic; // string/number/boolean/function/symbol/bigint
    const ctor = (value && value.constructor && value.constructor.name) || "Object";
    return ctor;
}

// 工具：仅罗列可枚举键，限制数量
function listKeysLimited(obj: any, limit = MAX_KEYS_PREVIEW): string[] {
    try {
        const keys = Object.keys(obj ?? {});
        return keys.slice(0, limit);
    } catch {
        return [];
    }
}

// 工具：打印分组（可折叠）
function groupLog(title: string, fn: () => void) {
    try {
        if ((console as any).groupCollapsed) {
            (console as any).groupCollapsed(title);
            fn();
            (console as any).groupEnd();
        } else {
            console.log(`\n===== ${title} =====`);
            fn();
        }
    } catch (e) {
        console.error(`打印分组失败: ${title}`, e);
    }
}

// 工具：简要打印对象形状
function printShape(label: string, obj: any) {
    const typeName = getTypeName(obj);
    const keys = listKeysLimited(obj);
    console.log(label, { type: typeName, keysPreview: keys, keysTotalApprox: keys.length >= MAX_KEYS_PREVIEW ? `${keys.length}+` : keys.length });
}

function printAppOverview() {
    groupLog("App 概览", () => {
        const platform = (app as any)?.platform ?? (app as any)?.isMobile ? "mobile" : "desktop";
        const version = (app as any)?.version ?? (app as any)?.appVersion;
        const vaultName = (app as any)?.vault?.getName?.();
        console.log("基本信息", { platform, version, vaultName });

        printShape("app 对象", app);
        printShape("app.vault", app?.vault);
        printShape("app.workspace", app?.workspace);
        printShape("app.metadataCache", app?.metadataCache);
        printShape("app.fileManager", app?.fileManager);
        printShape("app.commands", app?.commands);
        printShape("app.plugins", app?.plugins);
    });
}

function printVaultInfo() {
    const vault = app?.vault;
    if (!vault) return;
    groupLog("Vault（文件库）", () => {
        const name = vault.getName?.();
        const adapter = vault.adapter;
        const adapterType = getTypeName(adapter);
        const basePath = adapter?.getBasePath?.(); // Desktop FileSystemAdapter 独有
        const files = vault.getFiles?.() || [];
        const folders = vault.getAllLoadedFiles?.()?.filter?.((f: any) => f?.children) || [];
        console.log("基本信息", { name, adapterType, basePath, fileCount: files.length, folderCount: folders.length });

        const previewPaths = files.slice(0, MAX_FILE_PREVIEW).map((f: any) => f.path);
        console.log(`文件预览(前 ${MAX_FILE_PREVIEW})`, previewPaths);

        const cachedConfig = vault.getConfig?.();
        if (cachedConfig) {
            printShape("vault.getConfig()", cachedConfig);
        }
    });
}

function collectWorkspaceLeavesSummary() {
    const leaves: any[] = [];
    const openFilePaths: string[] = [];
    try {
        app?.workspace?.iterateAllLeaves?.((leaf: any) => {
            try {
                leaves.push({
                    viewType: leaf?.view?.getViewType?.(),
                    title: leaf?.view?.getDisplayText?.() ?? leaf?.getDisplayText?.(),
                });
                const file = leaf?.view?.file;
                if (file?.path) openFilePaths.push(file.path);
            } catch {}
        });
    } catch {}
    return { leaves, openFilePaths: Array.from(new Set(openFilePaths)) };
}

function printWorkspaceInfo() {
    const workspace = app?.workspace;
    if (!workspace) return;
    groupLog("Workspace（工作区/界面）", () => {
        const activeFile = workspace.getActiveFile?.();
        const activePath = activeFile?.path;
        const activeViewType = workspace.getActiveViewOfType ? (workspace.getActiveViewOfType as any).name : workspace.getActiveView?.()?.getViewType?.();
        const rootSplit = workspace.rootSplit;
        const hasLeft = !!workspace.leftSplit;
        const hasRight = !!workspace.rightSplit;
        const hasRibbon = !!workspace.ribbon;
        console.log("基本信息", { activePath, activeViewType, hasLeft, hasRight, hasRibbon, rootSplitType: getTypeName(rootSplit) });

        const { leaves, openFilePaths } = collectWorkspaceLeavesSummary();
        console.log("打开的叶子（leaves）预览", leaves.slice(0, MAX_FILE_PREVIEW));
        console.log("打开的文件路径（去重）", openFilePaths.slice(0, MAX_FILE_PREVIEW));
    });
}

function printMetadataInfo() {
    const metadataCache = app?.metadataCache;
    if (!metadataCache) return;
    groupLog("MetadataCache（元数据缓存）", () => {
        const activeFile = app?.workspace?.getActiveFile?.();
        if (activeFile) {
            const cache = metadataCache.getFileCache?.(activeFile);
            if (cache) {
                const fm = cache.frontmatter || {};
                const headings = (cache.headings || []).map((h: any) => ({ level: h.level, heading: h.heading })).slice(0, MAX_FILE_PREVIEW);
                const tags = (cache.tags || []).map((t: any) => t.tag).slice(0, MAX_FILE_PREVIEW);
                console.log("当前文件元数据", {
                    path: activeFile.path,
                    frontmatterKeys: Object.keys(fm),
                    headings,
                    tags,
                });
            } else {
                console.log("当前文件没有可用的元数据缓存（可能是新文件或未保存）");
            }
        }

        printShape("metadataCache 全局", metadataCache);
    });
}

function printFileManagerInfo() {
    const fm = app?.fileManager;
    if (!fm) return;
    groupLog("FileManager（文件管理）", () => {
        const proto = Object.getPrototypeOf(fm) || {};
        const methodNames = Object.getOwnPropertyNames(proto).filter((k) => typeof (fm as any)[k] === "function");
        console.log("方法预览", methodNames.slice(0, MAX_KEYS_PREVIEW));
        printShape("fileManager 对象", fm);
    });
}

function printCommandsInfo() {
    const commandsApi = app?.commands;
    if (!commandsApi) return;
    groupLog("Commands（命令）", () => {
        try {
            const all = commandsApi.listCommands?.() || [];
            const preview = all.slice(0, MAX_COMMAND_PREVIEW).map((c: any) => ({ id: c.id, name: c.name }));
            console.log("命令统计", { total: all.length, previewLimit: MAX_COMMAND_PREVIEW });
            console.table(preview);
        } catch (e) {
            console.warn("无法列出命令（API 可能变更）", e);
        }
        printShape("commands 对象", commandsApi);
    });
}

function printPluginsInfo() {
    const plugins = app?.plugins;
    if (!plugins) return;
    groupLog("Plugins（插件）", () => {
        try {
            const enabled: string[] = Array.from(plugins.enabledPlugins || []);
            const allIds: string[] = Object.keys(plugins.plugins || {});
            console.log("插件统计", { enabledCount: enabled.length, totalInstalled: allIds.length });
            console.log("已启用插件（前 20）", enabled.slice(0, 20));

            // 如果安装了 Dataview，可做一次轻量探测
            if (enabled.includes("dataview") || plugins.plugins?.dataview) {
                const dvApi = (app as any).plugins?.plugins?.dataview?.api;
                if (dvApi) {
                    printShape("Dataview API（存在则显示）", dvApi);
                }
            }
        } catch (e) {
            console.warn("无法读取插件信息", e);
        }
        printShape("plugins 对象", plugins);
    });
}

function printActiveFileQuickPeek() {
    const file = app?.workspace?.getActiveFile?.();
    if (!file) return;
    groupLog("ActiveFile（当前文件）", () => {
        const basic = { path: file.path, name: file.name, extension: file.extension, type: getTypeName(file) };
        console.log("基本信息", basic);
        // 仅显示少量属性，避免过多无关信息
        printShape("TFile 对象", file);
    });
}

function main() {
    // 确保 UI 布局完成后打印，避免部分模块未就绪
    const doPrint = () => {
        try {
            console.log("\n================ Obsidian API 概览（Explore）================");
            printAppOverview();
            printVaultInfo();
            printWorkspaceInfo();
            printActiveFileQuickPeek();
            printMetadataInfo();
            printFileManagerInfo();
            printCommandsInfo();
            printPluginsInfo();
            console.log("================ 结束（请展开分组查看详情）================\n");
            new Notice("已在控制台打印 Obsidian API 概览", 2000);
        } catch (e) {
            console.error("打印 Obsidian API 概览时出错", e);
            new Notice("打印 Obsidian API 概览时出错，详见控制台", 4000);
        }
    };

    try {
        if (app?.workspace?.onLayoutReady) {
            app.workspace.onLayoutReady(doPrint);
        } else {
            // 兜底：直接执行
            doPrint();
        }
    } catch {
        doPrint();
    }
}

// 导出 invoke 函数，供 fix-require-modules 等调用
export async function invoke() {
    main();
}


