# Maa Deck

Steam Deck 游戏模式（Decky QAM）里的 MAA 控制面板。插件本身是**薄控制器**：
它准备 maa-cli 配置，启动/停止外部 maa 进程，并把状态与日志送到 QAM。
游戏运行在 Waydroid 容器里，MAA 通过 **ADB** 操作它。

## 目录结构

    decky-maa/
    ├── plugin.json          # Decky 清单（name= Maa Deck, flags= [root]）
    ├── main.py              # 后端：状态 / 启停 / 日志 / ADB / 会话 / 配置
    ├── src/index.tsx        # 前端 QAM 面板（构建为 dist/index.js）
    ├── dist/index.js        # 前端 bundle（API_VERSION=2，对应 Decky v3.2.9）
    ├── bin/                 # maa-cli 与 adb（由 scripts/fetch-tools.sh 生成，不入库）
    └── scripts/
        ├── fetch-tools.sh   # 下载 maa-cli + platform-tools adb 到 bin/
        └── deploy.sh        # 打包并部署到 Deck（需要 sudo）

## 设计要点

- **root 插件**：Decky 的 plugin_loader 以 root 运行，插件跟随 root。
- **载荷不落根分区**：MaaCore 的库与资源、配置、缓存、日志都写进
  ~/homebrew/data/MaaDeck/（home 分区）。maestro 运行环境通过环境变量固定：
  MAA_CONFIG_DIR / XDG_DATA_HOME / XDG_CACHE_HOME，HOME=/home/deck。
- **环境清理**：Decky 的 PyInstaller 会注入 LD_LIBRARY_PATH/LD_PRELOAD，
  会让 adb/maa/systemctl 加载错版本动态库；后端启动时清除，并使用固定 PATH
  （含 /home/deck/.nix-profile/bin，waydroid 与 cage 在那里）。
- **连接模式**：
  - manual（默认）：插件自己 adb connect $ADB 地址，maa-cli 只连该地址。
  - waydroid：用 maa-cli 内置的 [connection] preset= "Waydroid"，由 maa-cli
    负责检测/启动会话并 adb connect。
  默认 manual 的原因是插件以 root 运行，而 Waydroid 会话属于 deck 图形用户；
  由 root 去启动会话容易产生 root 会话。日常用法是先在游戏模式打开 Waydroid
  条目（它按 deck 用户启动会话），再在 QAM 点「启动 MAA」。

## 开发

    cd decky-maa
    pnpm install
    pnpm build          # 生成 dist/index.js

## 部署（需要用户明确同意，会用到 Deck sudo）

    scripts/fetch-tools.sh
    scripts/deploy.sh   # 默认 deck@192.168.0.2；密码需用 DECK_PASS 环境变量提供

## 首次使用

1. 游戏模式打开 **Waydroid** 条目，启动容器会话。
2. QAM 打开 **Maa Deck**，确认「ADB 设备」为「已连接」（否则点「连接 ADB」）。
3. 若 MaaCore 显示未安装，点「安装 MaaCore」（需 Deck 能访问 GitHub/镜像）。
4. 选择任务，点「启动 MAA」。

## 配置

- 配置文件：~/homebrew/settings/MaaDeck/config.json
- maa profile：~/homebrew/data/MaaDeck/maa/config/profiles/default.toml（自动生成）
- 自定义任务：把 maa-cli 任务文件放进
  ~/homebrew/data/MaaDeck/maa/config/tasks/（.toml/.json/.yaml），
  QAM 的「自定义任务」下拉会自动列出。
