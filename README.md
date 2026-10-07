# 在 SteamOS / Steam Deck 上安装原生 Waydroid（Nix 方案）

**简体中文** ｜ [English (README.en.md)](README.en.md)

> 本仓库 = **安装指南** + **配套 Decky 插件** [Maa Deck](decky-maa/)：在游戏模式 QAM 里控制 MAA 挂机（见 §13）。

> 一份可直接照做的实操指南，基于 SteamOS 3.8.28（内核 6.18.50-valve2）实测整理。
> 目标：在**游戏模式**下运行原生 Waydroid（官方 Android 13 + GAPPS），带 ARM 转译，并通过 ADB 供 MAA 之类的自动化工具使用。
> 特点：**不修改只读系统分区**，尽量跨 SteamOS 更新存活；镜像与依赖可在快的机器上预取再推过去。

---

## TL;DR

1. 装 Nix（官方 installer），<code>/nix</code> 会是 home 分区上的 bind mount，不占只读根。
2. 用 Nix/Home Manager 部署 <code>waydroid-nftables</code> / <code>lxc</code> / <code>cage</code> / <code>wlr-randr</code>。
3. **自己编 binder 模块**（SteamOS 3.8.x 内核不带 binder），这是最大的坑；本指南给出对 GCC 15 / 6.18 内核的 shim 修复。
4. 用官方 Android 13 (LineageOS 20.0) GAPPS 镜像；把镜像放在 **preinstalled 路径**，避免安装脚本联网下载。
5. 跑安装脚本完成 /etc 配置、firewalld、服务、libhoudini（ARM 转译）。
6. 游戏模式入口用 <code>cage</code> 套 <code>gamescope</code>（这是 gamescope 下让 Waydroid 可见的标准做法）。
7. 可选：配 Steam 库美术四槽位、设 16:9 分辨率（自动化工具通常只认 16:9）。
8. **关键**：游戏模式里要把该快捷方式的 **Steam 输入设为“强制开启”**（属性 → 控制器），否则 Waydroid 的触屏/手柄操作会异常（见 §7.1）。

---

## 0. 适用环境

- SteamOS 3.8.x（本文基于 3.8.28 / 内核 <code>6.18.50-valve2-1-neptune-618</code>）。
- 能 SSH 登录、有 sudo。本文用占位符：<code>DECK_IP</code>、<code>DECK_PASS</code>。
- 注意：SteamOS 3.8.28 起内核 **不再内置 binder**（<code>CONFIG_ANDROID_BINDER_IPC is not set</code>），必须自行加载 binder 模块。
- 根分区通常很小（本文机器只剩约 1.2G）。所以所有大数据（Waydroid 镜像、Nix store 依赖）都要放在 <code>/home</code> 分区。

先确认现状（只读检查）：

~~~bash
sshpass -p 'DECK_PASS' ssh -o StrictHostKeyChecking=accept-new deck@DECK_IP 'bash -ls' <<'EOF'
uname -r
zgrep CONFIG_ANDROID_BINDER /proc/config.gz || echo "no binder in kernel"
lsmod | grep -i binder || echo "no binder module"
steamos-readonly status
command -v waydroid || echo "waydroid not installed"
findmnt -no SOURCE,TARGET,FSTYPE /nix || echo "no /nix (Nix not installed)"
df -h / /home
EOF
~~~

要点：
- <code>steamos-readonly status</code> 通常为 <code>enabled</code>；
- 若 <code>/nix</code> 已存在，多半是 home 分区上的 bind mount（SteamOS 3.5+ 自带），装 Nix 不会动只读根。

### 0.1 操作方式：从一台电脑通过 SSH 远程操作 Deck

**本指南默认你在另一台电脑（PC / 笔记本）上，通过 SSH 远程操作 Deck**，而不是直接在 Deck 上敲命令：

- **电脑**：执行 <code>ssh</code> / <code>scp</code> / <code>rsync</code>；负责下载与校验大文件（Waydroid 镜像、Nix 闭包等），再推送到 Deck。
- **Deck**：被操作的目标机，用占位符 <code>DECK_IP</code> 表示；命令普遍写成远程执行的形式：
  <code>sshpass -p 'DECK_PASS' ssh deck@DECK_IP 'bash -ls' &lt;&lt;'EOF' ... EOF</code>
- **少数步骤必须在 Deck 本机（图形界面）完成**：游戏模式里启动 Waydroid 条目、设置该快捷方式的 Steam 输入、装 Decky 插件等；文内会明确写「在 Deck 上操作」。

约定：<code>DECK_IP</code> / <code>DECK_PASS</code> 是占位符，请替换为你的实际值；本文未特别说明的命令，都是在**电脑**上执行。

---

## 1. 总体架构

~~~
Steam 游戏模式 (gamescope)
  └─ 非 Steam 快捷方式: waydroid-gamemode
       └─ cage (嵌套 Wayland 合成器，作为 Steam 的"游戏"窗口)
            └─ waydroid show-full-ui  (Android UI)
                 └─ Waydroid 容器 (LXC, 由 systemd 管理)
                      └─ binder 内核模块 (开机 insmod)
ADB (可选): 自动化工具 -> 192.168.240.112:5555 (容器 IP)
~~~

全栈只用一条 Nix/Home Manager 配置 + 一个补丁过的安装脚本，尽量不碰只读根。

---

## 2. 安装 Nix（官方 installer）

以普通用户运行，installer 自己会 sudo：

~~~bash
curl -sSfL https://artifacts.nixos.org/nix-installer | sh -s -- install --no-confirm --enable-flakes
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
nix --version
~~~

- 若下载二进制因 <code>--speed-limit 250000</code> 被判定"太慢"，可在快的机器上用普通 curl 下同一 release 资源、校验 SHA256SUMS 后再推过去，运行同一个二进制。
- 安装会创建 <code>/etc/systemd/system/nix-daemon.service</code>，并在 SteamOS 上把 keep-list 写入 <code>/etc/atomic-update.conf.d/nix-installer.conf</code>。
- 若 <code>/nix</code> 不存在，installer 会短暂 <code>steamos-readonly disable</code> 建目录再 enable。

---

## 3. 部署 Waydroid（Nix / Home Manager）

本文参考社区方案 [Labaman/SteamOS-Waydroid-Nix-Installer](https://github.com/Labaman/SteamOS-Waydroid-Nix-Installer)。核心是把 waydroid/lxc/cage 及脚本用 Home Manager 装到用户空间，系统级配置由脚本用 sudo 写 <code>/etc</code>（SteamOS 的 <code>/etc</code> 是可写 overlay 且可跨更新保留）。

~~~bash
git clone https://github.com/Labaman/SteamOS-Waydroid-Nix-Installer ~/.config/home-manager
# 按需编辑 ~/.config/home-manager/home.nix：
#   1) 取消注释一个 shell 模块（programs.bash.enable = true; 等）
#   2) 如需 local 依赖（例如 libhoudini 安装脚本要的 lzip），加到 home.packages
nix run home-manager/master -- switch --flake ~/.config/home-manager
~~~

注意：
- 该配置没有 <code>flake.lock</code> 时应先生成并提交，否则每次评估的 nixpkgs 版本可能不同。
- 首次 switch 会从二进制缓存下载几百 MB；网络慢的话可以先在一台快机器上构建 <code>homeConfigurations.&lt;user&gt;.activationPackage</code> 再 <code>nix copy</code> 过去。
- 之后执行 <code>nix-gpu-setup</code>（sudo），让 Nix GUI 程序通过 <code>/run/opengl-driver</code> 用上 GPU。

---

## 4. binder：SteamOS 3.8.x 的最大坑

### 4.1 问题

内核不含 binder，Waydroid 容器起不来。社区方案（ryanrudolfoba / Bazzite / Labaman）是：**从与运行内核完全相同版本的源码里，把 <code>drivers/android</code> 的 binder 编成外部模块**，并用一个 shim 解析内核未导出的符号。只要内核没有 binder，这是风险最低、可回退的做法（模块只在运行时 <code>insmod</code>，不写 <code>/lib/modules</code>）。

### 4.2 对 GCC 15 / 6.18 内核必须打的 shim 补丁

上游 shim（<code>shim.c</code>）在新内核/新 GCC 下会编译失败，需要三处修复：

1. **GCC 15 不允许 void 函数里写 <code>return &lt;void 表达式&gt;</code>**。原宏对所有函数都生成 <code>return p_##name(...)</code>。修法：给 void 函数单独一个宏。

~~~c
/* 原：ret name args { return p_##name call; }  —— void 会报 -Wreturn-mismatch */
#define SHIM_VOID(name, args, call) static typeof(&name) p_##name; void name args { p_##name call; }
/* 然后把 SHIM(void, xxx, ...) 改成 SHIM_VOID(xxx, ...) */
~~~

2. **GCC 15 不允许把 <code>void*</code> 直接赋给函数指针**。修法：用 <code>typeof</code> 转换。

~~~c
lookup = (typeof(lookup))kp.addr;          /* 原：(void *)kp.addr */
var    = (typeof(var))lookup(sym);         /* 原：(void *)lookup(sym) */
~~~

3. **符号列表随内核变化**。6.18.50 已没有 <code>zap_vma_range</code>。先删掉它，再看 modpost 的 undefined 列表补：

~~~c
/* 删掉 SHIM_VOID(zap_vma_range, ...) 与对应 RESOLVE */
/* 补（6.18.50 实测缺这两个）： */
SHIM_VOID(zap_page_range_single, (struct vm_area_struct *vma, unsigned long address,
          unsigned long size, struct zap_details *details), (vma, address, size, details))
SHIM(bool, list_lru_add, (struct list_lru *lru, struct list_head *item, int nid,
          struct mem_cgroup *memcg), (lru, item, nid, memcg))
/* 并在初始化函数里各加一行 RESOLVE(...) */
~~~

编译/加载由安装脚本完成（从 kernel.org 拉同版本 <code>drivers/android</code> 源码、从 Valve 仓库拉同版本 kernel headers，用内核对应的 gcc 主版本编译，写入 <code>/etc/waydroid-binder/&lt;uname -r&gt;/binder_linux.ko</code>；systemd 单元在开机时 <code>insmod</code>）。

> 提示：这类"按 modpost 的 undefined 列表补符号"是预期工作流；每次内核更新都要重编。

---

## 5. 准备官方镜像（避免在 Deck 上慢速下载）

官方 Waydroid 镜像托管在 SourceForge，国内/某些网络下很慢。做法：在快的机器上下载 + 校验，再推到 Deck。

- 官方 OTA 元数据（含 sha256）：
  - <code>https://ota.waydro.id/system/lineage/waydroid_x86_64/VANILLA.json</code>
  - <code>https://ota.waydro.id/system/lineage/waydroid_x86_64/GAPPS.json</code>
  - <code>https://ota.waydro.id/vendor/waydroid_x86_64/MAINLINE.json</code>
- 选最新一组 system + vendor，用 JSON 里的 <code>id</code>（sha256）校验。
- 解包得到的 <code>system.img</code>/<code>vendor.img</code> 放到 <code>~/.local/share/waydroid-preinstalled/</code>。
- Deck 上做软链（关键，避免落到根分区）：

~~~bash
# 数据目录落 home
mkdir -p ~/.local/share/waydroid
sudo rm -rf /var/lib/waydroid
sudo ln -sfn ~/.local/share/waydroid /var/lib/waydroid
# 预置镜像路径（Waydroid 会优先识别）
sudo mkdir -p /etc/waydroid-extra
sudo ln -sfn ~/.local/share/waydroid-preinstalled /etc/waydroid-extra/images
# 让安装脚本/其它工具在 images/ 下也能看到（某些分支会直接改 system.img）
mkdir -p ~/.local/share/waydroid/images
ln -sfn ~/.local/share/waydroid-preinstalled/system.img ~/.local/share/waydroid/images/system.img
ln -sfn ~/.local/share/waydroid-preinstalled/vendor.img ~/.local/share/waydroid/images/vendor.img
~~~

Waydroid 的 <code>init</code> 会检测 <code>/etc/waydroid-extra/images</code>（以及 <code>/usr/share/waydroid-extra/images</code>）里的 system.img+vendor.img，若存在就当作 **preinstalled**、把 OTA 设为 None，不再联网。

---

## 6. 运行安装脚本

社区脚本（Labaman 的 <code>waydroid-setup</code>）会完成：检查依赖 → 编/载 binder → 写 /etc（systemd、D-Bus、gbinder、firewalld、sudoers、RAUC keep-list）→ 建 <code>/var/lib/waydroid</code> 软链 → <code>waydroid init</code> → 开服务 → 装 libhoudini。

两个实践要点：

1. **非交互 sudo 问题**：脚本内部大量调用 <code>sudo</code>，SSH 无 tty 时会失败。可行做法是临时提供一个 askpass 助手（用完删除）：

~~~bash
cat > ~/.askpass.sh <<'EOF'
#!/bin/sh
echo DECK_PASS
EOF
chmod +x ~/.askpass.sh
export SUDO_ASKPASS=~/.askpass.sh
mkdir -p ~/bin-sudo
printf '#!/bin/sh\nexec /usr/bin/sudo -A "$@"\n' > ~/bin-sudo/sudo
chmod +x ~/bin-sudo/sudo
export PATH=~/bin-sudo:$PATH
~~~

2. **预置镜像场景下的断言**：脚本在 <code>waydroid init</code> 后会检查 <code>~/.local/share/waydroid/images/system.img</code>；而用 preinstalled 时镜像在 <code>/etc/waydroid-extra/images</code>。把脚本复制一份、把该断言放宽为"任一位置存在即可"，再运行这份本地副本。

3. **overlayfs 依赖文件系统**：若 <code>/home</code> 是带 <code>casefold</code> 的 ext4，overlayfs 会不可用，脚本会设 <code>mount_overlays = False</code>，并把右摇杆 <code>.kl</code> 与 libhoudini **直接写进 system.img**（会按需扩容，本文机器扩到约 3.1G）。这不是错误，是预期分支。

运行后验证：

~~~bash
waydroid status                # Container: RUNNING
systemctl is-active waydroid-container
grep -w binder /proc/filesystems
ls -l /dev/binder*
~~~

---

## 7. 游戏模式入口（cage）与分辨率

**为什么用 cage**：在 gamescope 下直接 <code>waydroid show-full-ui</code> 不会产生 gamescope 窗口，Steam 会一直卡在 logo。做法是让"游戏"是 <code>cage</code>（一个嵌套 Wayland 合成器），Android 渲染在 cage 里，gamescope 全屏 cage 的窗口。社区（Bazzite、ryanrudolfoba、chenx-dust/waydroid-launcher）都用这个思路。要点：

~~~bash
# 由 Steam 以"非 Steam 游戏"启动；脚本里做这些事：
unset LD_PRELOAD LD_LIBRARY_PATH        # Steam 注入的 overlay/运行时库会破坏 Nix 二进制
export PATH="$HOME/.nix-profile/bin:$PATH"
cage -- bash -uc '
  out=$(wlr-randr | awk "NR==1{print \$1; exit}")
  wlr-randr --output "$out" --custom-mode 1280x720
  waydroid show-full-ui &
  wait
'
~~~

- 用 <code>steamos-add-to-steam &lt;脚本或 .desktop&gt;</code> 加入 Steam；也可在 Steam UI 里"添加非 Steam 游戏"。
- 分辨率：Android 侧用 <code>persist.waydroid.width/height</code>；cage 侧用 <code>WAYDROID_RES</code>，或（本仓库新版启动脚本）<code>~/.local/share/waydroid/gamemode-resolution</code> 文件对齐。MAA 等工具只认 **16:9**，掌机常见设为 <code>1280x720</code>。
- 启动脚本取值优先级：<code>gamemode-resolution</code> 文件 &gt; <code>WAYDROID_RES</code>（Steam 启动项）&gt; 默认 <code>1280x800</code>。文件一旦存在即成为唯一来源，Steam 启动项可留可删。
- 启动脚本除了用该文件设置 cage 输出，还会在 Android 起来后执行 <code>waydroid prop set persist.waydroid.width/height</code>，把 Android 内部也强制对齐（Android 会自己持久化 <code>persist.*</code>，只改 cfg + 重启容器可能被旧值覆盖）。
- Maa Deck 插件（见 <code>decky-maa/</code>）已在 QAM 提供一键切换：同时写 Android 侧与 <code>gamemode-resolution</code>，并执行 <code>systemctl restart waydroid-container.service</code>，重启后两者一致生效。

~~~bash
# Android 侧（写 cfg 的 [properties]，重启容器生效）
persist.waydroid.width = 1280
persist.waydroid.height = 720
# cage 侧（任一）：
echo 1280x720 > ~/.local/share/waydroid/gamemode-resolution
# 或 Steam 快捷方式 LaunchOptions（用 %command% 传环境变量）：
WAYDROID_RES=1280x720 %command%
~~~

> 已知现象：游戏模式入口**第一次常失败、第二次才成**（会话/容器冷启动时序）。日志一般在 <code>~/.local/share/waydroid/gamemode.log</code>。

### 7.1 必须：强制启用 Steam 输入（否则触屏/操作异常）

游戏模式下**直接用手柄/触屏操作 Waydroid 会出现异常**：触屏点击错位、拖拽不跟手、按键无响应等。

必须对这条快捷方式**强制启用 Steam 输入**，由 Steam 负责把 Deck 的触控/手柄正确映射给 Waydroid：

1. Steam 库 → 选中 <code>Waydroid</code>；
2. 打开 **属性**（游戏页面的齿轮图标，或右键 → 属性）；
3. 进入 **控制器** 标签；
4. 在 **Steam 输入** 下拉里选择 **强制开启**（英文：Force On / Force Enable）。

> 不同客户端版本该下拉可能显示为 默认设置 / 强制开启 / 强制关闭（或 启用/禁用）三档；请选“强制开启”，**不要选关闭**。设置后 Waydroid 的触屏与手柄操作恢复正常。

### 7.2 多点触控退化为单点指针：根因与修复

**现象**：游戏模式下 Waydroid 只剩“单点触控”（像鼠标指针），双指缩放/多指手势无效；桌面模式下同一个 Waydroid 多点完全正常。

**根因**（实测定位）：Steam 会把非 Steam 快捷方式当作“不支持触摸的游戏”，在 Xwayland 根窗口写下 X 属性 `STEAM_TOUCH_CLICK_MODE = 1`（值 1 = left，即“把触摸当鼠标左键”）。gamescope 读这个属性覆盖它的 `touch_click_mode`（启动参数 `--default-touch-mode 4` 只是默认值），于是**把所有触摸都转成单个鼠标指针**。这样 cage 永远收不到 `wl_touch`，Waydroid 的 `hwcomposer` 只把指针写进 `/dev/input/wl_pointer_events`，Android 因此只看到一个指针——多点退化为单点。

证据链（可只读复现）：

- `DISPLAY=:0 xprop -root STEAM_TOUCH_CLICK_MODE` → 运行期是 `1`（不是 4）；
- 此时 Waydroid 的触摸 FIFO `/dev/input/wl_touch_events` **没有任何写端**（只有 Android 的读端）；
- 把它改成 `4` 后，同一 FIFO 立刻出现写端 `composer@2.1-se`，多点触控恢复。

**修复**：让该属性在游戏运行期间保持为 `4`（passthrough）。Steam 可能在获得焦点时又写回 1，所以入口脚本里用一个小守护循环重申：

~~~bash
# 在 waydroid-gamemode 里（启动 cage 之前）
touchfix() {
  while :; do
    for d in :0 :1; do
      v=$(DISPLAY=$d /usr/bin/xprop -root STEAM_TOUCH_CLICK_MODE 2>/dev/null) || continue
      case "$v" in
        *"= 4") ;;
        *) DISPLAY=$d /usr/bin/xprop -root -f STEAM_TOUCH_CLICK_MODE 32c \
             -set STEAM_TOUCH_CLICK_MODE 4 2>/dev/null || true ;;
      esac
    done
    sleep 2
  done
}
touchfix &
TOUCHFIX_PID=$!
# 退出时一并回收：cleanup() { kill "$TOUCHFIX_PID"; "$WAYDROID" session stop; }
~~~

完整入口脚本见 <code>decky-maa/resources/waydroid-gamemode.sh</code>（插件仓库，已含此修复）。

> 说明：这一条与 §7.1 的“强制启用 Steam 输入”是两件独立的事：§7.1 解决手柄/触控映射，§7.2 解决多点被降级为单点。

---

## 8. Steam 库美术（四个槽位）

自定义美术放在 <code>&lt;steam&gt;/userdata/&lt;id&gt;/config/grid/</code>，文件名按快捷方式的 **appid**：

| 槽位 | 文件名 | 推荐尺寸 |
|---|---|---|
| 宽卡 | <code>{appid}.png</code> | 920×430 |
| 竖卡 | <code>{appid}p.png</code> | 600×900 |
| Hero | <code>{appid}_hero.png</code> | 1920×620 |
| 透明 logo | <code>{appid}_logo.png</code> | 透明 PNG |

- 非 Steam 快捷方式的 appid 是负数/无符号两种表示，**两种都写一份**最稳。
- 图标是 <code>shortcuts.vdf</code> 里的 <code>icon</code> 字段（256×256）。
- 注意：<code>shortcuts.vdf</code> 是二进制 VDF；改名字/图标/LaunchOptions 需重启 Steam 生效，改前务必备份。

---

## 9. MAA / ADB（可选）

- Waydroid 容器默认 IP 常见为 <code>192.168.240.112</code>，ADB 端口 <code>5555</code>。
- 自动化工具连接后，建议按需改分辨率到 16:9（<code>adb shell wm size 1280x720</code>），并在结束后还原。
- 容器内查询：<code>sudo waydroid shell -- wm size</code>。

---

## 10. 故障排查（按现象）

| 现象 | 可能原因 | 处理 |
|---|---|---|
| <code>waydroid init</code> 报找不到 binder 节点 | 内核无 binder 模块未加载 | 先加载/编好 binder 再 init |
| <code>/etc/waydroid-extra/images</code> 被清 | SteamOS 原子更新未把它列入 keep-list | 把它加进 <code>/etc/atomic-update.conf.d/*.conf</code> |
| 游戏模式启动卡 Steam logo | 直接 show-full-ui 无 gamescope 窗口 | 用 cage 入口 |
| 第一次启动失败、第二次成功 | 会话/容器冷启动时序 | 重试；或在入口脚本里等待 surfaceflinger 就绪 |
| 安装脚本 <code>sudo: a terminal is required</code> | SSH 无 tty | 临时 SUDO_ASKPASS（见第 6 节） |
| Nix 报 <code>api.github.com ... 403</code> | GitHub API 限流 | 用 pin 死的 rev，或给 flake 生成并提交 lock |
| 官方镜像下载极慢 | SourceForge 镜像慢 | 在快机器下载+校验后推送；或用下载器多连接+代理 |
| overlayfs 不可用 | /home 是 ext4 + casefold | 属预期；<code>mount_overlays=False</code>，写进 system.img |
| 游戏模式里触屏/手柄异常（点击错位、拖拽不跟手） | 未强制启用 Steam 输入，Deck 控制未正确映射给 Waydroid | 属性 → 控制器 → Steam 输入 → 强制开启（见 §7.1） |
| 游戏模式里多点触控退化为单点（像鼠标） | Steam 给非 Steam 快捷方式写 `STEAM_TOUCH_CLICK_MODE=1`，gamescope 把触摸当鼠标 | 入口脚本把该属性重申为 4（见 §7.2） |

---

## 11. 维护与续命

- **SteamOS 大版本更新**：
  - 内核一般会变，需**重编 binder**并重跑安装脚本（幂等）。
  - <code>/etc</code> 里没进 keep-list 的文件可能被清（尤其 <code>/etc/waydroid-extra</code>）。
- **<code>waydroid upgrade</code>**：会重写 system.img/vendor.img，<code>.kl</code> 修正、libhoudini、预置路径等需重跑脚本恢复。
- **Home Manager 重新部署**：自管理的文件（例如你手改过的 shim.c）会被还原，本地补丁要重打。
- 建议把本地补丁提上游，或至少在一个本地脚本里固化。

---

## 12. 资源与下载链接

**Waydroid**

- 官网：https://waydro.id/ ；文档：https://docs.waydro.id/
- 属性文档（分辨率等）：https://docs.waydro.id/usage/waydroid-prop-options
- 官方镜像 OTA 元数据（JSON 内含 sha256 与下载地址）：
  - Android 13 VANILLA：https://ota.waydro.id/system/lineage/waydroid_x86_64/VANILLA.json
  - Android 13 GAPPS：https://ota.waydro.id/system/lineage/waydroid_x86_64/GAPPS.json
  - vendor MAINLINE：https://ota.waydro.id/vendor/waydroid_x86_64/MAINLINE.json
- 镜像文件目录（SourceForge）：https://sourceforge.net/projects/waydroid/files/images/
- 社区构建（Android 13–16 / Android TV）：https://github.com/WayDroid-ATV/waydroid-builds 、https://github.com/WayDroid-ATV/waydroid-androidtv-builds
- 扩展脚本（libhoudini / GApps / Magisk / Widevine）：https://github.com/casualsnek/waydroid_script
- 游戏模式启动器：https://github.com/chenx-dust/waydroid-launcher

**SteamOS / Nix**

- Nix 官方 installer：https://github.com/NixOS/nix-installer （入口：https://artifacts.nixos.org/nix-installer）
- SteamOS Waydroid Nix 方案：https://github.com/Labaman/SteamOS-Waydroid-Nix-Installer
- Bazzite（gamescope 下的参考实现）：https://github.com/ublue-os/bazzite

**MAA / 自动化**

- MAA 主仓库：https://github.com/MaaAssistantArknights/MaaAssistantArknights
- maa-cli：https://github.com/MaaAssistantArknights/maa-cli
- MAA 文档：https://docs.maa.plus/

**Decky / 插件**

- Decky Loader：https://github.com/SteamDeckHomebrew/decky-loader
- 插件模板：https://github.com/SteamDeckHomebrew/decky-plugin-template

**美术素材**

- SteamGridDB：https://www.steamgriddb.com/
- Steam 自定义美术目录：<code>userdata/&lt;id&gt;/config/grid/</code>

---

## 13. 配套插件：Maa Deck（Decky QAM 面板）

除了系统侧的安装指南，本仓库还包含把它变成「随时可挂机」的 **Decky 插件**，源码在 [decky-maa/](decky-maa/)：

- 在游戏模式 QAM 里启停 **MAA（maa-cli）**，基础 / 高级双模式；
- 高级模式移植了本机 GTK 控制台的任务页（开始唤醒 / 作战 / 自动公招 / 基建换班 / 信用购物 / 领取奖励 / 一键日常 / 集成战略 / 抄作业 / 保全派驻 / 悖论模拟 / 生息演算）、命令预览与任务队列；
- 通过 **ADB** 驱动 Waydroid 容器里的游戏；
- 内置 **Waydroid 会话看门狗**：会话一停就强制结束 MAA 进程组并清空队列，避免幽灵进程。

安装、构建与部署见 [decky-maa/README.md](decky-maa/README.md)。

> 插件以 **git submodule** 形式引用（独立仓库：[ranlinyi/decky-maa](https://github.com/ranlinyi/decky-maa)）。克隆本仓库时请加 <code>--recursive</code>，或事后执行 <code>git submodule update --init --recursive</code>。

本文用到的配套文件（Steam 库美术四图、binder shim 补丁、安装脚本本地副本）见 [resources/](resources/)；游戏模式入口脚本在插件仓库 [decky-maa/resources/waydroid-gamemode.sh](decky-maa/resources/waydroid-gamemode.sh)。

---

## 许可 / 免责

本文为经验整理，命令请按自己环境替换占位符（<code>DECK_IP</code>、<code>DECK_PASS</code>）并自行评估风险；涉及 root、内核模块与系统配置，操作前请备份、确认可回退。
