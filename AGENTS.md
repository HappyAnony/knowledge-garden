# AGENTS.md - oldwinterの数字花园

本仓库是一个基于 Obsidian 的个人数字花园/知识库，采用 Zettelkasten、ACCESS、PARA 等个人知识管理（PKM）方法论。使用双链笔记系统、原子化笔记理念和 MOC（Map of Content）导航。

## 项目概述

- **类型**: 个人知识管理库 / 数字花园
- **主要技术**: Obsidian + Markdown + YAML frontmatter
- **核心理念**: 原子化笔记、双链、知识网络、持续进化
- **发布系统**: 基于 frontmatter 的 `publish: true` 标记控制的自动化发布

## 目录结构

```
/
├── 🍀 花园导览/          # 知识库导航入口、MOC、结构说明
├── 📥 Inbox/            # 收集箱，临时笔记、灵感
├── Atlas/              # 核心知识区（Bases、Canvas、Dataviews、Draws等）
├── Cards/              # 原子化永久笔记
├── Calendar/           # 日历区（每日、周、月、年报）
├── Extras/             # 附加区（配置、模板、脚本等）
├── Sources/            # 外部资料区（文章、书籍、剪藏）
└── Spaces/             # 特定领域工作空间（PARA组织法）
```

## 核心文件格式规范

### Markdown 笔记格式
- 使用 YAML frontmatter 管理元数据
- 支持 `publish: true` 标记控制文件发布
- 使用双链语法 `[[链接]]` 建立笔记关联
- 支持标签 `#tag` 系统
- 支持 Obsidian 插件语法（Dataview、Canvas等）

### Frontmatter 示例
```yaml
---
publish: true
date created: 2022-08-06
date modified: 2025-07-12
tags:
  - 本库教程
title: 文件标题
---
```

## 工作流程

### 笔记创建与管理
1. **收集阶段**: 新内容放入 `📥 Inbox/`
2. **处理阶段**: 整理转化为永久笔记放入 `Cards/`
3. **链接阶段**: 使用 `[[双链]]` 建立关联
4. **索引阶段**: 创建 MOC 文件进行导航
5. **回顾阶段**: 定期复习和优化

### 发布流程
1. 在笔记 frontmatter 中添加 `publish: true`
2. 运行 `python publish_by_frontmatter.py` 脚本
3. 脚本自动筛选带有发布标记的文件
4. 复制到发布仓库并执行 Git 操作

## 代码风格指南

### Markdown 规范
- 使用中文为主，技术术语使用英文
- 标题层级: `# > ## > ### > ####`
- 列表使用 `-` 或 `1. 2. 3.`
- 代码块使用 ```language 语法
- 链接优先使用 `[[双链]]` 语法

### 文件命名
- 使用描述性名称
- 支持中文文件名
- 特殊文件使用 emoji 作为前缀（如 `🧰`、`📂` 等）

### 标签系统
- 使用 `#标签` 进行分类
- 支持嵌套标签 `#大类/子类`
- 常用标签: `#AI生成`、`#本库教程`、`#技术与工具` 等

## 插件与自动化

### 推荐插件
- **核心插件**: Dataview（动态索引）、Canvas（可视化）、Calendar（日历管理）
- **效率插件**: Commander（命令面板）、Advanced Tables（表格增强）
- **内容插件**: Image auto upload Plugin（图片上传）、Various Complements（自动补全）

### 自动化脚本
- `publish_by_frontmatter.py`: 基于 frontmatter 的自动化发布脚本
- 支持敏感文件过滤和 Git 自动提交

## 开发环境设置

### 环境要求
- Python 3.7+ (用于发布脚本)
- Obsidian 或 VS Code with Foam 插件
- Git (用于版本控制)

### 发布脚本配置
```python
# 主要配置参数
VAULT_PATH = os.path.abspath('.')  # 当前仓库路径
SHOWCASE_PATH = '/path/to/publish/repo'  # 发布仓库路径
FORCE_INCLUDE_DIRS = ['.obsidian', '.cursor']  # 强制包含目录
```

## 测试与验证

### 发布测试
1. 检查 frontmatter 中的 `publish: true` 标记
2. 运行发布脚本验证文件筛选
3. 验证敏感文件被正确排除
4. 检查 Git 操作是否成功

### 链接验证
1. 使用 Obsidian 内置的 "检查失效链接" 功能
2. 验证 `[[双链]]` 语法正确性
3. 检查外部链接有效性

## 安全注意事项

### 敏感信息保护
- `.gitignore` 文件用于排除敏感文件
- 发布脚本自动过滤敏感配置文件
- 强制排除项包括 API keys、个人数据等

### 发布前检查
- 移除包含个人信息的笔记
- 检查是否有未完成的草稿
- 验证所有链接的正确性

## 贡献指南

### 内容贡献
- 遵循原子化笔记原则
- 使用标准化的 frontmatter 格式
- 优先使用双链建立关联
- 保持内容原创性

### 技术贡献
- 遵循现有的代码风格
- 更新相关文档
- 测试修改后的功能

## 常见问题

### 笔记管理
Q: 如何处理临时笔记？
A: 放入 `📥 Inbox/` 目录，定期整理到 `Cards/`

Q: 如何创建 MOC？
A: 在 `Atlas/MOCs/` 目录创建，使用 `[[链接]]` 引用相关笔记

### 发布相关
Q: 如何控制哪些文件被发布？
A: 在文件 frontmatter 中添加 `publish: true`

Q: 发布脚本如何工作？
A: 扫描所有 `.md` 文件，筛选带有发布标记的文件，复制到发布仓库

## 学习资源

- [[🧰 本库使用指南]]: 详细的使用说明
- [[🍫 本库方法论指南]]: 知识管理理念
- [[🌏 本库发布指南]]: 发布流程说明
- [[∑ 本库 ACCESS 工作流汇总]]: 完整工作流程
