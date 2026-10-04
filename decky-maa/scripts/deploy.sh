#!/usr/bin/env bash
# 打包并部署 MaaDeck 到 Steam Deck。
#
# 注意：插件目录 ~/homebrew/plugins 属主是 root，安装与重启 plugin_loader 都需要
# Deck 上的 sudo。运行本脚本属于特权操作，请先取得明确同意。
set -eo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
DECK="$DECK_HOST"
[ -n "$DECK" ] || DECK="deck@192.168.0.2"
PASS="$DECK_PASS"
if [ -z "$PASS" ]; then
  echo "请通过环境变量提供 Deck 登录/提权密码，例如：DECK_PASS=xxx scripts/deploy.sh" >&2
  exit 1
fi
REMOTE_DIR="/home/deck/homebrew/plugins/MaaDeck"
PKG="/tmp/maadeck-$$.tar.gz"

echo "[+] 打包 ..."
# package.json 必须包含：Decky 只有看到其中的 "type": "module" 才会用 ESM 方式加载前端。
tar czf "$PKG" -C "$HERE" plugin.json package.json main.py dist bin

echo "[+] 上传 ..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=accept-new "$PKG" "$DECK:/tmp/maadeck.tar.gz"

echo "[+] 安装（需要 Deck sudo）..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new "$DECK" 'bash -ls' <<REMOTE
set -e
echo "$PASS" | sudo -S mkdir -p '$REMOTE_DIR'
echo "$PASS" | sudo -S tar xzf /tmp/maadeck.tar.gz -C '$REMOTE_DIR'
echo "$PASS" | sudo -S chown -R root:root '$REMOTE_DIR'
rm -f /tmp/maadeck.tar.gz
echo '==> 重启 plugin_loader'
echo "$PASS" | sudo -S systemctl restart plugin_loader
sleep 2
systemctl is-active plugin_loader || true
REMOTE

rm -f "$PKG"
echo "[+] 完成：游戏模式按 ... 打开 QAM 查看 Maa Deck"
