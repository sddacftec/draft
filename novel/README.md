# 黑潮纪元内容资产说明

## 目录结构

```text
novel/
  chapters/      # 正文章节（每章一个文件）+ index.json
  config/        # 世界观配置文件（JSON）
  summaries/     # 章节摘要台账与连贯性检查
  viewer/        # 配置可视化浏览与编辑网页
```

## 配置文件清单

- `config/characters.json`：人物设定与关系
- `config/plotlines.json`：剧情主线与冲突
- `config/maps.json`：地图区域与危险点
- `config/monsters.json`：怪物图鉴
- `config/skills.json`：技能与代价机制
- `config/equipments.json`：装备与载具模块
- `config/factions.json`：势力关系
- `config/timeline.json`：时间线节点

## 章节文件清单

- `chapters/index.json`：章节目录（用于网页章节模块）
- `chapters/chapter-01.md` ... `chapter-06.md`：正文内容
- `chapters/index.json` 内含 `volumes` 字段与每章 `volumeId`，用于分卷管理

## 连载记忆与连贯性维护

- `summaries/chapter-digest.md`：章节摘要台账（每章必追加）
- `summaries/continuity-checklist.md`：章节后处理检查清单
- `summaries/volume-outline.md`：分卷总纲（阶段目标与进度）
- `summaries/early-arc-outline-v2.md`：前四章重构大纲（用于开篇优化参考）

推荐流程（每次写完章节后）：
1. 更新 `chapters/index.json`
2. 同步 `config/*.json`（人物、关系、地图、怪物、技能、装备、势力、时间线）
3. 追加 `chapter-digest.md`
4. 运行 JSON/JS 校验

项目内已提供对应技能：
- `.cursor/skills/novel-continuity-sync/SKILL.md`

## 在网页中浏览与编辑

> 因浏览器本地文件安全策略，建议通过 HTTP 服务访问。

1. 在仓库根目录执行：

   ```bash
   cd novel
   python3 -m http.server 8000
   ```

2. 浏览器打开：

   ```text
   http://localhost:8000/viewer/
   ```

## 部署到 GitHub Pages（在线访问）

仓库已提供自动部署工作流：`.github/workflows/deploy-pages.yml`。  
当 `main` 分支有新提交时，会自动把 `novel/` 目录发布为 Pages 站点。

### 访问地址规则

- **项目仓库页（当前仓库这种）**：
  - `https://sddacftec.github.io/draft/`
- **用户主页仓库（仓库名必须是 `sddacftec.github.io`）**：
  - `https://sddacftec.github.io/`

> 说明：如果你要“无仓库后缀”的根域名直达，需要把站点内容部署在 `sddacftec.github.io` 这个仓库。

## 浏览器功能

- 分类切换
- 关键词搜索
- 标签筛选
- 卡片列表 + 详情面板
- 原始 JSON 查看开关
- 配置条目编辑（新增 / 删除 / 修改 / 恢复 / 导出）
- 章节阅读与编辑（实时预览、自动草稿、本章导出、全量草稿导出）
- 章节完稿助手（弹出连贯性检查清单 + 摘要模板，一键复制/下载）

> 注意：网页编辑属于浏览器本地草稿，不会自动回写仓库文件。请通过导出内容再落盘。
