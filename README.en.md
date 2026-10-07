# Install Native Waydroid on SteamOS / Steam Deck (Nix approach)

[简体中文 (README.md)](README.md) ｜ **English**

> This repo = **install guide** + the **Maa Deck** Decky plugin for controlling MAA from the Game Mode QAM (source: [decky-maa/](decky-maa/), see §13).

> A copy-paste-friendly hands-on guide, based on real testing on **SteamOS 3.8.28** (kernel <code>6.18.50-valve2</code>).
> Goal: run **native Waydroid** (official Android 13 + GApps) in **Game Mode**, with ARM translation, and drive it over **ADB** from automation tools such as MAA.
> Design: **do not modify the read-only system partition**, try to survive SteamOS updates, and allow pre-fetching images/dependencies on a fast machine.

---

## TL;DR

1. Install Nix (official installer). <code>/nix</code> is a bind mount on the home partition, so the tiny root partition is untouched.
2. Deploy <code>waydroid-nftables</code> / <code>lxc</code> / <code>cage</code> / <code>wlr-randr</code> via Nix + Home Manager.
3. **Build the binder kernel module yourself** (SteamOS 3.8.x ships without binder) — the biggest pitfall; this guide includes the shim fixes needed for GCC 15 / kernel 6.18.
4. Use the official Android 13 (LineageOS 20.0) GAPPS image, placed on the **preinstalled path** so the installer never downloads it.
5. Run the setup script: /etc config, firewalld, services, libhoudini (ARM translation).
6. Game Mode entry = <code>cage</code> around <code>gamescope</code> (the standard way to make Waydroid visible under gamescope).
7. Optional: Steam library artwork (4 slots) and a 16:9 resolution (automation tools usually require 16:9).
8. **Critical**: set the shortcut's **Steam Input to "Force Enabled"** (Properties → Controller), otherwise touch/gamepad in Waydroid misbehaves (see §7.1).

---

## 0. Environment

- SteamOS 3.8.x (tested on 3.8.28 / kernel <code>6.18.50-valve2-1-neptune-618</code>).
- SSH access + sudo. Placeholders used below: <code>DECK_IP</code>, <code>DECK_PASS</code>.
- Note: since SteamOS 3.8.28 the kernel **does not include binder** (<code>CONFIG_ANDROID_BINDER_IPC is not set</code>); you must load a binder module yourself.
- The root partition is usually tiny (the test unit had ~1.2 GB free). Keep all large data (Waydroid images, Nix store deps) on <code>/home</code>.

Read-only sanity check:

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

Notes:
- <code>steamos-readonly status</code> is normally <code>enabled</code>.
- If <code>/nix</code> already exists, it is usually a bind mount on the home partition (present since SteamOS 3.5), so installing Nix does not touch the read-only root.

### 0.1 How this guide is used: operate the Deck remotely over SSH

**Everything here assumes you drive the Deck from another computer (your PC/laptop) over SSH**, not by typing on the Deck itself:

- **PC**: runs <code>ssh</code> / <code>scp</code> / <code>rsync</code>; downloads and verifies large files (Waydroid images, Nix closures), then pushes them to the Deck.
- **Deck**: the target machine, written as <code>DECK_IP</code>. Commands are usually shown as remote-execution snippets:
  <code>sshpass -p 'DECK_PASS' ssh deck@DECK_IP 'bash -ls' &lt;&lt;'EOF' ... EOF</code>
- **A few steps must be done on the Deck itself (graphical UI)**: launching the Waydroid entry in Game Mode, setting that shortcut's Steam Input, installing the Decky plugin, etc. The text marks these clearly.

Placeholders: replace <code>DECK_IP</code> / <code>DECK_PASS</code> with your own values. Unless stated otherwise, every command runs on the **PC**.

---

## 1. Architecture

~~~
Steam Game Mode (gamescope)
  └─ non-Steam shortcut: waydroid-gamemode
       └─ cage (nested Wayland compositor, shown as the Steam "game" window)
            └─ waydroid show-full-ui  (Android UI)
                 └─ Waydroid container (LXC, managed by systemd)
                      └─ binder kernel module (insmod at boot)
ADB (optional): automation tool -> 192.168.240.112:5555 (container IP)
~~~

The whole stack is one Nix/Home Manager config plus one patched setup script, and it avoids the read-only root as much as possible.

---

## 2. Install Nix (official installer)

Run as a normal user; the installer escalates with sudo itself:

~~~bash
curl -sSfL https://artifacts.nixos.org/nix-installer | sh -s -- install --no-confirm --enable-flakes
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
nix --version
~~~

- If the binary download fails because of the installer's <code>--speed-limit 250000</code>, download the same release asset with plain curl on a fast machine, verify it against <code>SHA256SUMS</code>, push it over, and run the same binary.
- The install creates <code>/etc/systemd/system/nix-daemon.service</code> and adds a SteamOS RAUC keep-list entry at <code>/etc/atomic-update.conf.d/nix-installer.conf</code>.
- If <code>/nix</code> does not exist, the installer briefly runs <code>steamos-readonly disable</code>, creates it, and re-enables.

---

## 3. Deploy Waydroid (Nix / Home Manager)

This guide follows the community project [Labaman/SteamOS-Waydroid-Nix-Installer](https://github.com/Labaman/SteamOS-Waydroid-Nix-Installer): waydroid/lxc/cage and helper scripts are installed into user space with Home Manager, while system-level files under <code>/etc</code> are written by a setup script with sudo (on SteamOS, <code>/etc</code> is a writable overlay that survives atomic updates).

~~~bash
git clone https://github.com/Labaman/SteamOS-Waydroid-Nix-Installer ~/.config/home-manager
# edit ~/.config/home-manager/home.nix:
#   1) uncomment exactly one shell module (e.g. programs.bash.enable = true;)
#   2) add local deps if needed (e.g. lzip, required by the libhoudini installer) to home.packages
nix run home-manager/master -- switch --flake ~/.config/home-manager
~~~

Caveats:
- The repo ships without <code>flake.lock</code>; generate and commit one first, otherwise the evaluated nixpkgs revision may change between runs.
- The first switch downloads a few hundred MB from the binary cache. On a slow link, build <code>homeConfigurations.&lt;user&gt;.activationPackage</code> on a fast machine and <code>nix copy</code> it over.
- Then run <code>nix-gpu-setup</code> (sudo) so Nix GUI apps get GPU drivers via <code>/run/opengl-driver</code>.

---

## 4. binder: the biggest pitfall on SteamOS 3.8.x

### 4.1 The problem

The kernel has no binder, so the Waydroid container cannot start. The community approach (ryanrudolfoba / Bazzite / Labaman) is to **build the in-tree <code>drivers/android</code> binder out-of-tree against the exact running kernel version**, with a small shim that resolves symbols the kernel does not export. If the kernel has no binder, this is the lowest-risk, reversible option: the module is only <code>insmod</code>-ed at runtime and nothing is written to <code>/lib/modules</code>.

### 4.2 Required shim fixes for GCC 15 / kernel 6.18

The upstream shim (<code>shim.c</code>) fails to compile on newer kernels/GCC. Three fixes:

1. **GCC 15 rejects <code>return &lt;void expression&gt;</code> in a void function.** The original macro always emits <code>return p_##name(...)</code>. Fix: add a dedicated macro for void shims.

~~~c
/* original: ret name args { return p_##name call; }  -- errors with -Wreturn-mismatch for void */
#define SHIM_VOID(name, args, call) static typeof(&name) p_##name; void name args { p_##name call; }
/* then change SHIM(void, xxx, ...) into SHIM_VOID(xxx, ...) */
~~~

2. **GCC 15 rejects assigning <code>void*</code> to a function pointer.** Fix: cast with <code>typeof</code>.

~~~c
lookup = (typeof(lookup))kp.addr;          /* was: (void *)kp.addr */
var    = (typeof(var))lookup(sym);         /* was: (void *)lookup(sym) */
~~~

3. **The symbol list changes with the kernel.** Kernel 6.18.50 no longer has <code>zap_vma_range</code>. Drop it, then add whatever modpost reports as undefined:

~~~c
/* remove SHIM_VOID(zap_vma_range, ...) and its RESOLVE */
/* add (these two were missing on 6.18.50): */
SHIM_VOID(zap_page_range_single, (struct vm_area_struct *vma, unsigned long address,
          unsigned long size, struct zap_details *details), (vma, address, size, details))
SHIM(bool, list_lru_add, (struct list_lru *lru, struct list_head *item, int nid,
          struct mem_cgroup *memcg), (lru, item, nid, memcg))
/* and add one RESOLVE(...) line per symbol in the init function */
~~~

Compiling and loading is handled by the setup script (downloads matching <code>drivers/android</code> sources from kernel.org, matching kernel headers from Valve repos, builds with the kernel's GCC major version, writes <code>/etc/waydroid-binder/&lt;uname -r&gt;/binder_linux.ko</code>; a systemd unit <code>insmod</code>s it at boot).

> Tip: "add symbols based on modpost's undefined list" is the expected workflow here; each kernel update requires a rebuild.

---

## 5. Prepare the official images (avoid slow downloads on the Deck)

Official Waydroid images are hosted on SourceForge, which can be very slow. Download + verify on a fast machine, then push to the Deck.

- Official OTA metadata (includes sha256): 
  - <code>https://ota.waydro.id/system/lineage/waydroid_x86_64/VANILLA.json</code>
  - <code>https://ota.waydro.id/system/lineage/waydroid_x86_64/GAPPS.json</code>
  - <code>https://ota.waydro.id/vendor/waydroid_x86_64/MAINLINE.json</code>
- Pick the newest system + vendor pair and verify against the <code>id</code> field (sha256).
- Put the extracted <code>system.img</code>/<code>vendor.img</code> in <code>~/.local/share/waydroid-preinstalled/</code>.
- Create the symlinks on the Deck (important: keeps data off the root partition):

~~~bash
# data dir on /home
mkdir -p ~/.local/share/waydroid
sudo rm -rf /var/lib/waydroid
sudo ln -sfn ~/.local/share/waydroid /var/lib/waydroid
# preinstalled images path (Waydroid prefers this)
sudo mkdir -p /etc/waydroid-extra
sudo ln -sfn ~/.local/share/waydroid-preinstalled /etc/waydroid-extra/images
# also expose them under images/ (some code paths patch system.img directly)
mkdir -p ~/.local/share/waydroid/images
ln -sfn ~/.local/share/waydroid-preinstalled/system.img ~/.local/share/waydroid/images/system.img
ln -sfn ~/.local/share/waydroid-preinstalled/vendor.img ~/.local/share/waydroid/images/vendor.img
~~~

Waydroid's <code>init</code> checks <code>/etc/waydroid-extra/images</code> (and <code>/usr/share/waydroid-extra/images</code>) for system.img + vendor.img; if present it treats them as **preinstalled**, sets the OTA to None, and never goes online.

---

## 6. Run the setup script

The community script (Labaman's <code>waydroid-setup</code>) does: dependency check → build/load binder → write /etc (systemd, D-Bus, gbinder, firewalld, sudoers, RAUC keep-list) → create the <code>/var/lib/waydroid</code> symlink → <code>waydroid init</code> → enable the service → install libhoudini.

Two practical points:

1. **Non-interactive sudo**: the script calls <code>sudo</code> a lot and fails over SSH without a tty. Temporarily provide an askpass helper (delete it afterwards):

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

2. **Assertion when using preinstalled images**: after <code>waydroid init</code> the script checks <code>~/.local/share/waydroid/images/system.img</code>, but with preinstalled images they live in <code>/etc/waydroid-extra/images</code>. Copy the script, relax that assertion to "exists in either location", and run the local copy.

3. **overlayfs depends on the filesystem**: if <code>/home</code> is ext4 with <code>casefold</code>, overlayfs is unavailable; the script then sets <code>mount_overlays = False</code> and writes the right-stick <code>.kl</code> and libhoudini **directly into system.img** (growing it as needed; the test unit grew to ~3.1 GB). This is expected, not an error.

Verify afterwards:

~~~bash
waydroid status                # Container: RUNNING
systemctl is-active waydroid-container
grep -w binder /proc/filesystems
ls -l /dev/binder*
~~~

---

## 7. Game Mode entry (cage) and resolution

**Why cage**: under gamescope, a plain <code>waydroid show-full-ui</code> does not create a gamescope window, so Steam hangs on the logo forever. The trick is to make the "game" be <code>cage</code> (a nested Wayland compositor); Android renders inside cage and gamescope fullscreens cage's window. Bazzite, ryanrudolfoba and chenx-dust/waydroid-launcher all do this. Key points:

~~~bash
# launched by Steam as a non-Steam game; the script does:
unset LD_PRELOAD LD_LIBRARY_PATH        # Steam-injected overlay/runtime libs break Nix binaries
export PATH="$HOME/.nix-profile/bin:$PATH"
cage -- bash -uc '
  out=$(wlr-randr | awk "NR==1{print \$1; exit}")
  wlr-randr --output "$out" --custom-mode 1280x720
  waydroid show-full-ui &
  wait
'
~~~

- Add it with <code>steamos-add-to-steam &lt;script or .desktop&gt;</code>, or via "Add a Non-Steam Game".
- Resolution: Android uses <code>persist.waydroid.width/height</code>; cage uses <code>WAYDROID_RES</code>, or (with the launcher from this repo) the file <code>~/.local/share/waydroid/gamemode-resolution</code>. MAA and similar tools only accept **16:9**, so handhelds commonly use <code>1280x720</code>.
- Launcher precedence: the <code>gamemode-resolution</code> file &gt; <code>WAYDROID_RES</code> (Steam launch option) &gt; default <code>1280x800</code>. Once the file exists it is the single source of truth; the Steam launch option can stay or be removed.
- The Maa Deck plugin (see <code>decky-maa/</code>) offers a one-tap switch in the QAM: it writes both the Android side and <code>gamemode-resolution</code>, then runs <code>systemctl restart waydroid-container.service</code> so both match after the restart.

~~~bash
# Android side (write to cfg [properties]; restart the container)
persist.waydroid.width = 1280
persist.waydroid.height = 720
# cage side (either):
echo 1280x720 > ~/.local/share/waydroid/gamemode-resolution
# or Steam shortcut LaunchOptions (pass env via %command%):
WAYDROID_RES=1280x720 %command%
~~~

> Known behavior: the Game Mode entry often **fails the first time and works the second time** (cold-start timing of session/container). Logs are usually at <code>~/.local/share/waydroid/gamemode.log</code>.

### 7.1 Required: force-enable Steam Input (otherwise touch/input misbehaves)

In Game Mode, **operating Waydroid directly with touch/gamepad is glitchy**: taps land in the wrong place, drags lag behind, buttons seem dead.

You must **force-enable Steam Input** for this shortcut so Steam maps the Deck's touch/gamepad into input Waydroid can consume:

1. Steam Library → select <code>Waydroid</code>.
2. Open **Properties** (gear icon on the game page, or right-click → Properties).
3. Go to the **Controller** tab.
4. Set **Steam Input** to **Force Enabled** (Force On).

> Depending on the client version the dropdown may show Default / Force Enabled / Force Disabled; choose Force Enabled, **not** Disabled. Afterwards touch and gamepad behave normally in Waydroid.

### 7.2 Multi-touch degrading to a single pointer: cause and fix

**Symptom**: in Game Mode Waydroid has only "single touch" (like a mouse pointer) — two-finger pinch or multi-finger gestures do nothing — while the same Waydroid is fully multi-touch in Desktop Mode.

**Cause** (measured, not guessed): Steam treats a non-Steam shortcut as a "game without touch support" and writes the X11 property `STEAM_TOUCH_CLICK_MODE = 1` (1 = left, i.e. "touch acts as the left mouse button") on the Xwayland root. gamescope reads it and overrides its `touch_click_mode` (the `--default-touch-mode 4` flag is only a default), so **every touch is turned into a single mouse pointer**. cage therefore never receives `wl_touch`; Waydroid's `hwcomposer` only writes the pointer into `/dev/input/wl_pointer_events`, and Android sees just one pointer.

Evidence (read-only, reproducible):

- `DISPLAY=:0 xprop -root STEAM_TOUCH_CLICK_MODE` → runtime value `1` (not 4);
- at that moment Waydroid's touch FIFO `/dev/input/wl_touch_events` has **no writer** (only Android's reader);
- after setting it to `4`, that FIFO immediately gains a writer (`composer@2.1-se`) and multi-touch works.

**Fix**: keep the property at `4` (passthrough) while the game runs. Steam may rewrite it to 1 on focus changes, so the launcher re-asserts it with a small watchdog loop:

~~~bash
# in waydroid-gamemode, before launching cage
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
# reap it on exit: cleanup() { kill "$TOUCHFIX_PID"; "$WAYDROID" session stop; }
~~~

The full launcher lives in <code>resources/waydroid-gamemode.sh</code> (already includes this fix).

> Note: this is independent of §7.1 (force-enable Steam Input). §7.1 fixes gamepad/touch mapping; §7.2 fixes multi-touch being collapsed to a single pointer.

---

## 8. Steam library artwork (four slots)

Custom artwork goes in <code>&lt;steam&gt;/userdata/&lt;id&gt;/config/grid/</code>, named after the shortcut's **appid**:

| Slot | Filename | Recommended size |
|---|---|---|
| Wide capsule | <code>{appid}.png</code> | 920×430 |
| Portrait | <code>{appid}p.png</code> | 600×900 |
| Hero | <code>{appid}_hero.png</code> | 1920×620 |
| Transparent logo | <code>{appid}_logo.png</code> | transparent PNG |

- Non-Steam appids exist in signed and unsigned forms; **write both** to be safe.
- The icon is the <code>icon</code> field in <code>shortcuts.vdf</code> (256×256).
- <code>shortcuts.vdf</code> is binary VDF; renaming / icons / LaunchOptions need a Steam restart. Always back it up first.

---

## 9. MAA / ADB (optional)

- The Waydroid container IP is commonly <code>192.168.240.112</code>, ADB port <code>5555</code>.
- After connecting, set a 16:9 resolution if needed (<code>adb shell wm size 1280x720</code>) and restore it afterwards.
- Query inside the container: <code>sudo waydroid shell -- wm size</code>.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| <code>waydroid init</code> cannot find binder nodes | kernel binder module not loaded | load/build binder first |
| <code>/etc/waydroid-extra/images</code> disappeared | SteamOS atomic update did not keep it | add it to <code>/etc/atomic-update.conf.d/*.conf</code> |
| Game Mode hangs on the Steam logo | plain show-full-ui creates no gamescope window | use the cage entry |
| First launch fails, second works | session/container cold start | retry, or wait for surfaceflinger in the entry script |
| <code>sudo: a terminal is required</code> | no tty over SSH | temporary SUDO_ASKPASS (see §6) |
| Nix: <code>api.github.com ... 403</code> | GitHub API rate limit | pin revs, or generate and commit a flake.lock |
| Official images download very slowly | slow SourceForge mirror | download+verify elsewhere and push; or use a multi-connection downloader behind a proxy |
| overlayfs unavailable | /home is ext4 + casefold | expected; <code>mount_overlays=False</code>, writes into system.img |
| Touch/gamepad glitchy in Game Mode | Steam Input not force-enabled, so Deck controls are not mapped for Waydroid | Properties → Controller → Steam Input → Force Enabled (see §7.1) |
| Multi-touch collapsed to a single pointer in Game Mode | Steam writes `STEAM_TOUCH_CLICK_MODE=1` for a non-Steam shortcut; gamescope turns touch into mouse | Launcher re-asserts the property to 4 (see §7.2) |

---

## 11. Maintenance

- **SteamOS major update**:
  - the kernel usually changes → **rebuild binder** and re-run the setup script (idempotent).
  - files under <code>/etc</code> not in the keep-list may be wiped (especially <code>/etc/waydroid-extra</code>).
- **<code>waydroid upgrade</code>**: rewrites system.img/vendor.img; the <code>.kl</code> fix, libhoudini and preinstalled paths must be restored by re-running the script.
- **Home Manager re-deploy**: self-managed files (e.g. a hand-patched shim.c) are restored to upstream; local patches must be re-applied.
- Consider upstreaming local patches, or at least pin them in a local script.

---

## 12. Resources and download links

**Waydroid**

- Website: https://waydro.id/ — Docs: https://docs.waydro.id/
- Prop options (resolution etc.): https://docs.waydro.id/usage/waydroid-prop-options
- Official OTA metadata (JSON contains sha256 and download URLs):
  - Android 13 VANILLA: https://ota.waydro.id/system/lineage/waydroid_x86_64/VANILLA.json
  - Android 13 GAPPS: https://ota.waydro.id/system/lineage/waydroid_x86_64/GAPPS.json
  - vendor MAINLINE: https://ota.waydro.id/vendor/waydroid_x86_64/MAINLINE.json
- Image files (SourceForge): https://sourceforge.net/projects/waydroid/files/images/
- Community builds (Android 13–16 / Android TV): https://github.com/WayDroid-ATV/waydroid-builds , https://github.com/WayDroid-ATV/waydroid-androidtv-builds
- Extras script (libhoudini / GApps / Magisk / Widevine): https://github.com/casualsnek/waydroid_script
- Game Mode launcher: https://github.com/chenx-dust/waydroid-launcher

**SteamOS / Nix**

- Nix official installer: https://github.com/NixOS/nix-installer (entry: https://artifacts.nixos.org/nix-installer)
- SteamOS Waydroid Nix project: https://github.com/Labaman/SteamOS-Waydroid-Nix-Installer
- Bazzite (reference implementation for gamescope): https://github.com/ublue-os/bazzite

**MAA / automation**

- MAA: https://github.com/MaaAssistantArknights/MaaAssistantArknights
- maa-cli: https://github.com/MaaAssistantArknights/maa-cli
- MAA docs: https://docs.maa.plus/

**Decky / plugins**

- Decky Loader: https://github.com/SteamDeckHomebrew/decky-loader
- Plugin template: https://github.com/SteamDeckHomebrew/decky-plugin-template

**Artwork**

- SteamGridDB: https://www.steamgriddb.com/
- Steam custom artwork dir: <code>userdata/&lt;id&gt;/config/grid/</code>

---

## 13. Companion plugin: Maa Deck (Decky QAM panel)

Besides the system-side install guide, this repo also ships the **Decky plugin** that turns it into a "farm anytime" setup. Source: [decky-maa/](decky-maa/).

- Start/stop **MAA (maa-cli)** from the Game Mode QAM; basic and advanced modes;
- The advanced mode ports the task pages of the local GTK console (startup / fight / recruit / infrast / mall / award / daily / roguelike / copilot / SSS / paradox / reclamation), with command preview and a task queue;
- Drives the game inside the Waydroid container over **ADB**;
- Ships a **Waydroid session watchdog**: when the session stops it kills the whole MAA process group and clears the queue, so no ghost processes remain.

See [decky-maa/README.md](decky-maa/README.md) for install/build/deploy.

> The plugin is referenced as a **git submodule** (standalone repo: [ranlinyi/decky-maa](https://github.com/ranlinyi/decky-maa)). Clone this repo with <code>--recursive</code>, or run <code>git submodule update --init --recursive</code> afterwards.

Companion files referenced by this guide (Steam grid artwork, the binder shim patch, the Game Mode launcher, and the local copy of the setup script) live in [resources/](resources/).

---

## License / disclaimer

Released into the public domain under the [Unlicense](LICENSE). Use it however you like.

Commands are experience-based notes: replace the placeholders (<code>DECK_IP</code>, <code>DECK_PASS</code>), evaluate the risks yourself, and back up before touching root, kernel modules or system config.
