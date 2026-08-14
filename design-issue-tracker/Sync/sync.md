开始之前（在第一台电脑上做）
先备份，只要 30 秒：
1.
点 Chrome 工具栏的扩展图标
2.
点 导出备份 → 下载一个 JSON 文件
3.
把这个文件放到网盘/邮件给自己，第二台电脑能拿到就行
第二台电脑：一步步安装
① 确认 Chrome 账号
•
打开 chrome://settings/people
•
确认登录的是和第一台电脑同一个 Google 账号
•
确认「同步」是开启状态
② 下载代码
•
打开 https://github.com/yating210/Github_DesignTracker
•
绿色 Code 按钮 → Download ZIP
•
解压
•
⚠️ 把解压出来的文件夹放到一个以后不会再移动、不会删除的地方（比如「文稿」里），不要放桌面临时用。移动位置 = 数据清空
③ 安装扩展
•
地址栏输入 chrome://extensions/ 回车
•
右上角打开 开发者模式（开关）
•
点左上角 加载未打包的扩展程序
•
在弹出的文件选择框里，一路进到：   Github_DesignTracker-main → design-issue-tracker → dist
•
选中 dist 文件夹，点「选择」
⚠️ 一定要选 dist，选错上一层会报错
④ 验证装对了
•
扩展卡片上会显示 ID，应该是：   pnepdkejfkkhmbiagdmhoanoilocbcpg
•
如果 ID 不是这串 → 选错目录了，移除重来（这时还没数据，移除没关系）
⑤ 打开 GitHub 看效果
•
打开 https://github.com/issues/assigned
•
按 Cmd + Shift + R 硬刷新
•
每行最右边应该出现 Status 胶囊，表头有筛选和排序
⑥ 等同步 / 或者导入
•
状态可能要等几十秒才从云端同步过来，可以再刷新一次
•
如果等了 1～2 分钟还是全是 Todo：   点扩展图标 → 导入备份 → 选第一步那个 JSON 文件 → 立刻恢复
之后要记住的两条
情况
怎么做
我更新了代码，你想用新版
重新 Download ZIP，覆盖原来那个文件夹的内容（不要换位置），然后 chrome://extensions/ 点 🔄
任何时候要点「移除」扩展、或要挪文件夹
先导出备份，否则记录全没
平时不用管，两台电脑改了状态会自动互相同步。