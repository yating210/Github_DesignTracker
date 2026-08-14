# GitHub Design Task Tracker

在 GitHub issue **列表页**为每一行加一个「个人设计状态」列。完全独立于 GitHub 自身的 issue
状态——你不改动任何 issue，只在自己的浏览器里记录「我做完没有」。

## 功能

- **状态列**：每行最右侧一个胶囊，点击切换 `Todo` / `In progress` / `Done` / `Pending`
- **筛选**：表头下拉框按状态过滤，带实时计数（如 `Done (5)`）
- **排序**：点表头 `Status` 循环切换 —— 不排序 → `Todo→Pending` → `Pending→Todo`
- **跨设备同步**：数据存 `chrome.storage.sync`，随 Chrome 账号自动同步
- **备份**：点工具栏扩展图标可导出 / 导入 JSON 备份
- **自动消失**：issue 被 close 后不再出现在 open 列表里，对应记录自然不显示

生效页面：`github.com/issues*` 与 `github.com/<owner>/<repo>/issues*`。

## 安装

`dist/` 已随仓库提交，**普通使用不需要安装 Node.js，也不需要构建**。

1. 从 GitHub 下载本仓库（Code → Download ZIP，或 `git clone`），解压到一个**固定不会再移动**的位置
2. 打开 `chrome://extensions/`
3. 右上角开启 **开发者模式**
4. 点 **加载未打包的扩展程序** → 选择 `design-issue-tracker/dist` 目录（注意是 `dist`，不是项目根目录）
5. 确认扩展 ID 是 `pnepdkejfkkhmbiagdmhoanoilocbcpg`（ID 不对说明选错了目录）
6. 打开 `https://github.com/issues/assigned`，硬刷新（Cmd/Ctrl+Shift+R）

## 修改代码后重新构建

只有改了 `src/` 里的代码才需要：

```bash
npm install
npm run build      # 产物覆盖到 dist/
```

然后回到 `chrome://extensions/` 点扩展卡片上的 🔄 刷新即可。

> 不要在 Chrome 正加载扩展时删除 `dist/` 目录，否则会报
> `Manifest is not valid JSON`（webpack 已配置 `output.clean`，会原地覆盖而非删目录）。

## 备份与恢复（重要）

点击 Chrome 工具栏上的扩展图标会打开弹窗，可以：

- 查看各状态的条目统计
- **导出备份** → 下载 `design-task-tracker-backup-YYYY-MM-DD.json`
- **导入备份** → 合并模式恢复（同一 issue 以备份文件为准，其余保留）

> ⚠️ **卸载扩展会清空全部记录**，包括已同步到 Chrome 账号的那份。
> 以下操作前请务必先导出备份：
> - 在 `chrome://extensions/` 点「移除」
> - 修改 `manifest.json` 里的 `key`（会改变扩展 ID，等同于换了一个新扩展）
> - 移动 `dist/` 目录后重新加载
>
> 日常改完代码只需点扩展卡片上的 🔄 刷新，**这不会清空数据**。

## 跨设备同步

数据通过 `chrome.storage.sync` 走 Chrome 账号同步。要在多台电脑上看到同一份状态，
**三个条件缺一不可**：

1. **两台电脑登录同一个 Google 账号**，且 Chrome 设置里已开启同步
2. **两边都安装了这个扩展**（各自 `npm install && npm run build`，或直接拷贝 `dist/` 目录）
3. **两边的扩展 ID 必须相同** ← 这一条最容易踩坑

第 3 条的原因：用「加载未打包的扩展程序」安装时，Chrome 默认按**安装路径**推导扩展 ID，
换台电脑路径不同 → ID 不同 → `chrome.storage.sync` 视为两个互不相干的扩展，数据不互通。

本项目已通过在 `public/manifest.json` 中写入固定的 `key` 字段解决：

```json
"key": "MIIBIjANBgkqhkiG9w0BAQEF..."
```

只要两台电脑加载的是**同一份 `manifest.json`**，扩展 ID 就恒为
`pnepdkejfkkhmbiagdmhoanoilocbcpg`，同步即可正常工作。

`extension-key.pem` 是生成该 `key` 的私钥，仅在需要打包 `.crx` 或重新生成 key 时用到。
**不要提交到公开仓库、不要分享**；日常同步不需要它。

### 在第二台电脑上启用

1. **第一台**：点扩展图标 → **导出备份**，保存 JSON 文件（保险起见，先做这步）
2. **第二台**：下载仓库 → `chrome://extensions/` → 开发者模式 → 加载未打包的扩展程序 → 选 `design-issue-tracker/dist`
3. 确认两台电脑登录的是**同一个 Google 账号**，且 Chrome 设置里「同步」已开启
4. 打开 `https://github.com/issues/assigned`，硬刷新，等几十秒看状态是否同步过来
5. 若没同步过来，点扩展图标 → **导入备份** → 选第 1 步的 JSON 文件

### 同步限制

`chrome.storage.sync` 单键上限 8KB、总量 100KB。本扩展每条记录只存
`"owner/repo#123": "Done"` 这样一个短字符串，约可容纳上千条 issue，日常使用不会触顶。
另外同步不是实时的，通常几秒到半分钟内生效。

## 项目结构

```
design-issue-tracker/
├── public/
│   ├── manifest.json          # 扩展配置（含固定 key）
│   ├── popup.html             # 工具栏弹窗：统计 / 备份
│   └── icons/
├── src/
│   ├── list-view-tracker.ts   # 列表页：状态列 / 筛选 / 排序
│   ├── popup.ts               # 弹窗逻辑：统计 / 导出 / 导入
│   ├── shared.ts              # 共用类型、常量与存储读写
│   └── background.ts          # service worker（目前仅占位）
├── webpack.config.cjs
├── tsconfig.json
└── extension-key.pem          # 私钥，勿外传
```

## 实现要点

- **行定位不依赖 GitHub 的 class / role**。从 `a[href*="/issues/"]` 向上遍历祖先，
  找到「兄弟节点里也含有其它 issue 链接」的那一层作为行容器。GitHub 改版后依然可用。
- **避免 MutationObserver 自触发死循环**。所有 DOM 写入都包在 `withoutObserver()` 里：
  先 `disconnect()`，写完 `takeRecords()` 清空积压再 `observe()`。同时所有写入保持幂等
  （值未变化则不写、顺序已正确则不重排）。
- **排序稳定**。同状态的行保持原有相对顺序，不会每次点击都乱跳。

## 已知限制

- 仅 Chrome / Chromium 系（Manifest V3）
- 只处理当前页已渲染的行；翻页或「加载更多」后会自动重新标注
- 暂不自动读取 GitHub 真实 issue 状态（未来可接 GitHub API 自动识别 closed）

## 排查

在 issue 列表页打开 Console，扩展会输出：

- `[DesignTaskTracker] 已标注 N 行；工具栏: 已插入` —— 正常
- `[DesignTaskTracker] 未匹配到任何行（页面上 /issues/ 链接数: N）` —— 行定位失败，
  说明 GitHub DOM 结构变了，需要调整 `findRowElement()`

注意 Console 的 **Default levels** 默认隐藏 Verbose，本扩展的日志用的是
`log` / `warn` 级别，正常可见。
