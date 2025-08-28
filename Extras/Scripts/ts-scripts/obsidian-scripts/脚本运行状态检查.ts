/*
  CodeScript Toolkit - 脚本运行状态检查
  用于验证脚本是否能正常运行，检查基本的导入和功能
*/

declare const app: App;

function createLogger() {
    return (...args: unknown[]) => {
        console.log('[状态检查]', ...args);
        // @ts-ignore
        new (window as any).Notice(String(args[0] ?? ''), 2000);
    };
}

export async function invoke(app: App): Promise<void> {
    const log = createLogger();

    try {
        log('🔍 开始脚本运行状态检查');

        // 1. 检查基础环境
        log('📊 检查基础环境...');
        log(`🏰 Vault: ${app.vault.getName()}`);
        log(`📄 文件数量: ${app.vault.getFiles().length}`);

        // 2. 检查模块导入
        log('📦 检查模块导入...');
        try {
            const obsidian = require('obsidian');
            log('✅ obsidian 模块导入成功');
        } catch (error) {
            log(`❌ obsidian 模块导入失败: ${error.message}`);
        }

        try {
            const obsidianApp = require('obsidian/app');
            log('✅ obsidian/app 模块导入成功');
        } catch (error) {
            log(`❌ obsidian/app 模块导入失败: ${error.message}`);
        }

        // 3. 检查全局对象
        log('🌐 检查全局对象...');
        // @ts-ignore
        if (window.Notice) {
            log('✅ Notice 全局对象可用');
        } else {
            log('❌ Notice 全局对象不可用');
        }

        // @ts-ignore
        if (window.Modal) {
            log('✅ Modal 全局对象可用');
        } else {
            log('❌ Modal 全局对象不可用');
        }

        // @ts-ignore
        if (window.Plugin) {
            log('✅ Plugin 全局对象可用');
        } else {
            log('❌ Plugin 全局对象不可用');
        }

        // 4. 检查 registerTempPlugin 函数
        log('🔌 检查插件注册功能...');
        // @ts-ignore
        if (window.registerTempPlugin) {
            log('✅ registerTempPlugin 函数可用');
        } else {
            log('❌ registerTempPlugin 函数不可用');
        }

        // 5. 测试创建简单通知
        log('🔔 测试通知功能...');
        try {
            // @ts-ignore
            new (window as any).Notice('状态检查测试通知', 3000);
            log('✅ 通知创建成功');
        } catch (error) {
            log(`❌ 通知创建失败: ${error.message}`);
        }

        // 6. 脚本列表
        log('📋 可用的示例脚本:');
        const scripts = [
            '基础功能示例.ts',
            'Obsidian API 交互示例.ts',
            '文件操作示例.ts',
            'UI 交互示例.ts (修复版 - 专注通知功能)',
            '插件开发示例.ts'
        ];

        scripts.forEach((script, index) => {
            log(`  ${index + 1}. ${script}`);
        });

        // 7. 测试脚本加载
        log('🔍 测试脚本加载情况...');
        const testScripts = [
            './基础功能示例.ts',
            './Obsidian API 交互示例.ts',
            './文件操作示例.ts (修复版 - 更安全的文件操作)',
            './UI 交互示例.ts (修复版 - 专注通知功能)',
            './插件开发示例.ts'
        ];

        for (let i = 0; i < testScripts.length; i++) {
            const scriptPath = testScripts[i].split(' ')[0]; // 移除描述部分
            try {
                const script = require(scriptPath);
                if (script.invoke && typeof script.invoke === 'function') {
                    log(`✅ ${testScripts[i]} 加载成功`);
                } else {
                    log(`⚠️ ${testScripts[i]} 加载成功但缺少 invoke 函数`);
                }
            } catch (error) {
                log(`❌ ${testScripts[i]} 加载失败: ${error.message}`);
            }
        }

        // 8. 检查 CodeScript Toolkit 特殊功能
        log('🔧 检查 CodeScript Toolkit 特殊功能...');

        // 检查 registerTempPlugin 函数
        if (typeof (window as any).registerTempPlugin !== 'undefined') {
            log('✅ registerTempPlugin 函数可用');
        } else {
            log('❌ registerTempPlugin 函数不可用');
            log('💡 这可能是导致插件开发示例失败的原因');
        }

        // 检查其他可能的全局函数
        const toolkitFunctions = ['require', 'requireAsync', 'requireAsyncWrapper'];
        toolkitFunctions.forEach(funcName => {
            if (typeof (window as any)[funcName] !== 'undefined') {
                log(`✅ ${funcName} 函数可用`);
            } else {
                log(`❌ ${funcName} 函数不可用`);
            }
        });

        log('🎉 状态检查完成！');
        log('💡 如果看到大量 ✅ 表示环境配置正确');

    } catch (error) {
        console.error('[状态检查] 执行失败:', error);
        // @ts-ignore
        new (window as any).Notice(`状态检查失败: ${error.message}`, 5000);
        throw error;
    }
}
