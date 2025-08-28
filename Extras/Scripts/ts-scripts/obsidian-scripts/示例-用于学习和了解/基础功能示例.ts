/*
  CodeScript Toolkit 基础功能示例
  演示基本的 require() 和 requireAsync() 使用方法
  展示如何导入内置模块、处理不同类型的模块
*/

// 显式声明全局 app，避免类型丢失
declare const app: App;

// 创建日志函数
function createLogger() {
    return (...args: unknown[]) => {
        console.log('[基础功能示例]', ...args);
        // @ts-ignore
        new (window as any).Notice(String(args[0] ?? ''));
    };
}

export async function invoke(app: App): Promise<void> {
    const log = createLogger();

    try {
        log('🚀 开始执行基础功能示例');

        // 1. 测试 obsidian 模块导入
        log('📦 测试 obsidian 模块导入...');
        const { Notice: ObsidianNotice, Modal, Setting } = require('obsidian');
        log('✅ obsidian 模块导入成功');

        // 2. 测试内置模块导入
        log('🔧 测试内置模块导入...');
        const obsidianApp = require('obsidian/app');
        log('✅ obsidian/app 模块导入成功');

        // 3. 测试 JSON 文件导入
        log('📄 测试 JSON 文件处理...');
        const packageJson = require('../package.json');
        log('📋 package.json 内容:', packageJson);

        // 4. 测试异步模块导入
        log('⚡ 测试异步模块导入...');
        const fs = await requireAsync('fs');
        log('✅ fs 模块异步导入成功');

        // 5. 测试模块缓存控制
        log('💾 测试模块缓存控制...');
        const testModule1 = require('./测试调试脚本查看console控制台.ts', { cacheInvalidationMode: 'always' });
        const testModule2 = require('./测试调试脚本查看console控制台.ts', { cacheInvalidationMode: 'never' });
        log('✅ 缓存控制测试完成');

        // 6. 演示不同模块类型的处理
        log('🎯 模块类型处理演示:');
        const jsModule = require('./基础功能示例.ts', { moduleType: 'jsTs' });
        log('✅ JavaScript/TypeScript 模块处理');

        // 7. 显示统计信息
        const vault = app.vault;
        const files = vault.getFiles();
        log(`📊 Vault 统计: ${files.length} 个文件`);

        log('🎉 基础功能示例执行完成！');

    } catch (error) {
        console.error('[基础功能示例] 执行失败:', error);
        // @ts-ignore
        new (window as any).Notice(`执行失败: ${error.message}`);
        throw error;
    }
}
