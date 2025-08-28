/*
- Author: Gemini based on archive_note.md
- Create Time: 2024-12-19
- Description: 这个脚本用于将当前笔记的状态设置为 "archived"。
-            无论之前是什么状态，都会设置为 "archived"。
-            可以选择性地记录归档日期。
- warning: 这个脚本的最前面，不能放任何文本，frontmatter也不行，不然会被当做模版的一部分插入到笔记中。
- Version: 1.0
*/

// Obsidian 类型声明（仅用于 TypeScript 编译，运行时由 Obsidian 提供）
declare const app: any;
declare const Notice: any;

// --- 配置项 ---
const archiveStatus = "archived";
const archiveDateProperty = "archived_date";
const dateFormat = "YYYY-MM-DD";
// --- END ---

// 主函数：归档当前笔记
function main() {
    // 使用 Obsidian 官方 API 获取当前活动文件
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
        const notePath = activeFile.path;
        const noteName = activeFile.basename;

        app.fileManager.processFrontMatter(activeFile, (fm) => {
            try {
                // 设置归档状态
                fm.status = archiveStatus;

                // 记录归档日期（可选，取消注释即可启用）
                // fm[archiveDateProperty] = moment().format(dateFormat);

                new Notice(`笔记 "${noteName}" 已成功归档！`, 2500);
            } catch (e) {
                const errorMessage = `为笔记 "${noteName}" 设置归档状态时出错: ${(e as Error).message}`;
                new Notice(errorMessage, 5000);
                console.error(errorMessage);
            }
        });
    } else {
        new Notice("错误：无法找到当前文件。", 5000);
    }
}

// 导出 invoke 函数，供 fix-require-modules 插件调用
export async function invoke() {
    main();
}
