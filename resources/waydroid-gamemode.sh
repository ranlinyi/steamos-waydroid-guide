#!/usr/bin/env bash
# Waydroid Game Mode launcher for Steam Deck
set -euo pipefail

# Game Mode has no visible stderr → log everything for diagnostics.
LOG="$HOME/.local/share/waydroid/gamemode.log"
mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
printf '\n===== waydroid-gamemode %s =====\n' "$(date)"

# Steam Game Mode injects LD_PRELOAD=gameoverlayrenderer.so (depends on libGL.so.1) and
# steam-runtime LD_LIBRARY_PATH — both break Nix binaries (cage, waydroid: "libGL.so.1 not
# found", even bash fails to start). Clear them. cage finds the GPU drivers itself via
# /run/opengl-driver (targets.genericLinux.gpu), it needs no LD_LIBRARY_PATH.
# (Reproduced: LD_PRELOAD=overlay → Nix bash fails on libGL.)
unset LD_PRELOAD LD_LIBRARY_PATH

NIX_BIN="$HOME/.nix-profile/bin"
# Steam Game Mode launches the script with its own PATH (without ~/.nix-profile/bin) →
# bare waydroid/wlr-randr are not found inside `cage -- bash` ("command not found").
# Add NIX_BIN to PATH and export → the nested bash inside cage inherits it and finds Nix binaries.
export PATH="$NIX_BIN:$PATH"
WAYDROID="$NIX_BIN/waydroid"
CAGE="$NIX_BIN/cage"
# Resolution for both the cage output and (via Maa Deck) the Android surface.
# Maa Deck writes $RES_FILE when switching; a valid value there wins over the
# Steam launch option so one switch changes the whole display consistently.
RES_FILE="$HOME/.local/share/waydroid/gamemode-resolution"
RES=""
if [[ -r "$RES_FILE" ]]; then
  RES="$(head -n1 "$RES_FILE" 2>/dev/null | tr -d '[:space:]')" || RES=""
fi
if ! [[ "$RES" =~ ^[0-9]+x[0-9]+$ ]]; then
  RES="${WAYDROID_RES:-1280x800}"   # native Deck resolution; override via env
fi

[[ -x "$WAYDROID" ]] || { echo "FATAL: waydroid not found — run: home-manager switch"; exit 1; }
[[ -x "$CAGE" ]]     || { echo "FATAL: cage not found — run: home-manager switch"; exit 1; }

# The container is started by systemd at boot (service enabled). In Game Mode there is NO way
# to enter a sudo/polkit password → do NOT try to start it with sudo (would hang on password
# prompt — one cause of the infinite logo screen). Require the service already active.
if ! systemctl is-active --quiet waydroid-container.service; then
  echo "FATAL: waydroid-container.service is not active (should autostart at boot)"
  exit 1
fi

# Touch fix: Steam marks a non-Steam shortcut as "touch = left mouse" via the X11
# root property STEAM_TOUCH_CLICK_MODE=1. gamescope honours it and turns every touch
# into a single mouse pointer, so cage/Waydroid never receives wl_touch and Android
# only ever sees one pointer (multi-touch degrades to single). Force it back to 4
# (passthrough) while the game runs; re-assert because Steam can rewrite it.
touchfix() {
  while :; do
    for d in :0 :1; do
      v=$(DISPLAY=$d /usr/bin/xprop -root STEAM_TOUCH_CLICK_MODE 2>/dev/null) || continue
      case "$v" in
        *"= 4") ;;
        *) DISPLAY=$d /usr/bin/xprop -root -f STEAM_TOUCH_CLICK_MODE 32c -set STEAM_TOUCH_CLICK_MODE 4 2>/dev/null || true ;;
      esac
    done
    sleep 2
  done
}
touchfix &
TOUCHFIX_PID=$!

# Cleanup on any exit (normal, SIGTERM from Steam, Ctrl+C)
cleanup() {
  kill "$TOUCHFIX_PID" 2>/dev/null || true
  "$WAYDROID" session stop &>/dev/null || true
}
trap cleanup EXIT

# cage = nested Wayland compositor. gamescope fullscreens the cage WINDOW, and Android
# renders inside cage. A direct show-full-ui does NOT create a gamescope window → gamescope
# waits forever → Steam logo stuck forever. Both ryanrudolfoba and Bazzite use cage.
# Inside cage: set output resolution (wlr-randr, auto-detect name) and start the UI.
# cage in foreground: Steam keeps the "game" running while the script lives; exiting Android
# → cage exits → trap cleans up the session.
"$CAGE" -- bash -uc '
  out=$(wlr-randr 2>/dev/null | awk "NR==1{print \$1; exit}")
  [ -n "$out" ] && wlr-randr --output "$out" --custom-mode '"$RES"' 2>/dev/null || true

  waydroid show-full-ui &
  wpid=$!

  # surfaceflinger (inside Android) takes ~15-20s; then set max volume (fix for "no sound").
  for _ in $(seq 1 30); do pgrep -x surfaceflinger >/dev/null && break; sleep 1; done
  sleep 5
  # Enforce the Android surface resolution from the same RES value, so a stale
  # persisted property can never desync it from the cage output.
  for _ in 1 2 3 4 5; do
    waydroid prop set persist.waydroid.width '"${RES%x*}"' >/dev/null 2>&1 \
      && waydroid prop set persist.waydroid.height '"${RES#*x}"' >/dev/null 2>&1 \
      && break
    sleep 2
  done
  waydroid shell -- cmd media_session volume --stream 3 --set 15 2>/dev/null || true
  # Gamepad: uevent retrigger — write "add" to /sys/.../input*/event*/uevent →
  # kernel sends udev event → Android registers the controller (Bazzite pattern).
  env -u LD_LIBRARY_PATH /usr/bin/sudo /etc/waydroid-fix-controllers 2>/dev/null || true

  wait "$wpid"
'
