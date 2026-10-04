# 配套资源 / Companion resources

本目录收录指南里提到的、可复现或可直接取用的配套文件。未收录的见文末说明。

## 内容

| 文件 | 说明 | 来源 |
|---|---|---|
| artwork/wide.png | Steam 库宽卡（920×430） | 本机生成（Waydroid 官方 logo + AOSP 壁纸） |
| artwork/portrait.png | 竖卡（600×900） | 同上 |
| artwork/hero.png | Hero 图（1920×620） | 同上 |
| artwork/logo.png | 透明 logo | 同上 |
| artwork/icon.png | 应用图标 | 同上 |
| patched-shim.c | 针对 GCC 15 / 内核 6.18 修好的 binder shim（指南 §4.2 的三处修复） | 部署机 ~/.local/share/waydroid-setup/shim.c |
| shim.h | 强制包含的头：把未导出的 init_ipc_ns 变成运行时解析的指针 | Home Manager 源 |
| waydroid-gamemode.sh | 游戏模式入口脚本（cage + show-full-ui，含分辨率/音量/手柄处理） | Home Manager 源 |
| waydroid-setup-local | 放宽「预置镜像」断言后的安装脚本副本（指南 §6） | 部署机 ~/waydroid-setup-local |

## 用法

- 美术：放到 Steam 的 userdata/<id>/config/grid/，按快捷方式 appid 命名（见指南 §8）。
- 补丁：用 patched-shim.c 替换上游 shim.c，再跑安装脚本编译 binder（指南 §4.2、§6）。
- 入口脚本：可参考指南 §7，用 steamos-add-to-steam 加入 Steam。

## 未收录（体积或性质原因）

- Waydroid 镜像 system.img / vendor.img（约 3.7G）：来源见指南 §5 与 §12 的 OTA 元数据链接。
- Nix closure / cache：由 Nix + Home Manager 自行构建，不入库。
- 右摇杆 .kl 修正：不是独立文件，安装脚本会直接写进 system.img（指南 §6.3）。
- Steam 快捷方式 shortcuts.vdf：含机器/账号相关数据，不入库；按指南 §7/§8 自行配置。
- 本机未保存的中间产物：nix-cache / nix-closure.nar 等（属构建中转，非配套资源）。

## 许可与出处

- patched-shim.c 源自 Labaman/SteamOS-Waydroid-Nix-Installer 的 shim.c（文件头 SPDX: GPL-2.0），此处为针对 GCC 15 / 内核 6.18.50 的三处本地修复版。
- waydroid-gamemode.sh、shim.h、waydroid-setup-local 同为上述项目的脚本/配置，按其原始许可分发。
- artwork/ 由 Waydroid 官方 logo 与 AOSP 默认壁纸合成，供个人使用；再分发请自行确认素材授权。
- 因此本目录中部分文件不适用仓库根的 Unlicense，请以各文件自身声明为准。
