# 黑潮纪元内容资产说明

## 目录结构

```text
novel/
  chapters/      # 正文章节（每章一个文件）
  config/        # 世界观配置文件（JSON）
  viewer/        # 配置可视化浏览网页
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

## 在网页中浏览配置

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

## 浏览器功能

- 分类切换
- 关键词搜索
- 标签筛选
- 卡片列表 + 详情面板
- 原始 JSON 查看开关
