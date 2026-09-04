# pingpang-site

ITTF 认证长胶评价库 — 前端展示网站

## 架构

纯静态网站（HTML + CSS + JS），托管在 GitHub Pages。

- 数据来自 [pingpang-reviews](../pingpang-reviews) 仓库的 `data/larc-long-rubbers.json` 和 `data/ratings.json`
- 通过 `raw.githubusercontent.com` 读取数据，无需后端
- 用户评分通过 GitHub Issues 提交，Actions 自动汇总

## 文件结构

```
pingpang-site/
├── index.html           # 主页面
├── css/style.css        # 样式
├── js/
│   ├── config.js        # 配置（GitHub 用户名等）
│   └── app.js           # 主逻辑（渲染、搜索、评分展示）
├── .github/workflows/
│   └── deploy.yml       # GitHub Pages 部署
└── README.md
```

## 部署步骤

1. 创建 GitHub 仓库 `pingpang-site`，推送此目录所有文件
2. 修改 `js/config.js` 中的 `dataOwner` 为你的 GitHub 用户名
3. 在仓库 Settings → Pages → Source 选择 "GitHub Actions"
4. 推送到 `main` 分支即自动部署

## 功能

- 📋 229 款 ITTF 认证长胶数据
- 🔍 搜索（品牌/型号）、按品牌/认证状态/评分筛选
- ⭐ 五维评分展示（变化、控制、进攻、怪异、耐用）
- 📊 雷达图、评分条形图、打法分布
- ✍ 点击「我要评价」直接跳转 GitHub Issue 表单
- ⚠️ 过期胶皮自动标记

## 本地预览

```bash
# 在项目目录启动本地服务器
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

注意：需先在 `js/config.js` 配置正确的 `dataOwner`，否则数据无法加载。
