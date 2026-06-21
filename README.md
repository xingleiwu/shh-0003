# ReaderHub - 桌面阅读聚合工具

小说、视频、直播一站式桌面阅读工具，支持多种外部接口源导入。

## 功能

- **小说阅读**：导入 CatVod/阅读APP 书源，搜索并阅读小说。支持本地 TXT 文件导入
- **视频播放**：导入 CatVod/TVBox 接口源，在线搜索观看视频
- **直播**：导入 IPTV (M3U/TXT/JSON) 直播源，频道分组管理
- **数据源管理**：统一管理所有外部接口源，支持测试、刷新、导入导出

## 快速开始

```bash
npm install
npm run dev
```

开发服务器启动后访问 http://localhost:12128/

## 构建

```bash
npm run build:web     # web 版本
npm run build         # Electron 桌面版
```

## 数据源格式说明

| 格式 | 用途 | 示例 |
|------|------|------|
| CatVod | 小说+视频聚合接口 | demo.json |
| TVBox | 视频接口 | TVBox 配置 |
| 阅读APP | 小说书源 | shuyuan 格式 |
| IPTV | 直播源 | M3U/TXT/JSON |
