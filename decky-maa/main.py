"""MaaDeck backend.

Decky (root) plugin that drives maa-cli against the game running inside
Waydroid on a Steam Deck.

The plugin is deliberately a thin control panel: it does not embed MaaCore.
It prepares a maa-cli config/profile, starts/stops an external maa process
and proxies status + logs to the QAM frontend.
"""

import asyncio
import json
import os
import shlex
import shutil
import signal
import subprocess
import threading
import time
from pathlib import Path

import decky

# ---------------------------------------------------------------------------
# environment hygiene
# ---------------------------------------------------------------------------
# Decky's PyInstaller runtime injects LD_LIBRARY_PATH / LD_PRELOAD pointing at
# its own bundled libraries. That makes system binaries (systemctl, adb, maa)
# load the wrong libcrypto / libGL and fail. Drop them and use a predictable
# PATH that also contains the Nix profile where waydroid / cage live.
for _k in ("LD_LIBRARY_PATH", "LD_PRELOAD", "LD_AUDIT"):
    os.environ.pop(_k, None)

DECK_HOME = "/home/deck"
NIX_BIN = DECK_HOME + "/.nix-profile/bin"
DEFAULT_PATH = ":".join([
    NIX_BIN,
    "/usr/local/sbin", "/usr/local/bin", "/usr/sbin", "/usr/bin", "/sbin", "/bin",
])
os.environ["PATH"] = DEFAULT_PATH
os.environ.setdefault("XDG_RUNTIME_DIR", "/run/user/1000")


def _p(name, fallback):
    return Path(getattr(decky, name, fallback))


PLUGIN_DIR = _p("DECKY_PLUGIN_DIR", "/home/deck/homebrew/plugins/MaaDeck")
SETTINGS_DIR = _p("DECKY_PLUGIN_SETTINGS_DIR", "/home/deck/homebrew/settings/MaaDeck")
RUNTIME_DIR = _p("DECKY_PLUGIN_RUNTIME_DIR", "/home/deck/homebrew/data/MaaDeck")
LOG_DIR = _p("DECKY_PLUGIN_LOG_DIR", "/home/deck/homebrew/logs/MaaDeck")

CONFIG_FILE = SETTINGS_DIR / "config.json"
RUN_LOG = LOG_DIR / "maa-run.log"
JOB_LOG = LOG_DIR / "maa-job.log"

MAA_BIN = PLUGIN_DIR / "bin" / "maa"
ADB_BIN = PLUGIN_DIR / "bin" / "adb"
WAYDROID_BIN = Path(NIX_BIN) / "waydroid"

# Everything maa-related lives on the home partition (root fs has ~1 GB left).
MAA_ROOT = RUNTIME_DIR / "maa"
MAA_CONFIG_DIR = MAA_ROOT / "config"
MAA_DATA_HOME = MAA_ROOT / "data"
MAA_CACHE_HOME = MAA_ROOT / "cache"
MAA_PROFILES_DIR = MAA_CONFIG_DIR / "profiles"
MAA_TASKS_DIR = MAA_CONFIG_DIR / "tasks"
# maa_dirs::library() == $XDG_DATA_HOME/maa/lib
MAA_DATA_DIR = MAA_DATA_HOME / "maa"
MAA_CORE_LIB = MAA_DATA_DIR / "lib" / "libMaaCore.so"

VERSION_CACHE_TTL = 60.0

DEFAULTS = {
    "adb_address": "192.168.240.112:5555",
    "adb_path": "",
    "maa_path": "",
    # "manual": plugin runs adb connect itself, maa-cli just talks to the address.
    # "waydroid": maa-cli's built-in Waydroid preset manages session + adb.
    "connection_mode": "manual",
    "log_level": "info",
    "touch_mode": "",
    "auto_update_resource": False,
    "default_command": "startup Official",
    "ui_mode": "basic",
    "ui_page": "startup",
    "profile": "default",
    "user_resource": False,
    "dry_run": False,
    "verbose": 0,
    "auto_connect": True,
    "auto_wake": False,
    "stop_on_session_end": True,
    "kill_adb_on_exit": False,
    "adv_pages": {},
}

PREDEFINED = [
    {"id": "startup Official", "label": "启动游戏（官服）"},
    {"id": "startup Bilibili", "label": "启动游戏（B 服）"},
    {"id": "fight", "label": "开始战斗（上次/当前关卡）"},
    {"id": "closedown", "label": "关闭游戏客户端"},
]

TASK_SUFFIXES = (".toml", ".json", ".yaml", ".yml")

# ---------------------------------------------------------------------------
# advanced pages (ported and simplified from the local GTK MAA console)
# ---------------------------------------------------------------------------
CLIENTS = [
    ["Official", "官服"], ["Bilibili", "B 服"], ["Txwy", "台服"],
    ["YoStarEN", "美服"], ["YoStarJP", "日服"], ["YoStarKR", "韩服"],
]
ROGUELIKE_THEMES = [
    ["Phantom", "傀影与猩红孤钻"], ["Mizuki", "水月与深蓝之树"],
    ["Sami", "探索者的银凇止境"], ["Sarkaz", "萨卡兹的无终奇语"],
    ["JieGarden", "界园"],
]
ROGUELIKE_MODES = [
    [0, "刷分/奖励点数"], [1, "刷源石锭（第一层投资完退出）"], [4, "凹开局"],
    [5, "刷坍缩范式（Sami）"], [6, "刷月度小队"], [7, "刷深入调查"],
    [10001, "快速通过第一层（Sarkaz）"], [20001, "刷常乐节点（JieGarden）"],
]
DRONES = [
    ["_NotUse", "不使用无人机"], ["Money", "龙门币"], ["SyntheticJade", "合成玉"],
    ["CombatRecord", "作战记录"], ["PureGold", "赤金"], ["OriginStone", "源石碎片"], ["Chip", "芯片"],
]
FACILITIES = ["Mfg", "Trade", "Power", "Control", "Reception", "Office", "Dorm",
              "Processing", "Training", "AssistantChange"]


def _f(key, label, type_, default=None, options=None, help_=""):
    return {"key": key, "label": label, "type": type_, "default": default,
            "options": options or [], "help": help_}


ADV_PAGES = [
    {"key": "startup", "title": "开始唤醒", "group": "日常", "mode": "cli",
     "subtitle": "启动游戏并进入主界面", "fields": [
         _f("client", "客户端", "select", "Official", CLIENTS),
         _f("account", "账号名", "text", ""),
         _f("start_game", "启动游戏客户端", "bool", True),
     ]},
    {"key": "closedown", "title": "关闭游戏", "group": "连接", "mode": "cli",
     "subtitle": "关闭当前客户端", "fields": [
         _f("client", "客户端", "select", "Official", CLIENTS),
     ]},
    {"key": "fight", "title": "作战", "group": "日常", "mode": "task",
     "subtitle": "理智作战、掉落与上报", "fields": [
         _f("stage", "关卡代号", "text", "", None, "留空=上次/当前关卡"),
         _f("medicine", "理智药数量", "int", 0),
         _f("expire_days", "过期理智药(天)", "int", 0),
         _f("stone", "源石数量", "int", 0),
         _f("times", "战斗次数", "int", 0, None, "0=不限次数"),
         _f("series", "代理倍率", "int", 1, None, "-1 禁用连战，0 自动"),
         _f("dr_grandet", "节省理智碎石 (DrGrandet)", "bool", False),
         _f("report_penguin", "上报企鹅物流", "bool", False),
         _f("penguin_id", "企鹅物流 ID", "text", ""),
         _f("report_yituliu", "上报一图流", "bool", False),
         _f("yituliu_id", "一图流 ID", "text", ""),
     ]},
    {"key": "recruit", "title": "自动公招", "group": "日常", "mode": "task",
     "subtitle": "标签组合与公开招募", "fields": [
         _f("select", "点击标签的星级", "text", "4", None, "逗号分隔，如 4 或 4,5"),
         _f("confirm", "确认的星级", "text", "3,4", None, "逗号分隔，如 3,4"),
         _f("refresh", "刷新 3★ 标签", "bool", False),
         _f("times", "招募次数", "int", 4, None, "0=只计算不招募"),
         _f("set_time", "设置招募时限", "bool", True),
         _f("expedite", "使用加急许可", "bool", False),
         _f("extra_mode", "额外标签策略", "select", 0, [
             [0, "默认行为"], [1, "选 3 个 Tag"], [2, "尽量选更多高星 Tag"]]),
         _f("preserve_tags", "保留标签", "text", "", None, "逗号分隔"),
         _f("first_tags", "强制首选标签", "text", "", None, "逗号分隔"),
     ]},
    {"key": "infrast", "title": "基建换班", "group": "日常", "mode": "task",
     "subtitle": "设施排班、无人机与宿舍", "fields": [
         _f("mode", "换班模式", "select", 0, [
             [0, "默认换班（自动计算组合）"], [10000, "自定义换班（读排班文件）"], [20000, "一键轮换"]]),
         _f("facilities", "换班设施", "text", "Mfg,Trade,Power,Control,Reception,Office,Dorm", None, "逗号分隔"),
         _f("drones", "无人机用途", "select", "_NotUse", DRONES),
         _f("threshold", "心情阈值", "float", 0.3, None, "0~1"),
         _f("replenish", "贸易站源石碎片自动补货", "bool", False),
         _f("dorm_notstationed", "宿舍「未进驻」选项", "bool", False),
         _f("dorm_trust", "宿舍填入信赖未满干员", "bool", False),
         _f("message_board", "领取会客室信息板信用", "bool", True),
         _f("clue_exchange", "进行线索交流", "bool", True),
         _f("send_clue", "赠送线索", "bool", True),
         _f("continue_training", "继续未完成的专精训练", "bool", False),
         _f("filename", "排班文件路径", "text", "", None, "仅自定义模式"),
         _f("plan_index", "方案序号", "int", 0),
     ]},
    {"key": "mall", "title": "信用购物", "group": "日常", "mode": "task",
     "subtitle": "信用商店购物", "fields": [
         _f("visit_friends", "访问好友基建", "bool", True),
         _f("shopping", "启用购物", "bool", True),
         _f("force_full", "信用溢出时无视黑名单", "bool", False),
         _f("only_discount", "只购买折扣物品", "bool", False),
         _f("reserve", "信用低于 300 停止购买", "bool", False),
         _f("credit_fight", "借助战打一局 OF-1", "bool", False),
         _f("formation_index", "OF-1 编队编号", "int", 0),
         _f("buy_first", "优先购买", "text", "招聘许可,龙门币", None, "逗号分隔"),
         _f("blacklist", "黑名单", "text", "碳,家具", None, "逗号分隔"),
     ]},
    {"key": "award", "title": "领取奖励", "group": "日常", "mode": "task",
     "subtitle": "任务、邮件与限时奖励", "fields": [
         _f("award", "每日/每周任务奖励", "bool", True),
         _f("mail", "邮件奖励", "bool", True),
         _f("recruit", "限定池免费单抽", "bool", True),
         _f("orundum", "幸运墙合成玉", "bool", True),
         _f("mining", "限时开采许可合成玉", "bool", True),
         _f("specialaccess", "月卡奖励", "bool", True),
     ]},
    {"key": "daily", "title": "一键日常", "group": "日常", "mode": "task",
     "subtitle": "按顺序执行一组日常（使用各页已保存参数）", "fields": [
         _f("startup", "开始唤醒", "bool", True),
         _f("recruit", "自动公招", "bool", True),
         _f("infrast", "基建换班", "bool", True),
         _f("fight", "作战", "bool", True),
         _f("mall", "信用购物", "bool", True),
         _f("award", "领取奖励", "bool", True),
         _f("closedown", "关闭游戏", "bool", False),
     ]},
    {"key": "roguelike", "title": "集成战略", "group": "进阶", "mode": "task",
     "subtitle": "肉鸽自动刷取", "fields": [
         _f("theme", "主题", "select", "Phantom", ROGUELIKE_THEMES),
         _f("mode", "模式", "select", 0, ROGUELIKE_MODES),
         _f("squad", "分队", "text", "指挥分队"),
         _f("roles", "职业组", "text", "取长补短"),
         _f("core_char", "核心干员", "text", ""),
         _f("starts_count", "探索次数", "int", 0, None, "0=无限"),
         _f("difficulty", "难度", "int", 0),
         _f("investments_count", "投资次数", "int", 0),
         _f("use_support", "使用助战干员", "bool", False),
         _f("use_nonfriend", "允许非好友助战", "bool", False),
         _f("disable_investment", "禁用投资", "bool", False),
         _f("investment_with_more_score", "投资后尝试购物", "bool", False),
         _f("no_stop_when_investment_full", "投资满了也不停止", "bool", True),
         _f("start_with_elite_two", "凹精二直升", "bool", False),
         _f("only_start_with_elite_two", "只凹精二直升", "bool", False),
         _f("stop_at_final_boss", "Boss 前停止", "bool", False),
         _f("refresh_trader_with_dice", "用骰子刷新商店", "bool", False),
         _f("use_foldartal", "使用密文板", "bool", False),
         _f("seed", "固定种子", "text", ""),
     ]},
    {"key": "copilot", "title": "抄作业", "group": "进阶", "mode": "cli",
     "subtitle": "Copilot 自动抄作业", "fields": [
         _f("uris", "作业地址", "text", "", None, "逗号分隔，prts:// 或本地路径"),
         _f("raid", "突袭模式", "select", "normal", [
             ["normal", "普通"], ["raid", "突袭"], ["both", "普通 + 突袭"]]),
         _f("formation", "自动编队", "bool", False),
         _f("formation_index", "编队栏位", "int", 0),
         _f("add_trust", "按信赖值填充空位", "bool", False),
         _f("ignore_requirements", "忽略干员需求", "bool", False),
         _f("use_potion", "理智不足时使用理智药", "bool", False),
         _f("support_usage", "助战策略", "select", 0, [
             [0, "不使用助战"], [1, "仅缺 1 名时"], [2, "缺 1 名时指定助战"], [3, "缺 1 名时随机"]]),
         _f("support_name", "指定助战干员", "text", ""),
         _f("loop_times", "循环次数", "int", 1),
     ]},
    {"key": "sss", "title": "保全派驻", "group": "进阶", "mode": "cli",
     "subtitle": "SSSCopilot", "fields": [
         _f("uri", "作业地址", "text", ""),
         _f("loop_times", "循环次数", "int", 1),
     ]},
    {"key": "paradox", "title": "悖论模拟", "group": "进阶", "mode": "cli",
     "subtitle": "ParadoxCopilot", "fields": [
         _f("uris", "作业列表", "text", "", None, "逗号分隔"),
     ]},
    {"key": "reclamation", "title": "生息演算", "group": "进阶", "mode": "task",
     "subtitle": "生息演算自动刷取", "fields": [
         _f("theme", "主题", "select", "Tales", [["Tales", "沙洲遗闻"]]),
         _f("mode", "刷取模式", "select", 1, [
             [0, "模式 0：反复进出关卡"], [1, "模式 1：制作工具"]]),
         _f("tools", "制作工具名称", "text", "荧光棒", None, "逗号分隔"),
         _f("increase_mode", "增加数量方式", "select", 0, [[0, "点击增加"], [1, "长按增加"]]),
         _f("batches", "每局批次", "int", 16),
     ]},
    {"key": "run", "title": "自定义任务", "group": "工具箱", "mode": "cli",
     "subtitle": "运行 tasks/ 下的任务文件", "fields": [
         _f("name", "任务名", "text", "", None, "不带扩展名"),
     ]},
    {"key": "activity", "title": "活动查询", "group": "工具箱", "mode": "cli",
     "subtitle": "查询当前关卡与活动", "fields": [
         _f("client", "客户端", "select", "Official", CLIENTS),
     ]},
]


def _as_list(v):
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        return [x.strip() for x in v.replace("，", ",").replace("\n", ",").split(",") if x.strip()]
    return []


def _as_int(v, default=0):
    try:
        return int(float(str(v).strip()))
    except Exception:
        return default


def _as_float(v, default=0.0):
    try:
        return float(str(v).strip())
    except Exception:
        return default


def _write_task_file(name, payload):
    MAA_TASKS_DIR.mkdir(parents=True, exist_ok=True)
    path = MAA_TASKS_DIR / (name + ".json")
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    return path


def _global_opts(cfg):
    argv = []
    addr = (cfg.get("adb_address") or "").strip()
    if addr:
        argv += ["-a", addr]
    prof = (cfg.get("profile") or "default").strip()
    if prof and prof != "default":
        argv += ["-p", prof]
    if cfg.get("user_resource"):
        argv.append("--user-resource")
    if cfg.get("dry_run"):
        argv.append("--dry-run")
    v = _as_int(cfg.get("verbose"), 0)
    if v > 0:
        argv += ["-v"] * min(v, 4)
    elif v < 0:
        argv += ["-q"] * min(-v, 4)
    return argv


def _task_entry(page_key, p):
    if page_key == "startup":
        params = {"client_type": p.get("client") or "Official",
                  "start_game_enabled": bool(p.get("start_game", True))}
        if (p.get("account") or "").strip():
            params["account_name"] = p["account"].strip()
        return {"type": "StartUp", "params": params}
    if page_key == "closedown":
        return {"type": "CloseDown", "params": {"client_type": p.get("client") or "Official"}}
    if page_key == "fight":
        params = {"stage": (p.get("stage") or "").strip(),
                  "medicine": _as_int(p.get("medicine")),
                  "medicine_expire_days": _as_int(p.get("expire_days")),
                  "stone": _as_int(p.get("stone")),
                  "series": _as_int(p.get("series"), 1)}
        t = _as_int(p.get("times"))
        if t > 0:
            params["times"] = t
        if p.get("dr_grandet"):
            params["DrGrandet"] = True
        if p.get("report_penguin"):
            params["report_to_penguin"] = True
            if (p.get("penguin_id") or "").strip():
                params["penguin_id"] = p["penguin_id"].strip()
        if p.get("report_yituliu"):
            params["report_to_yituliu"] = True
            if (p.get("yituliu_id") or "").strip():
                params["yituliu_id"] = p["yituliu_id"].strip()
        return {"type": "Fight", "params": params}
    if page_key == "recruit":
        params = {"refresh": bool(p.get("refresh")),
                  "select": [_as_int(x) for x in _as_list(p.get("select"))] or [4],
                  "confirm": [_as_int(x) for x in _as_list(p.get("confirm"))],
                  "times": _as_int(p.get("times"), 4),
                  "set_time": bool(p.get("set_time", True)),
                  "expedite": bool(p.get("expedite")),
                  "extra_tags_mode": _as_int(p.get("extra_mode"))}
        if _as_list(p.get("preserve_tags")):
            params["preserve_tags"] = _as_list(p.get("preserve_tags"))
        if _as_list(p.get("first_tags")):
            params["first_tags"] = _as_list(p.get("first_tags"))
        return {"type": "Recruit", "params": params}
    if page_key == "infrast":
        mode = _as_int(p.get("mode"))
        params = {"mode": mode,
                  "facility": _as_list(p.get("facilities")) or FACILITIES[:7],
                  "threshold": round(_as_float(p.get("threshold"), 0.3), 2),
                  "replenish": bool(p.get("replenish")),
                  "dorm_notstationed_enabled": bool(p.get("dorm_notstationed")),
                  "dorm_trust_enabled": bool(p.get("dorm_trust")),
                  "reception_message_board": bool(p.get("message_board", True)),
                  "reception_clue_exchange": bool(p.get("clue_exchange", True)),
                  "reception_send_clue": bool(p.get("send_clue", True)),
                  "continue_training": bool(p.get("continue_training"))}
        if mode == 0:
            params["drones"] = p.get("drones") or "_NotUse"
        elif mode == 10000:
            if (p.get("filename") or "").strip():
                params["filename"] = p["filename"].strip()
            params["plan_index"] = _as_int(p.get("plan_index"))
        return {"type": "Infrast", "params": params}
    if page_key == "mall":
        return {"type": "Mall", "params": {
            "visit_friends": bool(p.get("visit_friends", True)),
            "shopping": bool(p.get("shopping", True)),
            "buy_first": _as_list(p.get("buy_first")),
            "blacklist": _as_list(p.get("blacklist")),
            "force_shopping_if_credit_full": bool(p.get("force_full")),
            "only_buy_discount": bool(p.get("only_discount")),
            "reserve_max_credit": bool(p.get("reserve")),
            "credit_fight": bool(p.get("credit_fight")),
            "formation_index": _as_int(p.get("formation_index"))}}
    if page_key == "award":
        return {"type": "Award", "params": {
            "award": bool(p.get("award", True)), "mail": bool(p.get("mail", True)),
            "recruit": bool(p.get("recruit", True)), "orundum": bool(p.get("orundum", True)),
            "mining": bool(p.get("mining", True)), "specialaccess": bool(p.get("specialaccess", True))}}
    if page_key == "roguelike":
        params = {"theme": p.get("theme") or "Phantom", "mode": _as_int(p.get("mode")),
                  "squad": (p.get("squad") or "").strip(), "roles": (p.get("roles") or "").strip(),
                  "use_support": bool(p.get("use_support")),
                  "use_nonfriend_support": bool(p.get("use_nonfriend")),
                  "investment_enabled": not bool(p.get("disable_investment")),
                  "investment_with_more_score": bool(p.get("investment_with_more_score")),
                  "stop_when_investment_full": not bool(p.get("no_stop_when_investment_full")),
                  "start_with_elite_two": bool(p.get("start_with_elite_two")),
                  "only_start_with_elite_two": bool(p.get("only_start_with_elite_two")),
                  "stop_at_final_boss": bool(p.get("stop_at_final_boss")),
                  "refresh_trader_with_dice": bool(p.get("refresh_trader_with_dice")),
                  "use_foldartal": bool(p.get("use_foldartal"))}
        if (p.get("core_char") or "").strip():
            params["core_char"] = p["core_char"].strip()
        if _as_int(p.get("starts_count")) > 0:
            params["starts_count"] = _as_int(p.get("starts_count"))
        params["difficulty"] = _as_int(p.get("difficulty"))
        if _as_int(p.get("investments_count")) > 0:
            params["investments_count"] = _as_int(p.get("investments_count"))
        if (p.get("seed") or "").strip():
            params["start_with_seed"] = p["seed"].strip()
        return {"type": "Roguelike", "params": params}
    if page_key == "reclamation":
        params = {"theme": p.get("theme") or "Tales", "mode": _as_int(p.get("mode"), 1),
                  "increment_mode": _as_int(p.get("increase_mode")),
                  "num_craft_batches": _as_int(p.get("batches"), 16)}
        tools = _as_list(p.get("tools"))
        if tools:
            params["tools_to_craft"] = tools
        return {"type": "Reclamation", "params": params}
    return None


def _cli_argv(page_key, p):
    if page_key == "startup":
        args = [p.get("client") or "Official"]
        if (p.get("account") or "").strip():
            args += ["--account-name", p["account"].strip()]
        return ["startup"] + args
    if page_key == "closedown":
        return ["closedown", p.get("client") or "Official"]
    if page_key == "copilot":
        args = _as_list(p.get("uris"))
        if (p.get("raid") or "normal") != "normal":
            args += ["--raid", p["raid"]]
        if p.get("formation"):
            args.append("--formation")
            fi = _as_int(p.get("formation_index"))
            if fi:
                args += ["--formation-index", str(fi)]
        if p.get("add_trust"):
            args.append("--add-trust")
        if p.get("ignore_requirements"):
            args.append("--ignore-requirements")
        if p.get("use_potion"):
            args.append("--use-sanity-potion")
        su = _as_int(p.get("support_usage"))
        if su:
            args += ["--support-unit-usage", str(su)]
        if (p.get("support_name") or "").strip():
            args += ["--support-unit-name", p["support_name"].strip()]
        lt = _as_int(p.get("loop_times"), 1)
        if lt != 1:
            args += ["--loop-times", str(lt)]
        return ["copilot"] + args
    if page_key == "sss":
        args = []
        if (p.get("uri") or "").strip():
            args.append(p["uri"].strip())
        lt = _as_int(p.get("loop_times"), 1)
        if lt != 1:
            args += ["--loop-times", str(lt)]
        return ["ssscopilot"] + args
    if page_key == "paradox":
        return ["paradoxcopilot"] + _as_list(p.get("uris"))
    if page_key == "run":
        name = (p.get("name") or "").strip()
        return ["run", name] if name else ["list"]
    if page_key == "activity":
        return ["activity", p.get("client") or "Official"]
    return []


def _build_command(cfg, page_key, params, force_dry=False):
    page = next((x for x in ADV_PAGES if x["key"] == page_key), None)
    if page is None:
        return {"ok": False, "error": "未知页面: %s" % page_key}
    p = dict(params or {})
    globals_ = _global_opts(cfg)
    out = {"ok": True, "page": page_key, "title": page["title"],
           "payload": None, "task_file": "", "label": page["title"], "argv": []}
    if page.get("mode") == "task":
        if page_key == "daily":
            saved = cfg.get("adv_pages") or {}
            tasks = []
            for sub in ("startup", "recruit", "infrast", "fight", "mall", "award", "closedown"):
                if p.get(sub):
                    entry = _task_entry(sub, dict(saved.get(sub) or {}))
                    if entry:
                        tasks.append(entry)
            payload = {"tasks": tasks}
            out["label"] = "一键日常（%d 步）" % len(tasks)
        else:
            entry = _task_entry(page_key, p)
            if entry is None:
                return {"ok": False, "error": "该页不支持任务文件"}
            payload = {"tasks": [entry]}
        name = "gui-" + page_key
        out["payload"] = payload
        out["task_file"] = str(MAA_TASKS_DIR / (name + ".json"))
        out["argv"] = ["run", name] + globals_
    else:
        out["argv"] = _cli_argv(page_key, p) + globals_
    if force_dry and "--dry-run" not in out["argv"]:
        out["argv"].append("--dry-run")
    return out


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _load_config():
    cfg = dict(DEFAULTS)
    try:
        if CONFIG_FILE.exists():
            data = json.loads(CONFIG_FILE.read_text())
            if isinstance(data, dict):
                for k, v in data.items():
                    cfg[k] = v
    except Exception as e:
        decky.logger.warning("MaaDeck: config load failed: %s" % e)
    return cfg


def _save_config(cfg):
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG_FILE.with_name("config.json.tmp")
    tmp.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
    os.replace(str(tmp), str(CONFIG_FILE))


def _maa_path(cfg):
    p = (cfg.get("maa_path") or "").strip()
    if p:
        return p
    if MAA_BIN.exists():
        return str(MAA_BIN)
    return shutil.which("maa") or ""


def _adb_path(cfg):
    p = (cfg.get("adb_path") or "").strip()
    if p:
        return p
    if ADB_BIN.exists():
        return str(ADB_BIN)
    return shutil.which("adb") or ""


def _build_env(cfg):
    env = dict(os.environ)
    env["PATH"] = DEFAULT_PATH
    env["HOME"] = DECK_HOME
    env["MAA_CONFIG_DIR"] = str(MAA_CONFIG_DIR)
    env["XDG_DATA_HOME"] = str(MAA_DATA_HOME)
    env["XDG_CACHE_HOME"] = str(MAA_CACHE_HOME)
    env["MAA_LOG"] = (cfg.get("log_level") or "info").strip().lower() or "info"
    # keep adb's key store out of /home/deck
    env["ANDROID_USER_HOME"] = str(MAA_ROOT / "android")
    return env


def _run(args, timeout=20, env=None, cwd=None):
    try:
        p = subprocess.run(args, capture_output=True, text=True,
                           timeout=timeout, env=env, cwd=cwd)
        return p.returncode, (p.stdout or "").strip(), (p.stderr or "").strip()
    except FileNotFoundError:
        return 127, "", "未找到可执行文件: %s" % (args[0] if args else "?")
    except subprocess.TimeoutExpired:
        return 124, "", "命令超时（%ss）" % timeout
    except Exception as e:
        return 1, "", str(e)


def _run_as_deck(args, timeout=20, cfg=None, wayland="wayland-0"):
    cfg = cfg or _load_config()
    argv = ["runuser", "-u", "deck", "--", "env",
            "HOME=" + DECK_HOME,
            "PATH=" + DEFAULT_PATH,
            "XDG_RUNTIME_DIR=/run/user/1000",
            "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
            "WAYLAND_DISPLAY=" + wayland] + list(args)
    return _run(argv, timeout=timeout, env=_build_env(cfg))


def _toml_str(value):
    return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"'


def _write_profile(cfg):
    """Write MAA_CONFIG_DIR/profiles/default.toml from the plugin config."""
    MAA_PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    MAA_TASKS_DIR.mkdir(parents=True, exist_ok=True)
    lines = ["# generated by MaaDeck - edits will be overwritten", "", "[connection]"]
    adb = _adb_path(cfg)
    if adb:
        lines.append("adb_path = " + _toml_str(adb))
    mode = (cfg.get("connection_mode") or "manual").strip().lower()
    if mode == "waydroid":
        lines.append('preset = "Waydroid"')
    else:
        addr = (cfg.get("adb_address") or "").strip()
        if addr:
            lines.append("address = " + _toml_str(addr))
        lines.append('config = "CompatPOSIXShell"')
    opts = []
    touch = (cfg.get("touch_mode") or "").strip()
    if touch:
        opts.append("touch_mode = " + _toml_str(touch))
    if cfg.get("kill_adb_on_exit"):
        opts.append("kill_adb_on_exit = true")
    if opts:
        lines += ["", "[instance_options]"] + opts
    (MAA_PROFILES_DIR / "default.toml").write_text("\n".join(lines) + "\n")


def _tail(path, n):
    if not path.exists():
        return ""
    try:
        n = max(1, min(int(n or 200), 5000))
    except Exception:
        n = 200
    try:
        data = path.read_text(errors="replace").splitlines()
    except Exception as e:
        return "读取日志失败: %s" % e
    return "\n".join(data[-n:])


def _waydroid_status(cfg):
    if not WAYDROID_BIN.exists():
        return {"installed": False, "session": "unknown",
                "raw": "waydroid 未找到: %s" % WAYDROID_BIN}
    rc, out, err = _run_as_deck([str(WAYDROID_BIN), "status"], timeout=15, cfg=cfg)
    text = (out or err or "").strip()
    if not text:
        rc, out, err = _run([str(WAYDROID_BIN), "status"], timeout=15, env=_build_env(cfg))
        text = (out or err or "").strip()
    session = "unknown"
    for line in text.splitlines():
        low = line.strip().lower()
        if low.startswith("session:"):
            session = line.split(":", 1)[1].strip().lower()
    return {"installed": True, "session": session, "raw": text}


def _adb_devices(cfg):
    adb = _adb_path(cfg)
    if not adb:
        return False, "", "adb 未找到"
    rc, out, err = _run([adb, "devices"], timeout=15, env=_build_env(cfg))
    addr = (cfg.get("adb_address") or "").strip()
    connected = False
    for line in out.splitlines():
        parts = line.replace("\t", " ").split()
        if len(parts) >= 2 and parts[1] == "device":
            if not addr or parts[0] == addr:
                connected = True
    return connected, out or err, ""


def _last_line(path):
    if not path.exists():
        return ""
    try:
        for line in reversed(path.read_text(errors="replace").splitlines()):
            if line.strip():
                return line.strip()[:300]
    except Exception:
        pass
    return ""


def _plugin_version():
    try:
        return json.loads((PLUGIN_DIR / "package.json").read_text()).get("version", "")
    except Exception:
        return ""


def _read_cfg_prop(key):
    p = Path("/var/lib/waydroid/waydroid.cfg")
    try:
        for line in p.read_text(errors="replace").splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                if k.strip() == key:
                    return v.strip()
    except Exception:
        pass
    return ""


def _waydroid_container():
    rc, out, err = _run(["/usr/bin/systemctl", "is-active", "waydroid-container"], timeout=8)
    return (out or err or "unknown").strip()


def _split_versions(text):
    cli = core = ""
    for line in (text or "").splitlines():
        low = line.lower()
        if "maa-cli" in low and not cli:
            cli = line.split()[-1]
        elif "maacore" in low and not core:
            core = line.split()[-1]
    return cli, core


# ---------------------------------------------------------------------------
# plugin
# ---------------------------------------------------------------------------
class Plugin:
    def __init__(self):
        self._proc = None
        self._logf = None
        self._proc_cmd = ""
        self._proc_start = 0.0
        self._job = ""
        self._job_start = 0.0
        self._ver_text = ""
        self._ver_at = 0.0
        self._queue = []
        self._queue_thread = None
        self._queue_stop = False
        self._hist = []
        self._watchdog = None
        self._watchdog_stop = False
        self._procs = []

    # -- internals ---------------------------------------------------------
    def _alive(self):
        out = []
        for item in list(self._procs):
            if item["p"].poll() is None:
                out.append(item)
            else:
                try:
                    if item.get("f"):
                        item["f"].close()
                except Exception:
                    pass
                self._procs.remove(item)
        return out

    def _is_running(self):
        return bool(self._alive())

    def _reap(self):
        if not self._alive():
            try:
                if self._logf:
                    self._logf.close()
            except Exception:
                pass
            self._logf = None
            self._proc = None

    def _maa_version_cached(self, cfg, force=False):
        maa = _maa_path(cfg)
        if not maa:
            return ""
        now = time.time()
        if not force and self._ver_text and (now - self._ver_at) < VERSION_CACHE_TTL:
            return self._ver_text
        rc, out, err = _run([maa, "version"], timeout=25, env=_build_env(cfg),
                            cwd=str(MAA_ROOT))
        text = "\n".join(x for x in (out, err) if x).strip()
        self._ver_text = text
        self._ver_at = now
        return text

    def _status(self):
        self._reap()
        cfg = _load_config()
        maa = _maa_path(cfg)
        adb = _adb_path(cfg)
        connected, adb_raw, adb_err = _adb_devices(cfg) if adb else (False, "", "adb 未找到")
        running = self._is_running()
        vertext = self._maa_version_cached(cfg) if maa else ""
        cli_v, core_v = _split_versions(vertext)
        wd = _waydroid_status(cfg)
        wd["container"] = _waydroid_container()
        wd["width"] = _read_cfg_prop("persist.waydroid.width")
        wd["height"] = _read_cfg_prop("persist.waydroid.height")
        return {
            "plugin_version": _plugin_version(),
            "maa": {
                "path": maa,
                "installed": bool(maa),
                "core_installed": MAA_CORE_LIB.exists(),
                "version": vertext,
                "cli_version": cli_v,
                "core_version": core_v,
            },
            "adb": {"path": adb, "connected": connected,
                    "raw": adb_raw, "error": adb_err},
            "waydroid": wd,
            "running": running,
            "command": self._proc_cmd if running else "",
            "started_at": self._proc_start if running else 0,
            "elapsed": (time.time() - self._proc_start) if running else 0,
            "job": self._job,
            "job_elapsed": (time.time() - self._job_start) if self._job else 0,
            "queue": [x["label"] for x in self._queue],
            "history": list(self._hist[:8]),
            "last_log": _last_line(RUN_LOG),
            "paths": {
                "config": str(MAA_CONFIG_DIR),
                "data": str(MAA_DATA_HOME),
                "log": str(RUN_LOG),
                "adb": str(ADB_BIN),
                "maa": str(MAA_BIN),
            },
            "config": cfg,
        }

    def _start_job(self, name, argv):
        if self._job:
            return {"ok": False, "error": "已有后台任务在进行：%s" % self._job}
        cfg = _load_config()

        def worker():
            try:
                LOG_DIR.mkdir(parents=True, exist_ok=True)
                MAA_ROOT.mkdir(parents=True, exist_ok=True)
                with open(JOB_LOG, "ab", buffering=0) as f:
                    f.write(("\n===== %s  %s =====\n" % (
                        time.strftime("%Y-%m-%d %H:%M:%S"), name)).encode())
                    try:
                        p = subprocess.Popen(argv, stdout=f, stderr=subprocess.STDOUT,
                                             stdin=subprocess.DEVNULL,
                                             env=_build_env(cfg), cwd=str(MAA_ROOT))
                        p.wait()
                        f.write(("===== %s 退出码 %s =====\n" % (name, p.returncode)).encode())
                    except Exception as e:
                        f.write(("错误: %s\n" % e).encode())
            finally:
                self._job = ""
                self._ver_at = 0.0

        self._job = name
        self._job_start = time.time()
        threading.Thread(target=worker, daemon=True).start()
        return {"ok": True, "job": name}

    # -- callable API ------------------------------------------------------
    async def get_status(self):
        return await asyncio.to_thread(self._status)

    async def get_config(self):
        return await asyncio.to_thread(_load_config)

    async def set_config(self, config):
        def work():
            cfg = _load_config()
            if isinstance(config, dict):
                for k in DEFAULTS:
                    if k in config:
                        cfg[k] = config[k]
            _save_config(cfg)
            _write_profile(cfg)
            return cfg
        return await asyncio.to_thread(work)

    async def list_tasks(self):
        def work():
            custom = []
            if MAA_TASKS_DIR.exists():
                for f in sorted(MAA_TASKS_DIR.iterdir()):
                    if f.suffix.lower() in TASK_SUFFIXES and f.is_file():
                        custom.append(f.stem)
            return {"predefined": PREDEFINED, "custom": custom,
                    "default_command": _load_config().get("default_command", "")}
        return await asyncio.to_thread(work)

    async def start(self, command=""):
        return await asyncio.to_thread(self._start, command)

    def _start(self, command):
        cfg = _load_config()
        command = (command or cfg.get("default_command") or "startup Official").strip()
        if not command:
            return {"ok": False, "error": "未指定要运行的命令"}
        return self._start_argv(shlex.split(command), command)

    def _ensure_adb(self, cfg):
        mode = (cfg.get("connection_mode") or "manual").strip().lower()
        if mode == "waydroid":
            return None
        adb = _adb_path(cfg)
        addr = (cfg.get("adb_address") or "").strip()
        if not adb:
            return "未找到 adb：请放到 bin/adb 或设置路径"
        _run([adb, "start-server"], timeout=20, env=_build_env(cfg))
        _run([adb, "connect", addr], timeout=20, env=_build_env(cfg))
        last = ""
        for _ in range(4):
            connected, raw, err = _adb_devices(cfg)
            if connected:
                return None
            last = raw or err
            time.sleep(1)
        return "ADB 未连接上 %s。请先在游戏模式打开 Waydroid 条目，再重试。\n%s" % (addr, last)

    def _start_argv(self, argv, label):
        cfg = _load_config()
        if self._is_running():
            return {"ok": False, "error": "MAA 已在运行"}
        maa = _maa_path(cfg)
        if not maa:
            return {"ok": False,
                    "error": "未找到 maa 可执行文件：请把 maa-cli 放到 bin/maa 或设置路径"}
        _write_profile(cfg)

        err = self._ensure_adb(cfg)
        if err:
            return {"ok": False, "error": err}

        LOG_DIR.mkdir(parents=True, exist_ok=True)
        MAA_ROOT.mkdir(parents=True, exist_ok=True)
        try:
            f = open(RUN_LOG, "ab", buffering=0)
        except Exception as e:
            return {"ok": False, "error": "无法写日志: %s" % e}
        f.write(("\n===== %s  %s =====\n" % (
            time.strftime("%Y-%m-%d %H:%M:%S"), label)).encode())
        try:
            self._proc = subprocess.Popen(
                [maa] + list(argv), stdout=f, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                env=_build_env(cfg), cwd=str(MAA_ROOT), start_new_session=True)
        except Exception as e:
            try:
                f.close()
            except Exception:
                pass
            return {"ok": False, "error": "启动失败: %s" % e}
        self._logf = f
        p = self._proc
        self._procs.append({"p": p, "f": f, "cmd": label})
        self._proc_cmd = label
        self._proc_start = time.time()
        decky.logger.info("MaaDeck: started %s (pid %s)" % (label, p.pid))

        def _watch(proc=p, name=label):
            try:
                rc = proc.wait()
            except Exception:
                rc = -1
            self._add_history(name, rc)
            self._reap()

        threading.Thread(target=_watch, daemon=True).start()
        return {"ok": True, "command": label, "pid": p.pid}

    # -- queue / history ---------------------------------------------------
    def _save_page_params(self, cfg, page, params):
        pages = cfg.get("adv_pages")
        if not isinstance(pages, dict):
            pages = {}
        merged = dict(pages.get(page) or {})
        merged.update(params or {})
        pages[page] = merged
        cfg["adv_pages"] = pages
        _save_config(cfg)

    def _add_history(self, label, code):
        self._hist.insert(0, {"label": label, "code": code,
                              "time": time.strftime("%m-%d %H:%M")})
        self._hist = self._hist[:30]
        try:
            (SETTINGS_DIR / "history.json").write_text(
                json.dumps(self._hist, ensure_ascii=False))
        except Exception:
            pass

    def _exec_blocking(self, argv, label):
        cfg = _load_config()
        maa = _maa_path(cfg)
        if not maa:
            self._add_history(label, 127)
            return 127
        # serialize: never start while another task (manual or queue) is running
        while self._is_running() and not self._queue_stop:
            time.sleep(0.5)
        if self._queue_stop:
            return 1
        _write_profile(cfg)
        adb_err = self._ensure_adb(cfg)
        if adb_err:
            decky.logger.warning("MaaDeck: queue item %s aborted: %s" % (label, adb_err))
            self._add_history(label, 1)
            return 1
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        MAA_ROOT.mkdir(parents=True, exist_ok=True)
        try:
            f = open(RUN_LOG, "ab", buffering=0)
        except Exception:
            self._add_history(label, 1)
            return 1
        f.write(("\n===== %s  %s =====\n" % (
            time.strftime("%Y-%m-%d %H:%M:%S"), label)).encode())
        rc = 1
        try:
            p = subprocess.Popen([maa] + list(argv), stdout=f, stderr=subprocess.STDOUT,
                                 stdin=subprocess.DEVNULL, env=_build_env(cfg),
                                 cwd=str(MAA_ROOT), start_new_session=True)
            self._proc = p
            self._procs.append({"p": p, "f": f, "cmd": label})
            self._logf = f
            self._proc_cmd = label
            self._proc_start = time.time()
            rc = p.wait()
        except Exception as e:
            f.write(("错误: %s\n" % e).encode())
        finally:
            self._reap()
            try:
                f.close()
            except Exception:
                pass
        self._add_history(label, rc)
        return rc

    def _queue_worker(self):
        while self._queue and not self._queue_stop:
            item = self._queue.pop(0)
            if item.get("payload_name"):
                try:
                    _write_task_file(item["payload_name"], item["payload"])
                except Exception as e:
                    decky.logger.error("MaaDeck: queue task file failed: %s" % e)
                    continue
            self._exec_blocking(item["argv"], item["label"])
        self._queue_stop = False

    # -- lifecycle watchdog ------------------------------------------------
    def _start_watchdog(self):
        self._watchdog_stop = False
        if self._watchdog is None or not self._watchdog.is_alive():
            self._watchdog = threading.Thread(target=self._watchdog_loop, daemon=True)
            self._watchdog.start()

    def _watchdog_loop(self):
        decky.logger.info("MaaDeck: watchdog started")
        while not self._watchdog_stop:
            try:
                if self._is_running() or self._queue:
                    cfg = _load_config()
                    if cfg.get("stop_on_session_end", True):
                        sess = (_waydroid_status(cfg).get("session") or "").lower()
                        if sess and sess != "running":
                            decky.logger.warning(
                                "MaaDeck: Waydroid session=%s -> force stop MAA" % sess)
                            self._queue = []
                            self._queue_stop = True
                            r = self._stop()
                            decky.logger.warning("MaaDeck: force stop result=%s" % r)
                            if cfg.get("kill_adb_on_exit"):
                                adb = _adb_path(cfg)
                                if adb:
                                    _run([adb, "kill-server"], timeout=10, env=_build_env(cfg))
                            self._add_history("会话结束→停止 MAA", 1)
            except Exception as e:
                decky.logger.warning("MaaDeck: watchdog: %s" % e)
            time.sleep(5)

    async def stop(self):
        return await asyncio.to_thread(self._stop)

    def _stop(self):
        self._queue_stop = True
        alive = self._alive()
        if not alive:
            self._reap()
            return {"ok": True, "note": "未在运行"}
        for item in alive:
            p = item["p"]
            try:
                pgid = os.getpgid(p.pid)
            except Exception:
                pgid = None
            try:
                if pgid:
                    os.killpg(pgid, signal.SIGTERM)
                else:
                    p.terminate()
            except Exception:
                pass
        deadline = time.time() + 12
        for item in alive:
            try:
                item["p"].wait(timeout=max(0.5, deadline - time.time()))
            except Exception:
                pass
        for item in alive:
            p = item["p"]
            if p.poll() is None:
                try:
                    pgid = os.getpgid(p.pid)
                except Exception:
                    pgid = None
                try:
                    if pgid:
                        os.killpg(pgid, signal.SIGKILL)
                    else:
                        p.kill()
                except Exception:
                    pass
        for item in alive:
            try:
                item["p"].wait(timeout=5)
            except Exception:
                pass
        self._reap()
        return {"ok": True}

    async def get_log(self, lines=200):
        return await asyncio.to_thread(_tail, RUN_LOG, lines)

    async def get_job_log(self, lines=200):
        return await asyncio.to_thread(_tail, JOB_LOG, lines)

    async def clear_log(self):
        def work():
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            RUN_LOG.write_text("")
            return True
        return await asyncio.to_thread(work)

    async def install_core(self):
        def work():
            cfg = _load_config()
            maa = _maa_path(cfg)
            if not maa:
                return {"ok": False, "error": "未找到 maa-cli"}
            return self._start_job("maa install", [maa, "install"])
        return await asyncio.to_thread(work)

    async def update_core(self):
        def work():
            cfg = _load_config()
            maa = _maa_path(cfg)
            if not maa:
                return {"ok": False, "error": "未找到 maa-cli"}
            return self._start_job("maa update", [maa, "update"])
        return await asyncio.to_thread(work)

    async def hot_update(self):
        def work():
            cfg = _load_config()
            maa = _maa_path(cfg)
            if not maa:
                return {"ok": False, "error": "未找到 maa-cli"}
            return self._start_job("maa hot-update", [maa, "hot-update"])
        return await asyncio.to_thread(work)

    async def connect_adb(self):
        def work():
            cfg = _load_config()
            adb = _adb_path(cfg)
            addr = (cfg.get("adb_address") or "").strip()
            if not adb:
                return {"ok": False, "error": "未找到 adb"}
            rc, out, err = _run([adb, "connect", addr], timeout=20, env=_build_env(cfg))
            return {"ok": rc == 0, "rc": rc, "out": out, "err": err}
        return await asyncio.to_thread(work)

    async def disconnect_adb(self):
        def work():
            cfg = _load_config()
            adb = _adb_path(cfg)
            addr = (cfg.get("adb_address") or "").strip()
            if not adb:
                return {"ok": False, "error": "未找到 adb"}
            rc, out, err = _run([adb, "disconnect", addr], timeout=20, env=_build_env(cfg))
            return {"ok": rc == 0, "rc": rc, "out": out, "err": err}
        return await asyncio.to_thread(work)

    async def start_session(self):
        def work():
            if not WAYDROID_BIN.exists():
                return {"ok": False, "error": "未找到 waydroid"}
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            argv = ["runuser", "-u", "deck", "--", "env",
                    "HOME=" + DECK_HOME, "PATH=" + DEFAULT_PATH,
                    "XDG_RUNTIME_DIR=/run/user/1000",
                    "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
                    "WAYLAND_DISPLAY=wayland-0",
                    str(WAYDROID_BIN), "session", "start"]
            f = open(LOG_DIR / "waydroid-session.log", "ab", buffering=0)
            subprocess.Popen(argv, stdout=f, stderr=subprocess.STDOUT,
                             stdin=subprocess.DEVNULL,
                             env=_build_env(_load_config()), start_new_session=True)
            return {"ok": True, "note": "已请求启动 Waydroid 会话"}
        return await asyncio.to_thread(work)

    async def stop_session(self):
        def work():
            if not WAYDROID_BIN.exists():
                return {"ok": False, "error": "未找到 waydroid"}
            rc, out, err = _run_as_deck([str(WAYDROID_BIN), "session", "stop"], timeout=20)
            return {"ok": rc == 0, "rc": rc, "out": out, "err": err}
        return await asyncio.to_thread(work)

    # -- advanced pages ----------------------------------------------------
    async def get_adv_pages(self):
        def work():
            cfg = _load_config()
            return {"pages": ADV_PAGES, "params": cfg.get("adv_pages") or {},
                    "queue": [x["label"] for x in self._queue],
                    "history": list(self._hist[:12])}
        return await asyncio.to_thread(work)

    async def preview_command(self, page, params=None):
        def work():
            cfg = _load_config()
            r = _build_command(cfg, page, params or {})
            if not r.get("ok"):
                return r
            r["command"] = " ".join([_maa_path(cfg) or "maa"] + r["argv"])
            r["payload_json"] = json.dumps(r["payload"], ensure_ascii=False, indent=2) if r.get("payload") else ""
            return r
        return await asyncio.to_thread(work)

    async def run_advanced(self, page, params=None, dry_run=False):
        def work():
            cfg = _load_config()
            self._save_page_params(cfg, page, params or {})
            cfg = _load_config()
            r = _build_command(cfg, page, params or {}, force_dry=bool(dry_run))
            if not r.get("ok"):
                return r
            if r.get("payload") is not None:
                _write_task_file(Path(r["task_file"]).stem, r["payload"])
            return self._start_argv(r["argv"], r["label"])
        return await asyncio.to_thread(work)

    async def enqueue_advanced(self, page, params=None):
        def work():
            cfg = _load_config()
            self._save_page_params(cfg, page, params or {})
            cfg = _load_config()
            r = _build_command(cfg, page, params or {})
            if not r.get("ok"):
                return r
            item = {"argv": r["argv"], "label": r["label"], "payload_name": "", "payload": None}
            if r.get("payload") is not None:
                item["payload_name"] = Path(r["task_file"]).stem
                item["payload"] = r["payload"]
            self._queue.append(item)
            return {"ok": True, "queue": [x["label"] for x in self._queue]}
        return await asyncio.to_thread(work)

    def _queue_running(self):
        return self._queue_thread is not None and self._queue_thread.is_alive()

    async def get_queue(self):
        def work():
            return {"queue": [x["label"] for x in self._queue],
                    "running": self._queue_running(),
                    "history": list(self._hist[:12])}
        return await asyncio.to_thread(work)

    async def clear_queue(self):
        def work():
            self._queue = []
            return {"ok": True}
        return await asyncio.to_thread(work)

    async def clear_history(self):
        def work():
            self._hist = []
            try:
                (SETTINGS_DIR / "history.json").write_text("[]")
            except Exception:
                pass
            return {"ok": True}
        return await asyncio.to_thread(work)

    async def run_queue(self):
        def work():
            if self._queue_running():
                return {"ok": False, "error": "队列已在运行"}
            if not self._queue:
                return {"ok": False, "error": "队列为空"}
            self._queue_stop = False
            self._queue_thread = threading.Thread(target=self._queue_worker, daemon=True)
            self._queue_thread.start()
            return {"ok": True}
        return await asyncio.to_thread(work)

    async def force_stop(self):
        def work():
            cfg = _load_config()
            self._queue = []
            self._queue_stop = True
            r = self._stop() if self._is_running() else {"ok": True, "note": "未在运行"}
            if cfg.get("kill_adb_on_exit"):
                adb = _adb_path(cfg)
                if adb:
                    _run([adb, "kill-server"], timeout=10, env=_build_env(cfg))
            self._add_history("手动强制停止", 0 if r.get("ok") else 1)
            return r
        return await asyncio.to_thread(work)

    # -- lifecycle ---------------------------------------------------------
    async def _main(self):
        try:
            for d in (SETTINGS_DIR, RUNTIME_DIR, LOG_DIR, MAA_PROFILES_DIR, MAA_TASKS_DIR):
                d.mkdir(parents=True, exist_ok=True)
            hist_file = SETTINGS_DIR / "history.json"
            if hist_file.exists():
                data = json.loads(hist_file.read_text())
                if isinstance(data, list):
                    self._hist = data[:30]
            _write_profile(_load_config())
        except Exception as e:
            decky.logger.error("MaaDeck: init failed: %s" % e)
        self._start_watchdog()
        decky.logger.info("MaaDeck loaded")

    async def _unload(self):
        self._watchdog_stop = True
        self._queue_stop = True
        try:
            self._stop()
        except Exception:
            pass
        decky.logger.info("MaaDeck unloaded")
