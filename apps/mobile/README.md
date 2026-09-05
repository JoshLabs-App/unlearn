# apps/mobile 开发笔记

## 真机调试(WiFi 无线连接)

1. 手机需要提前用 Xcode 配对过一次(`xcrun devicectl list devices` 能看到 `available (paired)` 状态)。
2. 确认设备状态:

   ```bash
   xcrun devicectl list devices
   ```

3. 构建并安装到真机:

   ```bash
   cd apps/mobile
   npx expo run:ios --device "<设备名>"
   ```

### 常见坑:`pod install` 报 `Unicode Normalization not appropriate for ASCII-8BIT`

原因是终端 `LANG` 没设成 UTF-8,CocoaPods 处理路径编码时报错。执行前先设置:

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

或者永久写入 `~/.zshrc` / `~/.profile`,避免每次都要重新 export。

## 纯 JS 热更新(不重新装包)

已经装过开发版 App(Dev Client)后,不用每次都重新构建原生包。只要:

1. 启动 Metro:`npx expo start --dev-client`
2. 手机和电脑连同一个 WiFi(非隔离的访客网络)
3. 手机上打开 Dev Client,手动输入 `exp://<电脑局域网IP>:8081` 连接

即可拉取最新 JS 代码。
