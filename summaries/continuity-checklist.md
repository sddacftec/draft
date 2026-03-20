# 连贯性检查清单（章节后处理）

每次写完章节后，至少完成以下自检：

## A. 人物与关系
- [ ] 新角色是否加入 `characters.json`（或更新既有人物里程碑）
- [ ] 关系变化是否有触发事件与章节锚点（例如 chapter-05）
- [ ] 角色称谓是否前后一致（避免同人多名误写）

## B. 世界与规则
- [ ] 新地图/区域是否写入 `maps.json`
- [ ] 新怪物/规则是否写入 `monsters.json` 与 `skills.json`
- [ ] 能力代价是否保持一致（例如盐化值不会“突然消失”）

## C. 主线与节奏
- [ ] `plotlines.json` 是否记录当前阶段推进状态
- [ ] `timeline.json` 是否补齐事件节点
- [ ] 本章结尾是否有可承接下一章的明确入口

## D. 资源与战力
- [ ] 新装备/模块是否写入 `equipments.json`
- [ ] 阵营关系变化是否写入 `factions.json`
- [ ] 战力跃迁是否有代价或前置条件支撑

## E. 索引与摘要
- [ ] `chapters/index.json` 已新增章节元信息
- [ ] `chapter-digest.md` 已追加本章摘要与关键增量

## F. 技术校验
- [ ] JSON 语法通过：`novel/config/*.json`、`novel/chapters/index.json`
- [ ] 如涉及前端数据结构，`novel/viewer/app.js` 语法通过
