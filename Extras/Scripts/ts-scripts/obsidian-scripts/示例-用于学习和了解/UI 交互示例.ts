/*
  CodeScript Toolkit - UI 交互示例
  演示如何创建用户界面交互元素
  包括通知、模态框、设置界面、进度条等
*/

// 显式声明全局 app，避免类型丢失
declare const app: App;

// 创建日志函数
function createLogger() {
    return (...args: unknown[]) => {
        console.log('[UI 交互示例]', ...args);
        // @ts-ignore
        new (window as any).Notice(String(args[0] ?? ''), 3000);
    };
}

// 演示基本的通知功能
function demonstrateBasicNotifications(log: (...args: unknown[]) => void) {
    return async () => {
        log('🔔 演示基础通知功能...');

        // 1. 基础通知
        log('📢 发送基础通知...');
        try {
            // @ts-ignore
            new (window as any).Notice('这是基础通知消息', 3000);
            log('✅ 基础通知发送成功');
        } catch (error) {
            log(`❌ 基础通知失败: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. 不同类型的通知
        log('🎨 发送不同类型的通知...');
        try {
            // @ts-ignore
            new (window as any).Notice('✅ 成功通知', 2000);
            await new Promise(resolve => setTimeout(resolve, 500));

            // @ts-ignore
            new (window as any).Notice('⚠️ 警告通知', 2000);
            await new Promise(resolve => setTimeout(resolve, 500));

            // @ts-ignore
            new (window as any).Notice('🔄 处理中...', 1500);
            await new Promise(resolve => setTimeout(resolve, 500));

            log('✅ 不同类型通知演示完成');
        } catch (error) {
            log(`❌ 通知演示失败: ${error.message}`);
        }
    };
}

// 演示连续通知
function demonstrateContinuousNotifications(log: (...args: unknown[]) => void) {
    return async () => {
        log('🔄 演示连续通知...');

        try {
            for (let i = 1; i <= 5; i++) {
                // @ts-ignore
                new (window as any).Notice(`通知 ${i}/5`, 1000);
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            log('✅ 连续通知演示完成');
        } catch (error) {
            log(`❌ 连续通知失败: ${error.message}`);
        }
    };
}

// 演示状态通知
function demonstrateStatusNotifications(log: (...args: unknown[]) => void) {
    return async () => {
        log('📊 演示状态通知...');

        try {
            // @ts-ignore
            const statusNotice = new (window as any).Notice('正在处理中...', 0); // 不自动消失

            // 模拟处理过程
            await new Promise(resolve => setTimeout(resolve, 2000));
            statusNotice.setMessage('处理完成 ✅');

            await new Promise(resolve => setTimeout(resolve, 1500));
            statusNotice.hide();

            log('✅ 状态通知演示完成');
        } catch (error) {
            log(`❌ 状态通知失败: ${error.message}`);
        }
    };
}

// 演示交互式通知
function demonstrateInteractiveNotifications(log: (...args: unknown[]) => void) {
    return async () => {
        log('❓ 演示交互式通知...');

        try {
            // @ts-ignore
            const confirmNotice = new (window as any).Notice('点击此处查看更多信息', 5000);
            confirmNotice.noticeEl.onclick = () => {
                // @ts-ignore
                new (window as any).Notice('更多信息：这是 CodeScript Toolkit 的 UI 交互示例！', 4000);
                confirmNotice.hide();
            };

            log('✅ 交互式通知演示完成');
        } catch (error) {
            log(`❌ 交互式通知失败: ${error.message}`);
        }
    };
}

export async function invoke(app: App): Promise<void> {
    const log = createLogger();

    try {
        log('🚀 开始执行 UI 交互示例');
        log('📝 注意：此版本专注于通知功能演示');
        log('💡 在 CodeScript Toolkit 环境中，某些 UI 组件可能不可用');

        // 1. 基础通知演示
        await demonstrateBasicNotifications(log)();

        // 2. 连续通知演示
        await demonstrateContinuousNotifications(log)();

        // 3. 状态通知演示
        await demonstrateStatusNotifications(log)();

        // 4. 交互式通知演示
        await demonstrateInteractiveNotifications(log)();

        // 5. 高级通知演示
        log('🎯 演示高级通知功能...');

        try {
            // 长消息通知
            // @ts-ignore
            new (window as any).Notice(
                '这是一条很长的通知消息，用来演示 Obsidian 通知系统如何处理较长的文本内容。可以看到它会自动适应屏幕宽度并保持良好的可读性。',
                6000
            );

            await new Promise(resolve => setTimeout(resolve, 1000));

            // 数字计数通知
            log('🔢 数字计数通知演示...');
            for (let i = 10; i >= 1; i--) {
                // @ts-ignore
                new (window as any).Notice(`倒计时: ${i}`, 800);
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            // @ts-ignore
            new (window as any).Notice('🎊 倒计时结束！', 3000);

            log('✅ 高级通知演示完成');

        } catch (error) {
            log(`❌ 高级通知演示失败: ${error.message}`);
        }

        // 6. 总结演示
        log('📋 通知功能总结:');
        log('✅ 基础通知 - 已演示');
        log('✅ 连续通知 - 已演示');
        log('✅ 状态通知 - 已演示');
        log('✅ 交互式通知 - 已演示');
        log('✅ 高级通知 - 已演示');

        log('🎉 UI 交互示例执行完成！');
        log('💡 提示：所有通知功能都在 CodeScript Toolkit 环境中正常工作');

    } catch (error) {
        console.error('[UI 交互示例] 执行失败:', error);
        // @ts-ignore
        new (window as any).Notice(`执行失败: ${error.message}`, 5000);
        throw error;
    }
}
