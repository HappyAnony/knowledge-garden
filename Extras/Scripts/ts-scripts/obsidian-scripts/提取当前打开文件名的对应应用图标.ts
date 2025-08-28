/*
- Author: AI Assistant  
- Create Time: 2025-08-26
- Description: 简化版macOS应用图标提取脚本，更加稳定可靠
- Version: 1.1-simplified
*/

// Obsidian 类型声明
declare const app: any;
declare const Notice: any;
declare const require: any;

// Node.js 模块
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 配置项
const ATTACHMENTS_DIR = "Extras/Attachments";
const ICON_PROPERTY = "icon";

// 主函数
async function main() {
    try {
        // 获取当前活动文件
        const activeFile = app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("请先打开一个文件", 3000);
            return;
        }

        const fileName = activeFile.basename;
        new Notice(`正在为 "${fileName}" 搜索应用图标...`, 2000);

        // 搜索应用
        const appPath = await findApplication(fileName);
        if (!appPath) {
            new Notice(`未找到应用 "${fileName}"`, 3000);
            return;
        }

        new Notice(`找到应用，正在提取图标...`, 2000);

        // 提取图标
        const iconPath = await extractIcon(appPath, fileName);
        if (!iconPath) {
            new Notice("图标提取失败", 3000);
            return;
        }

        // 添加到文件属性
        await addIconToFile(activeFile, iconPath);

        new Notice(`✅ 成功添加图标: ${path.basename(iconPath)}`, 4000);
        console.log(`图标已保存到: ${iconPath}`);

    } catch (error) {
        const errorMsg = `❌ 错误: ${(error as Error).message}`;
        new Notice(errorMsg, 5000);
        console.error(errorMsg, error);
    }
}

// 搜索应用程序
async function findApplication(appName: string): Promise<string | null> {
    try {
        // 常见应用路径
        const commonPaths = [
            `/Applications/${appName}.app`,
            `/System/Applications/${appName}.app`,
            `/Applications/Utilities/${appName}.app`
        ];

        // 检查常见路径
        for (const appPath of commonPaths) {
            if (fs.existsSync(appPath)) {
                console.log(`在常见路径找到应用: ${appPath}`);
                return appPath;
            }
        }

        // 使用mdfind搜索
        console.log(`使用mdfind搜索: ${appName}`);
        const searchCmd = `mdfind "kMDItemContentType == 'com.apple.application-bundle'" | grep -i "${appName}.app" | head -1`;
        const { stdout } = await execAsync(searchCmd);

        const foundPath = stdout.trim();
        if (foundPath && fs.existsSync(foundPath)) {
            console.log(`通过mdfind找到应用: ${foundPath}`);
            return foundPath;
        }

        // 更宽松的搜索
        const looseSearchCmd = `find /Applications -name "*${appName}*.app" -type d 2>/dev/null | head -1`;
        const { stdout: looseStdout } = await execAsync(looseSearchCmd);

        const looseFoundPath = looseStdout.trim();
        if (looseFoundPath && fs.existsSync(looseFoundPath)) {
            console.log(`通过宽松搜索找到应用: ${looseFoundPath}`);
            return looseFoundPath;
        }

        return null;

    } catch (error) {
        console.error('搜索应用时出错:', error);
        return null;
    }
}

// 提取应用图标
async function extractIcon(appPath: string, fileName: string): Promise<string | null> {
    try {
        // 确保输出目录存在
        const vaultPath = app.vault.adapter.basePath;
        const attachmentsFullPath = path.join(vaultPath, ATTACHMENTS_DIR);

        if (!fs.existsSync(attachmentsFullPath)) {
            fs.mkdirSync(attachmentsFullPath, { recursive: true });
            console.log(`创建目录: ${attachmentsFullPath}`);
        }

        const outputFileName = `${fileName}-icon.png`;
        const outputPath = path.join(attachmentsFullPath, outputFileName);

        // 方法1: 查找并转换icns文件
        const success = await tryExtractWithIconutil(appPath, outputPath);
        if (success) {
            return `${ATTACHMENTS_DIR}/${outputFileName}`;
        }

        // 方法2: 使用sips直接转换
        const sipsSuccess = await tryExtractWithSips(appPath, outputPath);
        if (sipsSuccess) {
            return `${ATTACHMENTS_DIR}/${outputFileName}`;
        }

        // 方法3: 复制默认图标位置
        const copySuccess = await tryCopyDefaultIcon(appPath, outputPath);
        if (copySuccess) {
            return `${ATTACHMENTS_DIR}/${outputFileName}`;
        }

        return null;

    } catch (error) {
        console.error('提取图标时出错:', error);
        return null;
    }
}

// 使用iconutil提取图标
async function tryExtractWithIconutil(appPath: string, outputPath: string): Promise<boolean> {
    try {
        console.log('尝试使用iconutil方法...');

        // 查找所有icns文件，并显示详细信息
        const findCmd = `find "${appPath}" -name "*.icns"`;
        const { stdout } = await execAsync(findCmd);

        const allIcnsFiles = stdout.trim().split('\n').filter(p => p.length > 0);
        console.log(`找到 ${allIcnsFiles.length} 个icns文件:`, allIcnsFiles);

        if (allIcnsFiles.length === 0) {
            console.log('未找到icns文件');
            return false;
        }

        // 优先选择主要图标文件
        let selectedIcns = null;
        const preferredNames = ['AppIcon.icns', 'icon.icns', 'app.icns'];

        for (const preferredName of preferredNames) {
            const found = allIcnsFiles.find(file => file.endsWith(preferredName));
            if (found) {
                selectedIcns = found;
                console.log(`选择优先图标: ${selectedIcns}`);
                break;
            }
        }

        // 如果没有找到优先图标，选择第一个
        if (!selectedIcns) {
            selectedIcns = allIcnsFiles[0];
            console.log(`选择第一个图标: ${selectedIcns}`);
        }

        // 检查文件大小
        const fileStats = fs.statSync(selectedIcns);
        console.log(`图标文件大小: ${fileStats.size} 字节`);

        // 创建临时iconset目录
        const tempDir = path.dirname(outputPath);
        const iconsetPath = path.join(tempDir, `temp-${Date.now()}.iconset`);

        // 转换为iconset
        const iconutilCmd = `iconutil -c iconset "${selectedIcns}" -o "${iconsetPath}"`;
        console.log(`执行命令: ${iconutilCmd}`);
        const { stderr } = await execAsync(iconutilCmd);

        if (stderr) {
            console.log(`iconutil警告/错误: ${stderr}`);
        }

        if (!fs.existsSync(iconsetPath)) {
            console.log('iconset创建失败');
            return false;
        }

        // 列出iconset中的所有文件
        const iconsetFiles = fs.readdirSync(iconsetPath);
        console.log(`iconset中的文件:`, iconsetFiles);

        // 找到最大的图标文件
        const iconFiles = iconsetFiles
            .filter((file: string) => file.endsWith('.png'))
            .sort((a: string, b: string) => {
                const aSize = parseInt(a.match(/(\d+)x/)?.[1] || '0');
                const bSize = parseInt(b.match(/(\d+)x/)?.[1] || '0');
                return bSize - aSize;
            });

        console.log(`PNG文件排序结果:`, iconFiles);

        if (iconFiles.length === 0) {
            console.log('iconset中没有找到png文件');
            fs.rmSync(iconsetPath, { recursive: true, force: true });
            return false;
        }

        // 复制最大的图标
        const largestIcon = iconFiles[0];
        const sourcePath = path.join(iconsetPath, largestIcon);
        const sourceStats = fs.statSync(sourcePath);
        console.log(`选择的图标: ${largestIcon}, 大小: ${sourceStats.size} 字节`);

        fs.copyFileSync(sourcePath, outputPath);

        // 验证输出文件
        if (fs.existsSync(outputPath)) {
            const outputStats = fs.statSync(outputPath);
            console.log(`输出文件大小: ${outputStats.size} 字节`);
        }

        // 清理临时文件
        fs.rmSync(iconsetPath, { recursive: true, force: true });

        console.log(`成功使用iconutil提取图标: ${largestIcon}`);
        return true;

    } catch (error) {
        console.log('iconutil方法失败:', error);
        return false;
    }
}

// 使用sips转换图标
async function tryExtractWithSips(appPath: string, outputPath: string): Promise<boolean> {
    try {
        console.log('尝试使用sips方法...');

        // 扩展的图标路径列表
        const iconPaths = [
            path.join(appPath, 'Contents/Resources/AppIcon.icns'),
            path.join(appPath, 'Contents/Resources/icon.icns'),
            path.join(appPath, 'Contents/Resources/app.icns'),
            path.join(appPath, 'Contents/Resources/Icon.icns'),
            path.join(appPath, 'Contents/Resources/application.icns')
        ];

        // 查找所有可能的图标文件
        console.log('检查常见图标路径:');
        for (const iconPath of iconPaths) {
            const exists = fs.existsSync(iconPath);
            console.log(`  ${iconPath}: ${exists ? '存在' : '不存在'}`);

            if (exists) {
                const stats = fs.statSync(iconPath);
                console.log(`    文件大小: ${stats.size} 字节`);

                console.log(`尝试转换: ${iconPath}`);

                // 尝试不同的sips命令
                const sipsCommands = [
                    `sips -s format png "${iconPath}" --out "${outputPath}" --resampleWidth 512`,
                    `sips -s format png "${iconPath}" --out "${outputPath}" --resampleHeight 512`,
                    `sips -s format png "${iconPath}" --out "${outputPath}"`
                ];

                for (const sipsCmd of sipsCommands) {
                    try {
                        console.log(`执行: ${sipsCmd}`);
                        const { stderr } = await execAsync(sipsCmd);

                        if (stderr && !stderr.includes('Warning')) {
                            console.log(`sips错误: ${stderr}`);
                            continue;
                        }

                        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
                            const outputStats = fs.statSync(outputPath);
                            console.log(`sips转换成功，输出文件大小: ${outputStats.size} 字节`);
                            return true;
                        }
                    } catch (cmdError) {
                        console.log(`sips命令失败: ${cmdError}`);
                        continue;
                    }
                }
            }
        }

        // 尝试查找其他图标文件
        console.log('查找其他图标文件...');
        const findOtherCmd = `find "${appPath}/Contents/Resources" -name "*.icns" 2>/dev/null`;
        try {
            const { stdout } = await execAsync(findOtherCmd);
            const otherIcnsFiles = stdout.trim().split('\n').filter(p => p.length > 0);

            console.log(`找到其他icns文件: ${otherIcnsFiles.length} 个`);

            for (const icnsFile of otherIcnsFiles.slice(0, 3)) { // 只尝试前3个
                if (!iconPaths.includes(icnsFile)) {
                    console.log(`尝试额外的icns文件: ${icnsFile}`);

                    const sipsCmd = `sips -s format png "${icnsFile}" --out "${outputPath}" --resampleWidth 512`;
                    try {
                        await execAsync(sipsCmd);

                        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
                            console.log(`成功使用额外文件转换`);
                            return true;
                        }
                    } catch (error) {
                        console.log(`额外文件转换失败: ${error}`);
                    }
                }
            }
        } catch (error) {
            console.log('查找其他icns文件失败:', error);
        }

        return false;

    } catch (error) {
        console.log('sips方法失败:', error);
        return false;
    }
}

// 复制默认图标
async function tryCopyDefaultIcon(appPath: string, outputPath: string): Promise<boolean> {
    try {
        console.log('尝试复制默认图标...');

        // 查找任何图标文件
        const findCmd = `find "${appPath}" \\( -name "*.png" -o -name "*.icns" -o -name "*.jpg" -o -name "*.jpeg" \\) -type f | head -1`;
        const { stdout } = await execAsync(findCmd);

        const iconFile = stdout.trim();
        if (iconFile && fs.existsSync(iconFile)) {
            // 如果是icns，尝试用sips转换；如果是其他格式，直接复制或转换
            if (iconFile.endsWith('.icns')) {
                const sipsCmd = `sips -s format png "${iconFile}" --out "${outputPath}" --resampleWidth 512`;
                await execAsync(sipsCmd);
            } else if (iconFile.endsWith('.png')) {
                fs.copyFileSync(iconFile, outputPath);
            } else {
                // jpg/jpeg转png
                const sipsCmd = `sips -s format png "${iconFile}" --out "${outputPath}"`;
                await execAsync(sipsCmd);
            }

            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
                console.log(`成功复制图标: ${iconFile}`);
                return true;
            }
        }

        return false;

    } catch (error) {
        console.log('复制默认图标失败:', error);
        return false;
    }
}

// 添加图标属性到文件
async function addIconToFile(file: any, iconPath: string): Promise<void> {
    try {
        await app.fileManager.processFrontMatter(file, (frontmatter: any) => {
            const iconFileName = path.basename(iconPath);
            frontmatter[ICON_PROPERTY] = `[[${iconFileName}]]`;
        });

        console.log(`成功添加图标属性到文件: ${file.path}`);

    } catch (error) {
        console.error('添加图标属性失败:', error);
        throw error;
    }
}

// 导出函数
export async function invoke() {
    await main();
}

// 兼容性检查
if (typeof app === 'undefined') {
    console.log("此脚本需要在Obsidian环境中运行");
}