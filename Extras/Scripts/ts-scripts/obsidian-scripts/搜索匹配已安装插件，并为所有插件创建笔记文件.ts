/*
- Author: oldwinter + AI assistant
- Create Time: 2025-08-17
- Description: 
-  从 .obsidian/plugins 下读取所有已安装插件的 manifest.json，提取 {id, name}。
-  规则：
-   1) 先用 name 匹配库内文件（按文件名不含后缀的 basename 比较，忽略大小写）。
-      若匹配到，则在该文件 frontmatter.aliases 中新增 id（若不存在）。
-   2) 若未命中，再用 id 匹配库内文件；若匹配到，则在 frontmatter.aliases 中新增 name（若不存在）。
-   3) 若两者都未匹配，跳过。
-  运行后会在库根目录生成一份报告 Markdown 文件，记录三类结果：by-name、by-id、unmatched。
- Note: 需要在桌面端或有权限读取 .obsidian 目录时运行。
- Version: 1.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;

type PluginInfo = { id: string; name: string; dir: string };
type MatchResult = {
    plugin: PluginInfo;
    filePath: string;
    addedAlias?: string; // 实际新增的 alias 值
    alreadyHad?: boolean; // alias 已存在
};

const PLUGINS_DIR = ".obsidian/plugins";
const CATEGORY_TO_ENSURE = "[[obsidian插件 - fileclass]]";

function normalizeKey(value: string | undefined | null): string {
    return (value ?? "").trim().toLowerCase();
}

function ensureArrayAliases(fm: any): string[] {
    const val = fm.aliases;
    if (!val) return [];
    if (Array.isArray(val)) return [...val];
    if (typeof val === "string" && val.trim().length > 0) return [val.trim()];
    return [];
}

function ensureArrayCategories(fm: any): string[] {
    const val = fm.分类;
    if (!val) return [];
    if (Array.isArray(val)) return [...val];
    if (typeof val === "string" && val.trim().length > 0) return [val.trim()];
    return [];
}

async function readAllPluginManifests(): Promise<PluginInfo[]> {
    const adapter = app?.vault?.adapter;
    const results: PluginInfo[] = [];
    if (!adapter?.list) return results;
    try {
        const listRes = await adapter.list(PLUGINS_DIR);
        const pluginDirs = listRes?.folders || [];
        for (const dir of pluginDirs) {
            const manifestPath = `${dir.replace(/\\/g, "/")}/manifest.json`;
            try {
                const raw = await adapter.read(manifestPath);
                const json = JSON.parse(raw || "{}");
                const id = json?.id;
                const name = json?.name;
                if (typeof id === "string" && typeof name === "string" && id && name) {
                    results.push({ id, name, dir });
                }
            } catch {
                // ignore single manifest error
            }
        }
    } catch (e) {
        console.warn("读取插件列表失败：", e);
    }
    return results;
}

function indexVaultMarkdownFiles(): Map<string, any> {
    // key: normalized basename, val: TFile
    const map = new Map<string, any>();
    const files = app?.vault?.getFiles?.() || [];
    for (const f of files) {
        try {
            if (f.extension?.toLowerCase() !== "md") continue;
            const base = (f.basename ?? f.name?.replace(/\.md$/i, "")) || "";
            const key = normalizeKey(base);
            if (!map.has(key)) map.set(key, f);
        } catch { }
    }
    return map;
}

async function addAliasAndCategoryToFile(
    file: any,
    aliasToAdd: string,
    categoryToEnsure: string
): Promise<{ aliasAdded: boolean; aliasAlreadyHad: boolean; categoryAdded: boolean; categoryAlreadyHad: boolean }> {
    return new Promise((resolve) => {
        app.fileManager.processFrontMatter(file, (fm: any) => {
            const aliases = ensureArrayAliases(fm);
            const exists = aliases.some((a) => normalizeKey(a) === normalizeKey(aliasToAdd));
            let aliasAdded = false;
            let aliasAlreadyHad = false;
            if (exists) {
                fm.aliases = aliases; // 保持现状
                aliasAlreadyHad = true;
            } else {
                fm.aliases = [...aliases, aliasToAdd];
                aliasAdded = true;
            }

            const categories = ensureArrayCategories(fm);
            const hasCategory = categories.some((c) => normalizeKey(c) === normalizeKey(categoryToEnsure));
            let categoryAdded = false;
            let categoryAlreadyHad = false;
            if (hasCategory) {
                fm.分类 = categories;
                categoryAlreadyHad = true;
            } else {
                fm.分类 = [...categories, categoryToEnsure];
                categoryAdded = true;
            }

            resolve({ aliasAdded, aliasAlreadyHad, categoryAdded, categoryAlreadyHad });
        });
    });
}

function sanitizeFileName(name: string): string {
    const replaced = name.replace(/[\\/:*?"<>|]/g, "-").trim();
    return replaced.length === 0 ? "untitled" : replaced;
}

function ensureUniqueRootPath(basename: string, fileIndex: Map<string, any>): string {
    const base = sanitizeFileName(basename);
    const tryKey = (name: string) => normalizeKey(name);
    let candidate = base;
    let suffix = 1;
    while (fileIndex.has(tryKey(candidate))) {
        suffix += 1;
        candidate = `${base} ${suffix}`;
    }
    return `${candidate}.md`;
}

async function createNoteForPlugin(plugin: PluginInfo, fileIndex: Map<string, any>): Promise<{ filePath: string } | null> {
    try {
        const path = ensureUniqueRootPath(plugin.name, fileIndex);
        const frontmatterLines = [
            "---",
            `aliases:\n  - ${plugin.id}`,
            `分类:\n  - "${CATEGORY_TO_ENSURE}"`,
            "---",
            "",
        ];
        const body = `# ${plugin.name}\n\n> 来自插件 manifest 的占位笔记。`;
        const content = frontmatterLines.join("\n") + body + "\n";
        const created = await app.vault.create(path, content);
        const base = created?.basename ?? plugin.name;
        fileIndex.set(normalizeKey(base), created);
        return { filePath: created?.path ?? path };
    } catch (e) {
        console.error("创建笔记失败", plugin, e);
        return null;
    }
}

function buildReportMarkdown(params: {
    matchedByName: (MatchResult & { categoryAdded?: boolean; categoryAlreadyHad?: boolean })[];
    matchedById: (MatchResult & { categoryAdded?: boolean; categoryAlreadyHad?: boolean })[];
    created: MatchResult[];
}): string {
    const { matchedByName, matchedById, created } = params;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const lines: string[] = [];
    lines.push(`# Obsidian 插件 aliases 同步报告`);
    lines.push(`- 生成时间: ${ts}`);
    lines.push("");
    lines.push(`## 规则`);
    lines.push(`1. 用插件 name 匹配库内 Markdown 文件（按 basename，忽略大小写），命中则在该文件 frontmatter.aliases 新增插件 id。`);
    lines.push(`2. 若未命中，再用插件 id 匹配，命中则新增别名为插件 name。`);
    lines.push(`3. 二者都不命中则在根目录创建以 name 命名的笔记，并设置 aliases 为 id，且统一确保分类包含 ${CATEGORY_TO_ENSURE}。`);
    lines.push("");

    const section = (title: string, items: (MatchResult & { categoryAdded?: boolean; categoryAlreadyHad?: boolean })[], aliasLabel: string) => {
        lines.push(`## ${title} (${items.length})`);
        if (items.length === 0) {
            lines.push(`- 无`);
            lines.push("");
            return;
        }
        for (const it of items) {
            const aliasText = it.alreadyHad ? `alias: 已存在` : `新增 ${aliasLabel}: ${it.addedAlias}`;
            const categoryText = it.categoryAlreadyHad ? `分类: 已存在` : `分类: 新增 ${CATEGORY_TO_ENSURE}`;
            lines.push(`- ${it.plugin.name} (${it.plugin.id}) → \`${it.filePath}\` [[${it.filePath}]]（${aliasText}；${categoryText}）`);
        }
        lines.push("");
    };

    section("按 name 匹配", matchedByName, "id");
    section("按 id 匹配", matchedById, "name");

    lines.push(`## 新建笔记 (${created.length})`);
    if (created.length === 0) {
        lines.push(`- 无`);
    } else {
        for (const it of created) {
            const aliasText = it.alreadyHad ? `alias: 已存在` : `新增 alias: ${it.addedAlias}`;
            const categoryText = (it as any).categoryAlreadyHad ? `分类: 已存在` : `分类: 新增 ${CATEGORY_TO_ENSURE}`;
            lines.push(`- ${it.plugin.name} (${it.plugin.id}) → \`${it.filePath}\` [[${it.filePath}]]（${aliasText}；${categoryText}）`);
        }
    }
    lines.push("");
    return lines.join("\n");
}

async function writeReportToRoot(content: string): Promise<string | null> {
    try {
        const baseName = `∑ plugin-aliases-sync-report`;
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
        const path = `${baseName} ${stamp}.md`;
        const created = await app.vault.create(path, content);
        return created?.path ?? path;
    } catch (e) {
        console.error("写入报告失败", e);
        return null;
    }
}

async function main() {
    const plugins = await readAllPluginManifests();
    if (plugins.length === 0) {
        new Notice("未读取到任何插件 manifest.json", 3000);
        return;
    }

    const fileIndex = indexVaultMarkdownFiles();

    const matchedByName: (MatchResult & { categoryAdded?: boolean; categoryAlreadyHad?: boolean })[] = [];
    const matchedById: (MatchResult & { categoryAdded?: boolean; categoryAlreadyHad?: boolean })[] = [];
    const created: MatchResult[] = [];

    for (const p of plugins) {
        const nameKey = normalizeKey(p.name);
        const idKey = normalizeKey(p.id);

        let handled = false;
        const nameFile = fileIndex.get(nameKey);
        if (nameFile) {
            const { aliasAdded, aliasAlreadyHad, categoryAdded, categoryAlreadyHad } = await addAliasAndCategoryToFile(nameFile, p.id, CATEGORY_TO_ENSURE);
            matchedByName.push({ plugin: p, filePath: nameFile.path, addedAlias: p.id, alreadyHad: aliasAlreadyHad, categoryAdded, categoryAlreadyHad });
            handled = true;
        }

        if (!handled) {
            const idFile = fileIndex.get(idKey);
            if (idFile) {
                const { aliasAdded, aliasAlreadyHad, categoryAdded, categoryAlreadyHad } = await addAliasAndCategoryToFile(idFile, p.name, CATEGORY_TO_ENSURE);
                matchedById.push({ plugin: p, filePath: idFile.path, addedAlias: p.name, alreadyHad: aliasAlreadyHad, categoryAdded, categoryAlreadyHad });
                handled = true;
            }
        }

        if (!handled) {
            const createdRes = await createNoteForPlugin(p, fileIndex);
            if (createdRes) {
                created.push({ plugin: p, filePath: createdRes.filePath, addedAlias: p.id, alreadyHad: false });
            }
        }
    }

    const report = buildReportMarkdown({ matchedByName, matchedById, created });
    const reportPath = await writeReportToRoot(report);
    if (reportPath) {
        new Notice(`插件别名同步完成，报告已生成：${reportPath}`, 4000);
        console.log("插件别名同步报告:\n", report);
    } else {
        new Notice("插件别名同步完成，但报告写入失败（详见控制台）", 5000);
    }
}

// 导出 invoke
export async function invoke() {
    try {
        if (app?.workspace?.onLayoutReady) {
            app.workspace.onLayoutReady(main);
        } else {
            await main();
        }
    } catch (e) {
        console.error(e);
        new Notice("执行时发生错误，详见控制台", 5000);
    }
}


