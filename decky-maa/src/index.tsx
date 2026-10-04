import {
  ButtonItem,
  DropdownItem,
  ModalRoot,
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  showModal,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin, toaster } from "@decky/api";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  FaAndroid,
  FaArrowLeft,
  FaBolt,
  FaCog,
  FaDownload,
  FaFileAlt,
  FaListOl,
  FaPlug,
  FaPlay,
  FaRobot,
  FaStop,
  FaSyncAlt,
  FaTerminal,
  FaTrashAlt,
  FaWrench,
} from "react-icons/fa";

type MaaStatus = {
  plugin_version: string;
  maa: { path: string; installed: boolean; core_installed: boolean; version: string; cli_version: string; core_version: string };
  adb: { path: string; connected: boolean; raw: string; error: string };
  waydroid: { installed: boolean; session: string; raw: string; container: string; width: string; height: string };
  running: boolean;
  command: string;
  started_at: number;
  elapsed: number;
  job: string;
  job_elapsed: number;
  queue: string[];
  history: { label: string; code: number; time: string }[];
  last_log: string;
  paths: { config: string; data: string; log: string; adb: string; maa: string };
  config: Record<string, any>;
};

type TaskList = { predefined: { id: string; label: string }[]; custom: string[]; default_command: string };
type AdvField = { key: string; label: string; type: string; default: any; options: any[][]; help: string };
type AdvPage = { key: string; title: string; group: string; mode: string; subtitle: string; fields: AdvField[] };
type AdvInfo = { pages: AdvPage[]; params: Record<string, any>; queue: string[]; history: any[] };

const getStatus = callable<[], MaaStatus>("get_status");
const listTasks = callable<[], TaskList>("list_tasks");
const setConfig = callable<[cfg: Record<string, any>], Record<string, any>>("set_config");
const startMaa = callable<[cmd: string], any>("start");
const stopMaa = callable<[], any>("stop");
const forceStop = callable<[], any>("force_stop");
const getRunLog = callable<[n: number], string>("get_log");
const getJobLog = callable<[n: number], string>("get_job_log");
const clearRunLog = callable<[], any>("clear_log");
const installCore = callable<[], any>("install_core");
const updateCore = callable<[], any>("update_core");
const hotUpdate = callable<[], any>("hot_update");
const connectAdb = callable<[], any>("connect_adb");
const disconnectAdb = callable<[], any>("disconnect_adb");
const startSession = callable<[], any>("start_session");
const stopSession = callable<[], any>("stop_session");
const getAdvPages = callable<[], AdvInfo>("get_adv_pages");
const previewCommand = callable<[page: string, params: any], any>("preview_command");
const runAdvanced = callable<[page: string, params: any, dry: boolean], any>("run_advanced");
const enqueueAdvanced = callable<[page: string, params: any], any>("enqueue_advanced");
const getQueue = callable<[], any>("get_queue");
const clearQueue = callable<[], any>("clear_queue");
const runQueue = callable<[], any>("run_queue");

const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"];
const TOUCH_MODES = ["", "ADB", "Minitouch", "MaaTouch"];
const VERBOSE_OPTS = [
  { data: -2, label: "-q -q（最安静）" },
  { data: -1, label: "-q（安静）" },
  { data: 0, label: "默认" },
  { data: 1, label: "-v（详细）" },
  { data: 2, label: "-v -v（更详细）" },
];
const GREEN = "#3ba55d";
const BLUE = "#4a9eff";
const ORANGE = "#e0a030";
const GREY = "#8a8f98";

function Dot(props: { color: string }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: props.color, marginRight: 6, verticalAlign: "middle" }} />;
}

function Badge(props: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: props.color, border: "1px solid " + props.color, borderRadius: 10, padding: "1px 8px", whiteSpace: "nowrap" }}>
      {props.text}
    </span>
  );
}

function KV(props: { label: ReactNode; value: ReactNode; small?: boolean }) {
  return (
    <PanelSectionRow>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={{ opacity: 0.72, flex: "0 0 auto" }}>{props.label}</span>
        <span style={{ textAlign: "right", wordBreak: "break-all", fontSize: props.small ? 11 : undefined, opacity: props.small ? 0.8 : 1 }}>{props.value}</span>
      </div>
    </PanelSectionRow>
  );
}

function fmtDuration(sec: number) {
  const total = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return h + " 小时 " + m + " 分";
  if (m > 0) return m + " 分 " + s + " 秒";
  return s + " 秒";
}

function logSlice(text: string, lines: number) {
  if (!text) return "(暂无输出)";
  return text.split("\n").slice(-lines).join("\n");
}

function pickVal(o: any) {
  return o && typeof o === "object" && "data" in o ? o.data : o;
}

function PagePicker(props: { pages: AdvPage[]; current: string; onPick: (k: string) => void }) {
  const groups: string[] = [];
  for (const p of props.pages) {
    if (groups.indexOf(p.group) < 0) groups.push(p.group);
  }
  return (
    <ModalRoot closeModal={() => {}} bAllowFullSize>
      <div style={{ padding: 12, minWidth: "60vw", maxHeight: "70vh", overflow: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>选择任务页</div>
        {groups.map((g) => (
          <div key={g}>
            <div style={{ fontSize: 12, opacity: 0.6, margin: "10px 0 4px" }}>{g}</div>
            {props.pages
              .filter((p) => p.group === g)
              .map((p) => (
                <PanelSectionRow key={p.key}>
                  <ButtonItem layout="below" onClick={() => props.onPick(p.key)}>
                    {(props.current === p.key ? "● " : "") + p.title}
                  </ButtonItem>
                </PanelSectionRow>
              ))}
          </div>
        ))}
      </div>
    </ModalRoot>
  );
}

function LogModal(props: { title: string; loader: () => Promise<string>; onClose: () => void }) {
  const [text, setText] = useState("读取中…");
  const preRef = useRef<HTMLPreElement | null>(null);
  const load = async () => {
    try { setText(await props.loader()); } catch (e: any) { setText("读取失败: " + String(e && e.message ? e.message : e)); }
  };
  useEffect(() => {
    load();
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [text]);
  return (
    <ModalRoot closeModal={props.onClose} bAllowFullSize>
      <div style={{ padding: 12, minWidth: "72vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{props.title}（每 1.5 秒自动刷新）</div>
        <pre ref={preRef} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "66vh", overflow: "auto", fontSize: 12, lineHeight: 1.4, background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 4, margin: 0 }}>{text || "(空)"}</pre>
      </div>
    </ModalRoot>
  );
}

function showLog(title: string, loader: () => Promise<string>) {
  let handle: any = null;
  const close = () => { try { if (handle) handle.Close(); } catch (e) { /* ignore */ } };
  handle = showModal(<LogModal title={title} loader={loader} onClose={close} />, undefined, { strTitle: title });
}

function Code(props: { text: string }) {
  return (
    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflow: "auto", fontSize: 11, lineHeight: 1.35, background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4, margin: 0, width: "100%" }}>
      {props.text || "(空)"}
    </pre>
  );
}

function DynamicField(props: { f: AdvField; value: any; onChange: (v: any) => void }) {
  const f = props.f;
  const row = (child: ReactNode) => <PanelSectionRow>{child}</PanelSectionRow>;
  if (f.type === "bool") {
    return row(<ToggleField label={f.label} description={f.help || undefined} checked={!!props.value} onChange={(v: boolean) => props.onChange(v)} />);
  }
  if (f.type === "select") {
    return row(
      <DropdownItem
        label={f.label}
        rgOptions={f.options.map((o) => ({ data: o[0], label: String(o[1]) }))}
        selectedOption={props.value === undefined || props.value === null ? f.default : props.value}
        onChange={(o: any) => props.onChange(pickVal(o))}
      />
    );
  }
  const numeric = f.type === "int" || f.type === "float";
  return row(
    <TextField
      label={f.label}
      description={f.help || undefined}
      mustBeNumeric={numeric}
      value={props.value === undefined || props.value === null ? String(f.default === undefined ? "" : f.default) : String(props.value)}
      onChange={(e: any) => props.onChange(e.target.value)}
    />
  );
}

function Content() {
  const opLock = useRef(false);
  const pendingSave = useRef(false);
  const saveTimer = useRef<any>(null);
  const modeInit = useRef(false);
  const cfgRef = useRef<Record<string, any> | null>(null);
  const runningRef = useRef(false);
  const liveRef = useRef<HTMLPreElement | null>(null);
  const [st, setSt] = useState<MaaStatus | null>(null);
  const [tasks, setTasks] = useState<TaskList | null>(null);
  const [cmd, setCmd] = useState<string>("");
  const [customSel, setCustomSel] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [cfg, setCfg] = useState<Record<string, any> | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [jobLog, setJobLog] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [mode, setMode] = useState<string>("basic");
  const [adv, setAdv] = useState<AdvInfo | null>(null);
  const [page, setPage] = useState<string>("");
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<any>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const refresh = async () => {
    try {
      const s = await getStatus();
      setSt(s);
      setErr("");
      if (s && s.config) {
        if (!pendingSave.current) {
          cfgRef.current = s.config;
          setCfg(s.config);
        }
        if (!modeInit.current) {
          setMode(s.config.ui_mode === "advanced" ? "advanced" : "basic");
          modeInit.current = true;
        }
      }
      try { setLogs(await getRunLog(25)); } catch (e) { /* ignore */ }
      if (s.job) { try { setJobLog(await getJobLog(15)); } catch (e) { /* ignore */ } }
    } catch (e: any) { setErr(String(e && e.message ? e.message : e)); }
  };

  const refreshTasks = async () => {
    try {
      const t = await listTasks();
      setTasks(t);
      setCmd((prev) => prev || t.default_command || (t.predefined[0] ? t.predefined[0].id : ""));
    } catch (e) { /* ignore */ }
  };

  const refreshAdv = async () => {
    try {
      const a = await getAdvPages();
      setAdv(a);
      setPageParams(a.params || {});
      setQueue(a.queue || []);
      setHistory(a.history || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    refreshTasks();
    refreshAdv();
    let alive = true;
    let timer: any = null;
    const tick = async () => {
      await refresh();
      if (!alive) return;
      timer = setTimeout(tick, runningRef.current ? 1000 : 3000);
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  useEffect(() => {
    runningRef.current = !!(st && (st.running || st.job));
  }, [st]);

  useEffect(() => {
    if (liveRef.current) liveRef.current.scrollTop = liveRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (adv && !page) {
      const saved = cfg && cfg.ui_page;
      const keys = adv.pages.map((p) => p.key);
      setPage(saved && keys.indexOf(saved) >= 0 ? saved : (adv.pages[0] ? adv.pages[0].key : ""));
    }
  }, [adv, cfg, page]);

  const run = async (fn: () => Promise<any>, okMsg: string) => {
    if (opLock.current) return;
    opLock.current = true;
    setBusy(true);
    try {
      const r = await fn();
      if (r && r.ok === false) toaster.toast({ title: "Maa Deck", body: r.error || "操作失败", duration: 5000 });
      else if (okMsg) toaster.toast({ title: "Maa Deck", body: okMsg, duration: 3000 });
    } catch (e: any) {
      toaster.toast({ title: "Maa Deck", body: String(e && e.message ? e.message : e), duration: 5000 });
    } finally {
      setBusy(false);
      opLock.current = false;
      await refresh();
    }
  };

  const patch = (key: string, value: any, debounce = false) => {
    const next = Object.assign({}, cfgRef.current, { [key]: value });
    cfgRef.current = next;
    setCfg(next);
    pendingSave.current = true;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const doSave = async () => {
      try {
        const r = await setConfig(next);
        cfgRef.current = r;
        setCfg(r);
      } catch (e) {
        /* ignore */
      } finally {
        pendingSave.current = false;
        saveTimer.current = null;
      }
    };
    if (debounce) {
      saveTimer.current = setTimeout(doSave, 700);
    } else {
      doSave();
    }
  };
  const startCmd = (c: string, msg: string) => run(() => startMaa(c), msg);

  const saveCfg = async () => {
    if (!cfg) return;
    if (opLock.current) return;
    opLock.current = true;
    pendingSave.current = true;
    setBusy(true);
    try {
      const r = await setConfig(cfgRef.current || cfg);
      cfgRef.current = r;
      setCfg(r);
      toaster.toast({ title: "Maa Deck", body: "设置已保存", duration: 3000 });
    } catch (e: any) {
      toaster.toast({ title: "Maa Deck", body: String(e), duration: 5000 });
    } finally {
      pendingSave.current = false;
      setBusy(false);
      opLock.current = false;
      await refresh();
    }
  };

  const switchMode = async (m: string) => {
    if (opLock.current) return;
    opLock.current = true;
    setMode(m);
    pendingSave.current = true;
    try { await setConfig(Object.assign({}, cfgRef.current, { ui_mode: m })); } catch (e) { /* ignore */ } finally { opLock.current = false; pendingSave.current = false; }
  };

  const openRunLog = () => showLog("MAA 运行日志", () => getRunLog(500));
  const openJobLog = () => showLog("MaaCore 安装/更新日志", () => getJobLog(500));

  const pickPage = (k: string) => {
    setPage(k);
    pendingSave.current = true;
    try {
      setConfig(Object.assign({}, cfgRef.current, { ui_page: k }))
        .then((r: any) => {
          cfgRef.current = r;
          setCfg(r);
        })
        .catch(() => {})
        .finally(() => {
          pendingSave.current = false;
        });
    } catch (e) {
      pendingSave.current = false;
    }
  };

  const openPagePicker = () => {
    if (!adv) return;
    let handle: any = null;
    const close = () => {
      try {
        if (handle) handle.Close();
      } catch (e) {
        /* ignore */
      }
    };
    handle = showModal(
      <PagePicker
        pages={adv.pages}
        current={page}
        onPick={(k: string) => {
          setPage(k);
          close();
        }}
      />,
      undefined,
      { strTitle: "选择任务页" }
    );
  };

  const engine = !st ? { text: "读取中", color: GREY }
    : st.running ? { text: "运行中", color: GREEN }
      : st.job ? { text: "维护中", color: BLUE }
        : { text: "空闲", color: GREY };
  const coreColor = !st ? GREY : st.maa.core_installed ? GREEN : ORANGE;
  const adbColor = !st ? GREY : st.adb.connected ? GREEN : GREY;
  const wdColor = !st ? GREY : (st.waydroid.session || "").indexOf("running") >= 0 ? GREEN : GREY;
  const coreText = !st ? "-" : !st.maa.installed ? "缺少 maa-cli" : st.maa.core_installed ? (st.maa.core_version || "已安装") : "未安装核心";
  const wdRes = st && st.waydroid.width ? st.waydroid.width + " x " + st.waydroid.height : "-";

  const presetOpts = tasks ? tasks.predefined.map((p) => ({ data: p.id, label: p.label })) : [];
  const customOpts = tasks ? tasks.custom.map((c) => ({ data: "run " + c, label: c })) : [];
  const pageOpts = adv ? adv.pages.map((p) => ({ data: p.key, label: p.group + " · " + p.title })) : [];
  const curPage = adv ? adv.pages.find((p) => p.key === page) : undefined;

  const pv = (key: string) => {
    const pp = pageParams[page] || {};
    return pp[key] !== undefined ? pp[key] : undefined;
  };
  const setParam = (key: string, value: any) => {
    setPageParams((prev) => {
      const next = Object.assign({}, prev);
      next[page] = Object.assign({}, next[page] || {}, { [key]: value });
      return next;
    });
  };
  const currentParams = () => {
    const out: Record<string, any> = {};
    if (curPage) for (const f of curPage.fields) out[f.key] = pv(f.key) !== undefined ? pv(f.key) : f.default;
    return out;
  };

  useEffect(() => {
    if (mode !== "advanced" || !page) return undefined;
    const t = setTimeout(async () => {
      try { setPreview(await previewCommand(page, currentParams())); } catch (e) { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [mode, page, JSON.stringify(pageParams)]);

  const refreshQueue = async () => {
    try {
      const q = await getQueue();
      setQueue(q.queue || []);
      setHistory(q.history || []);
    } catch (e) { /* ignore */ }
  };

  const modeToggle = (
    <PanelSectionRow>
      <ButtonItem layout="below" onClick={() => switchMode(mode === "advanced" ? "basic" : "advanced")}>
        <FaWrench style={{ marginRight: 6 }} />
        {mode === "advanced" ? "返回基础模式" : "切换到高级模式"}
      </ButtonItem>
    </PanelSectionRow>
  );

  const statusSection = (
    <PanelSection title="运行状态">
      <PanelSectionRow>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ opacity: 0.72 }}>引擎</span>
          <Badge text={engine.text} color={engine.color} />
        </div>
      </PanelSectionRow>
      {st && st.running ? <KV label="当前命令" value={st.command} /> : null}
      {st && st.running ? <KV label="已运行" value={fmtDuration(st.elapsed)} /> : null}
      {st && st.job ? <KV label="后台任务" value={st.job + "（" + fmtDuration(st.job_elapsed) + "）"} /> : null}
      {st && st.queue && st.queue.length ? <KV label="队列" value={st.queue.length + " 项"} /> : null}
      <KV label="最近输出" value={st && st.last_log ? logSlice(st.last_log, 1) : "—"} small />
      {st && (st.running || st.job) ? (
        <PanelSectionRow>
          <pre ref={liveRef} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 150, overflow: "auto", fontSize: 11, lineHeight: 1.35, background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4, margin: 0, width: "100%" }}>
            {logSlice(logs, 16) || "(等待输出…)"}
          </pre>
        </PanelSectionRow>
      ) : null}
      {err ? <KV label="错误" value={err} /> : null}
    </PanelSection>
  );

  const coreSection = (
    <PanelSection title="核心与环境">
      <KV label={<span><Dot color={GREEN} />maa-cli</span>} value={st && st.maa.installed ? st.maa.cli_version || "已安装" : "未安装"} />
      <KV label={<span><Dot color={coreColor} />MaaCore</span>} value={coreText} />
      <KV label={<span><Dot color={adbColor} />ADB 设备</span>} value={st && st.adb.connected ? "已连接" : "未连接"} />
      <KV label={<span><Dot color={wdColor} />Waydroid 会话</span>} value={st ? (st.waydroid.installed ? st.waydroid.session : "未安装") : "-"} />
      <KV label="容器服务" value={st ? st.waydroid.container : "-"} small />
      <KV label="安卓分辨率" value={wdRes} small />
    </PanelSection>
  );

  const taskControl = (
    <PanelSection title="任务控制">
      {presetOpts.length > 0 ? (
        <PanelSectionRow>
          <DropdownItem label="预定义任务" menuLabel="选择预定义任务" rgOptions={presetOpts} selectedOption={cmd} onChange={(o: any) => setCmd(pickVal(o))} />
        </PanelSectionRow>
      ) : null}
      {customOpts.length > 0 ? (
        <PanelSectionRow>
          <DropdownItem label="自定义任务" menuLabel="选择自定义任务" rgOptions={customOpts} selectedOption={customSel} onChange={(o: any) => { const v = pickVal(o); setCustomSel(v); setCmd(v); }} />
        </PanelSectionRow>
      ) : null}
      <PanelSectionRow>
        <TextField label="命令" value={cmd} onChange={(e: any) => setCmd(e.target.value)} />
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={() => run(() => startMaa(cmd), "已启动 MAA")}><FaPlay style={{ marginRight: 6 }} />启动 MAA</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={() => run(() => stopMaa(), "已停止 MAA")}><FaStop style={{ marginRight: 6 }} />停止 MAA</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={() => run(() => forceStop(), "已强制停止并清理（含队列）")}><FaTrashAlt style={{ marginRight: 6 }} />强制停止并清理</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow><div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>快捷任务</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => startCmd("startup Official", "已启动：启动游戏")}>启动游戏（官服）</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => startCmd("fight", "已启动：开始战斗")}>开始战斗</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => startCmd("closedown", "已启动：关闭游戏")}>关闭游戏客户端</ButtonItem></PanelSectionRow>
    </PanelSection>
  );

  const coreManage = (
    <PanelSection title="MaaCore 管理">
      <KV label="状态" value={st && st.maa.core_installed ? "已安装" : "未安装"} />
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !!st?.job} onClick={() => run(() => installCore(), "已开始安装 MaaCore")}><FaDownload style={{ marginRight: 6 }} />安装 MaaCore</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !!st?.job} onClick={() => run(() => updateCore(), "已开始更新 MaaCore")}><FaSyncAlt style={{ marginRight: 6 }} />更新 MaaCore</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !!st?.job} onClick={() => run(() => hotUpdate(), "已开始热更新资源")}><FaBolt style={{ marginRight: 6 }} />热更新资源</ButtonItem></PanelSectionRow>
    </PanelSection>
  );

  if (mode === "basic") {
    return (
      <>
        {modeToggle}
        {statusSection}
        {coreSection}
        {taskControl}
        {coreManage}
      </>
    );
  }

  return (
    <>
      <PanelSectionRow>
        <div style={{ textAlign: "center", fontWeight: 700, opacity: 0.9, width: "100%" }}>高级模式</div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => switchMode("basic")}>
          <FaArrowLeft style={{ marginRight: 6 }} />返回基础模式
        </ButtonItem>
      </PanelSectionRow>

      {statusSection}

      <PanelSection title="设备与连接">
        <KV label={<span><Dot color={adbColor} />ADB 设备</span>} value={st && st.adb.connected ? "已连接" : "未连接"} />
        <KV label={<span><Dot color={wdColor} />Waydroid</span>} value={st ? st.waydroid.session : "-"} />
        <PanelSectionRow><TextField label="ADB 地址" value={(cfg && cfg.adb_address) || ""} onChange={(e: any) => patch("adb_address", e.target.value, true)} /></PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem label="连接模式" rgOptions={[{ data: "manual", label: "手动 ADB（推荐）" }, { data: "waydroid", label: "maa-cli Waydroid 预设" }]} selectedOption={(cfg && cfg.connection_mode) || "manual"} onChange={(o: any) => patch("connection_mode", pickVal(o))} />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem label="触摸模式" rgOptions={TOUCH_MODES.map((m) => ({ data: m, label: m === "" ? "默认" : m }))} selectedOption={(cfg && cfg.touch_mode) || ""} onChange={(o: any) => patch("touch_mode", pickVal(o))} />
        </PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => run(() => connectAdb(), "ADB 已连接")}><FaPlug style={{ marginRight: 6 }} />连接 ADB</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => run(() => disconnectAdb(), "ADB 已断开")}>断开 ADB</ButtonItem></PanelSectionRow>
      </PanelSection>

      <PanelSection title="全局运行参数">
        <PanelSectionRow><ToggleField label="演练模式 (--dry-run)" description="只解析参数，不实际识别游戏" checked={!!(cfg && cfg.dry_run)} onChange={(v: boolean) => patch("dry_run", v)} /></PanelSectionRow>
        <PanelSectionRow><ToggleField label="使用自定义资源 (--user-resource)" checked={!!(cfg && cfg.user_resource)} onChange={(v: boolean) => patch("user_resource", v)} /></PanelSectionRow>
        <PanelSectionRow><ToggleField label="会话结束自动停止 MAA" description="Waydroid 会话一停就强制结束 MAA 进程组并清空队列（防幽灵进程）" checked={cfg ? cfg.stop_on_session_end !== false : true} onChange={(v: boolean) => patch("stop_on_session_end", v)} /></PanelSectionRow>
        <PanelSectionRow><ToggleField label="退出时结束 adb (kill_adb_on_exit)" description="停止 MAA 时一并执行 adb kill-server" checked={!!(cfg && cfg.kill_adb_on_exit)} onChange={(v: boolean) => patch("kill_adb_on_exit", v)} /></PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem label="日志详细度" rgOptions={VERBOSE_OPTS} selectedOption={(cfg && cfg.verbose) || 0} onChange={(o: any) => patch("verbose", pickVal(o))} />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem label="日志级别" rgOptions={LOG_LEVELS.map((l) => ({ data: l, label: l }))} selectedOption={(cfg && cfg.log_level) || "info"} onChange={(o: any) => patch("log_level", pickVal(o))} />
        </PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy || !cfg} onClick={saveCfg}><FaCog style={{ marginRight: 6 }} />保存设置</ButtonItem></PanelSectionRow>
      </PanelSection>

      <PanelSection title="任务页">
        <KV label="当前页面" value={curPage ? curPage.group + " · " + curPage.title : "-"} />
        {curPage ? <PanelSectionRow><div style={{ fontSize: 11, opacity: 0.6 }}>{curPage.subtitle}</div></PanelSectionRow> : null}
        {adv
          ? Array.from(new Set(adv.pages.map((p) => p.group))).map((g) => (
              <div key={g}>
                <PanelSectionRow>
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>{g}</div>
                </PanelSectionRow>
                {adv.pages
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <PanelSectionRow key={p.key}>
                      <ButtonItem layout="below" disabled={page === p.key} onClick={() => pickPage(p.key)}>
                        {(page === p.key ? "● " : "") + p.title}
                      </ButtonItem>
                    </PanelSectionRow>
                  ))}
              </div>
            ))
          : null}
      </PanelSection>

      {curPage ? (
        <PanelSection key={page} title={"参数 · " + curPage.title}>
          {curPage.fields.map((f) => (
            <DynamicField key={page + ":" + f.key} f={f} value={pv(f.key)} onChange={(v) => setParam(f.key, v)} />
          ))}
        </PanelSection>
      ) : null}

      <PanelSection title="命令预览">
        <PanelSectionRow><Code text={preview && preview.command ? preview.command : "读取中…"} /></PanelSectionRow>
        {preview && preview.payload_json ? (
          <PanelSectionRow><Code text={preview.payload_json} /></PanelSectionRow>
        ) : null}
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !page} onClick={() => run(() => runAdvanced(page, currentParams(), false), "已运行 " + (curPage ? curPage.title : ""))}>
            <FaPlay style={{ marginRight: 6 }} />运行
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !page} onClick={() => run(() => runAdvanced(page, currentParams(), true), "已执行校验 (dry-run)")}>
            <FaBolt style={{ marginRight: 6 }} />校验（dry-run）
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy || !page} onClick={async () => { await run(async () => { const r = await enqueueAdvanced(page, currentParams()); return r; }, "已加入队列"); await refreshQueue(); }}>
            <FaListOl style={{ marginRight: 6 }} />加入队列
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="队列">
        {queue.length ? queue.map((q, i) => <KV key={String(i)} label={String(i + 1) + "."} value={q} small />) : <KV label="队列" value="（空）" small />}
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={async () => { await run(() => runQueue(), "队列已开始执行"); await refreshQueue(); }}>运行队列（{queue.length}）</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={async () => { await run(() => forceStop(), "已停止当前任务并中止队列"); await refreshQueue(); }}><FaStop style={{ marginRight: 6 }} />停止当前任务并中止队列</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={async () => { await run(() => clearQueue(), "队列已清空"); await refreshQueue(); }}>清空队列</ButtonItem></PanelSectionRow>
      </PanelSection>

      <PanelSection title="最近执行">
        {history.length ? history.map((h, i) => (
          <KV key={String(i)} label={<span><Dot color={h.code === 0 ? GREEN : "#d9534f"} />{h.label}</span>} value={h.time} small />
        )) : <KV label="历史" value="（无）" small />}
      </PanelSection>

      <PanelSection title="日志">
        <PanelSectionRow><Code text={logSlice(logs, 25)} /></PanelSectionRow>
        {st && st.job ? <PanelSectionRow><Code text={logSlice(jobLog, 12)} /></PanelSectionRow> : null}
        <PanelSectionRow><ButtonItem layout="below" onClick={openRunLog}><FaFileAlt style={{ marginRight: 6 }} />展开运行日志</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" onClick={openJobLog}><FaTerminal style={{ marginRight: 6 }} />展开安装/更新日志</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => run(async () => { await clearRunLog(); return { ok: true }; }, "运行日志已清空")}><FaTrashAlt style={{ marginRight: 6 }} />清空运行日志</ButtonItem></PanelSectionRow>
      </PanelSection>

      {coreManage}

      <PanelSection title="Waydroid 会话（高级）">
        <KV label="会话" value={st ? st.waydroid.session : "-"} />
        <KV label="容器服务" value={st ? st.waydroid.container : "-"} />
        <PanelSectionRow><div style={{ fontSize: 11, opacity: 0.6 }}>一般无需手动操作：在游戏模式打开 Waydroid 条目会自行启动会话。</div></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => run(() => startSession(), "已请求启动会话")}><FaAndroid style={{ marginRight: 6 }} />启动会话</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => run(() => stopSession(), "已请求停止会话")}>停止会话</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => run(() => forceStop(), "已强制停止并清理（含队列）")}><FaTrashAlt style={{ marginRight: 6 }} />强制停止 MAA 并清理</ButtonItem></PanelSectionRow>
      </PanelSection>

      <PanelSection title="诊断">
        <KV label="插件版本" value={st ? "v" + st.plugin_version : "-"} small />
        <KV label="后端设置" value={st && st.config ? "触摸=" + (st.config.touch_mode || "默认") + " / 连接=" + st.config.connection_mode + " / 日志=" + st.config.log_level + " / dry=" + String(!!st.config.dry_run) : "-"} small />
        <KV label="maa 二进制" value={st ? st.paths.maa : "-"} small />
        <KV label="adb 二进制" value={st ? st.paths.adb : "-"} small />
        <KV label="配置目录" value={st ? st.paths.config : "-"} small />
        <KV label="数据目录" value={st ? st.paths.data : "-"} small />
        <KV label="运行日志" value={st ? st.paths.log : "-"} small />
        <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={refresh}><FaSyncAlt style={{ marginRight: 6 }} />立即刷新状态</ButtonItem></PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => ({
  name: "Maa Deck",
  titleView: <div className={staticClasses.Title}>Maa Deck</div>,
  content: <Content />,
  icon: <FaRobot />,
  onDismount() {},
}));
