#!/usr/bin/env bash
# 获取 MaaDeck 运行所需的外部二进制：maa-cli 与 adb (Android platform-tools)。
# 产物放到 ./bin/ ，随插件一起部署到 Deck（bin/ 已在 .gitignore 中）。
set -eo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$HERE/bin"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$BIN"

# ---------- adb ----------
ADB_DEST="$BIN/adb"
if [ -x "$ADB_DEST" ]; then
  echo "[=] adb 已存在，跳过"
else
  echo "[+] 下载 platform-tools ..."
  curl -fL -o "$TMP/pt.zip" https://dl.google.com/android/repository/platform-tools-latest-linux.zip
  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$TMP/pt.zip" -d "$TMP"
  else
    python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$TMP/pt.zip" "$TMP"
  fi
  install -m 755 "$TMP/platform-tools/adb" "$ADB_DEST"
  echo "[+] adb -> $ADB_DEST"
fi

# ---------- maa-cli ----------
MAA_DEST="$BIN/maa"
if [ -x "$MAA_DEST" ]; then
  echo "[=] maa 已存在，跳过"
else
  CHANNEL="$MAA_CHANNEL"
  [ -n "$CHANNEL" ] || CHANNEL="stable"
  VURL="https://raw.githubusercontent.com/MaaAssistantArknights/maa-cli/version/$CHANNEL.txt"
  echo "[+] 获取 maa-cli 版本信息 ($CHANNEL) ..."
  INFO="$(curl -fsSL "$VURL")"
  VERSION="$(printf '%s\n' "$INFO" | sed -n 's/^VERSION=//p')"
  NAME="$(printf '%s\n' "$INFO" | sed -n 's/^X86_64_UNKNOWN_LINUX_GNU_NAME=//p')"
  SHA="$(printf '%s\n' "$INFO" | sed -n 's/^X86_64_UNKNOWN_LINUX_GNU_SHA256=//p')"
  [ -n "$VERSION" ] && [ -n "$NAME" ] || { echo "无法解析版本信息"; exit 1; }
  URL="https://github.com/MaaAssistantArknights/maa-cli/releases/download/v$VERSION/$NAME"
  echo "[+] 下载 maa-cli v$VERSION ($NAME)"
  curl -fL -o "$TMP/maa.tar.gz" "$URL"
  if [ -n "$SHA" ]; then
    echo "$SHA  $TMP/maa.tar.gz" | sha256sum -c -
  fi
  tar -xzf "$TMP/maa.tar.gz" -C "$TMP"
  B="$(find "$TMP" -name maa -type f | head -n 1)"
  [ -n "$B" ] || { echo "压缩包中没有 maa"; exit 1; }
  install -m 755 "$B" "$MAA_DEST"
  echo "[+] maa -> $MAA_DEST"
fi

echo "[+] 完成："
ls -l "$BIN"
