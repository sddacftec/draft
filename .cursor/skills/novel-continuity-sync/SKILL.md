---
name: novel-continuity-sync
description: 在每次新增或改写章节后，强制同步人物/关系/地图等配置并沉淀摘要，保障长篇连载记忆与连贯性。
---

# Novel Continuity Sync

用于诡秘航海长篇连载的“章节后处理”技能。  
目标：每次写完章节后，确保**设定同步、摘要可追溯、伏笔不断线**。

## 触发时机

- 新增任意章节（如 chapter-10、chapter-11）。
- 对已存在章节进行重写或大幅改稿。
- 出现新角色、新地点、新怪物、新规则、新装备、新阵营关系。

## 必做动作（按顺序）

1. **章节索引同步**
   - 更新 `novel/chapters/index.json`
   - 维护：`id`、`title`、`order`、`tags`、`summary`

2. **世界观配置同步（按需更新）**
   - 人物：`novel/config/characters.json`
   - 主线：`novel/config/plotlines.json`
   - 地图：`novel/config/maps.json`
   - 怪物：`novel/config/monsters.json`
   - 技能：`novel/config/skills.json`
   - 装备：`novel/config/equipments.json`
   - 势力：`novel/config/factions.json`
   - 时间线：`novel/config/timeline.json`

3. **摘要沉淀（强制）**
   - 追加到 `novel/summaries/chapter-digest.md`
   - 至少包含：
     - 本章摘要（3-6行）
     - 关键增量（角色/设定/冲突）
     - 连贯性钩子（未回收伏笔、下一章入口）

4. **连贯性检查**
   - 依据 `novel/summaries/continuity-checklist.md` 自检
   - 至少核对：称谓一致、阵营关系一致、时间线前后不打架、能力代价不失真

5. **技术校验**
   - JSON 语法校验：`novel/config/*.json` 与 `novel/chapters/index.json`
   - 若涉及前端数据读取，校验 `novel/viewer/app.js` 语法

## 质量门槛

- 不得只写章节不更新配置。
- 不得更新配置但不写摘要台账。
- 不得引入“设定越写越强但代价消失”的失衡。
- 对任何关系反转（敌->友、友->敌）必须写明触发事件与章节锚点。
