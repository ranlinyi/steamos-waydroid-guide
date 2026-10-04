const manifest = {"name":"Maa Deck"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const toaster = api.toaster;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaAndroid (props) {
  return GenIcon({"attr":{"viewBox":"0 0 576 512"},"child":[{"tag":"path","attr":{"d":"M420.55,301.93a24,24,0,1,1,24-24,24,24,0,0,1-24,24m-265.1,0a24,24,0,1,1,24-24,24,24,0,0,1-24,24m273.7-144.48,47.94-83a10,10,0,1,0-17.27-10h0l-48.54,84.07a301.25,301.25,0,0,0-246.56,0L116.18,64.45a10,10,0,1,0-17.27,10h0l47.94,83C64.53,202.22,8.24,285.55,0,384H576c-8.24-98.45-64.54-181.78-146.85-226.55"},"child":[]}]})(props);
}function FaWrench (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M507.73 109.1c-2.24-9.03-13.54-12.09-20.12-5.51l-74.36 74.36-67.88-11.31-11.31-67.88 74.36-74.36c6.62-6.62 3.43-17.9-5.66-20.16-47.38-11.74-99.55.91-136.58 37.93-39.64 39.64-50.55 97.1-34.05 147.2L18.74 402.76c-24.99 24.99-24.99 65.51 0 90.5 24.99 24.99 65.51 24.99 90.5 0l213.21-213.21c50.12 16.71 107.47 5.68 147.37-34.22 37.07-37.07 49.7-89.32 37.91-136.73zM64 472c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24z"},"child":[]}]})(props);
}function FaTrashAlt (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"},"child":[]}]})(props);
}function FaTerminal (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M257.981 272.971L63.638 467.314c-9.373 9.373-24.569 9.373-33.941 0L7.029 444.647c-9.357-9.357-9.375-24.522-.04-33.901L161.011 256 6.99 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L257.981 239.03c9.373 9.372 9.373 24.568 0 33.941zM640 456v-32c0-13.255-10.745-24-24-24H312c-13.255 0-24 10.745-24 24v32c0 13.255 10.745 24 24 24h304c13.255 0 24-10.745 24-24z"},"child":[]}]})(props);
}function FaSyncAlt (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M370.72 133.28C339.458 104.008 298.888 87.962 255.848 88c-77.458.068-144.328 53.178-162.791 126.85-1.344 5.363-6.122 9.15-11.651 9.15H24.103c-7.498 0-13.194-6.807-11.807-14.176C33.933 94.924 134.813 8 256 8c66.448 0 126.791 26.136 171.315 68.685L463.03 40.97C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.749zM32 296h134.059c21.382 0 32.09 25.851 16.971 40.971l-41.75 41.75c31.262 29.273 71.835 45.319 114.876 45.28 77.418-.07 144.315-53.144 162.787-126.849 1.344-5.363 6.122-9.15 11.651-9.15h57.304c7.498 0 13.194 6.807 11.807 14.176C478.067 417.076 377.187 504 256 504c-66.448 0-126.791-26.136-171.315-68.685L48.97 471.03C33.851 486.149 8 475.441 8 454.059V320c0-13.255 10.745-24 24-24z"},"child":[]}]})(props);
}function FaStop (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"},"child":[]}]})(props);
}function FaRobot (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M32,224H64V416H32A31.96166,31.96166,0,0,1,0,384V256A31.96166,31.96166,0,0,1,32,224Zm512-48V448a64.06328,64.06328,0,0,1-64,64H160a64.06328,64.06328,0,0,1-64-64V176a79.974,79.974,0,0,1,80-80H288V32a32,32,0,0,1,64,0V96H464A79.974,79.974,0,0,1,544,176ZM264,256a40,40,0,1,0-40,40A39.997,39.997,0,0,0,264,256Zm-8,128H192v32h64Zm96,0H288v32h64ZM456,256a40,40,0,1,0-40,40A39.997,39.997,0,0,0,456,256Zm-8,128H384v32h64ZM640,256V384a31.96166,31.96166,0,0,1-32,32H576V224h32A31.96166,31.96166,0,0,1,640,256Z"},"child":[]}]})(props);
}function FaPlug (props) {
  return GenIcon({"attr":{"viewBox":"0 0 384 512"},"child":[{"tag":"path","attr":{"d":"M320,32a32,32,0,0,0-64,0v96h64Zm48,128H16A16,16,0,0,0,0,176v32a16,16,0,0,0,16,16H32v32A160.07,160.07,0,0,0,160,412.8V512h64V412.8A160.07,160.07,0,0,0,352,256V224h16a16,16,0,0,0,16-16V176A16,16,0,0,0,368,160ZM128,32a32,32,0,0,0-64,0v96h64Z"},"child":[]}]})(props);
}function FaPlay (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"},"child":[]}]})(props);
}function FaListOl (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M61.77 401l17.5-20.15a19.92 19.92 0 0 0 5.07-14.19v-3.31C84.34 356 80.5 352 73 352H16a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h22.83a157.41 157.41 0 0 0-11 12.31l-5.61 7c-4 5.07-5.25 10.13-2.8 14.88l1.05 1.93c3 5.76 6.29 7.88 12.25 7.88h4.73c10.33 0 15.94 2.44 15.94 9.09 0 4.72-4.2 8.22-14.36 8.22a41.54 41.54 0 0 1-15.47-3.12c-6.49-3.88-11.74-3.5-15.6 3.12l-5.59 9.31c-3.72 6.13-3.19 11.72 2.63 15.94 7.71 4.69 20.38 9.44 37 9.44 34.16 0 48.5-22.75 48.5-44.12-.03-14.38-9.12-29.76-28.73-34.88zM496 224H176a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h320a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-160H176a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h320a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16zm0 320H176a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h320a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zM16 160h64a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8H64V40a8 8 0 0 0-8-8H32a8 8 0 0 0-7.14 4.42l-8 16A8 8 0 0 0 24 64h8v64H16a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8zm-3.91 160H80a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8H41.32c3.29-10.29 48.34-18.68 48.34-56.44 0-29.06-25-39.56-44.47-39.56-21.36 0-33.8 10-40.46 18.75-4.37 5.59-3 10.84 2.8 15.37l8.58 6.88c5.61 4.56 11 2.47 16.12-2.44a13.44 13.44 0 0 1 9.46-3.84c3.33 0 9.28 1.56 9.28 8.75C51 248.19 0 257.31 0 304.59v4C0 316 5.08 320 12.09 320z"},"child":[]}]})(props);
}function FaFileAlt (props) {
  return GenIcon({"attr":{"viewBox":"0 0 384 512"},"child":[{"tag":"path","attr":{"d":"M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-64c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8zm0-72v8c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm96-114.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"},"child":[]}]})(props);
}function FaDownload (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"},"child":[]}]})(props);
}function FaCog (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"},"child":[]}]})(props);
}function FaBolt (props) {
  return GenIcon({"attr":{"viewBox":"0 0 320 512"},"child":[{"tag":"path","attr":{"d":"M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z"},"child":[]}]})(props);
}function FaArrowLeft (props) {
  return GenIcon({"attr":{"viewBox":"0 0 448 512"},"child":[{"tag":"path","attr":{"d":"M257.5 445.1l-22.2 22.2c-9.4 9.4-24.6 9.4-33.9 0L7 273c-9.4-9.4-9.4-24.6 0-33.9L201.4 44.7c9.4-9.4 24.6-9.4 33.9 0l22.2 22.2c9.5 9.5 9.3 25-.4 34.3L136.6 216H424c13.3 0 24 10.7 24 24v32c0 13.3-10.7 24-24 24H136.6l120.5 114.8c9.8 9.3 10 24.8.4 34.3z"},"child":[]}]})(props);
}

const getStatus = callable("get_status");
const listTasks = callable("list_tasks");
const setConfig = callable("set_config");
const startMaa = callable("start");
const stopMaa = callable("stop");
const forceStop = callable("force_stop");
const getRunLog = callable("get_log");
const getJobLog = callable("get_job_log");
const clearRunLog = callable("clear_log");
const installCore = callable("install_core");
const updateCore = callable("update_core");
const hotUpdate = callable("hot_update");
const connectAdb = callable("connect_adb");
const disconnectAdb = callable("disconnect_adb");
const startSession = callable("start_session");
const stopSession = callable("stop_session");
const getAdvPages = callable("get_adv_pages");
const previewCommand = callable("preview_command");
const runAdvanced = callable("run_advanced");
const enqueueAdvanced = callable("enqueue_advanced");
const getQueue = callable("get_queue");
const clearQueue = callable("clear_queue");
const runQueue = callable("run_queue");
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
function Dot(props) {
    return SP_JSX.jsx("span", { style: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: props.color, marginRight: 6, verticalAlign: "middle" } });
}
function Badge(props) {
    return (SP_JSX.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: props.color, border: "1px solid " + props.color, borderRadius: 10, padding: "1px 8px", whiteSpace: "nowrap" }, children: props.text }));
}
function KV(props) {
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }, children: [SP_JSX.jsx("span", { style: { opacity: 0.72, flex: "0 0 auto" }, children: props.label }), SP_JSX.jsx("span", { style: { textAlign: "right", wordBreak: "break-all", fontSize: props.small ? 11 : undefined, opacity: props.small ? 0.8 : 1 }, children: props.value })] }) }));
}
function fmtDuration(sec) {
    const total = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0)
        return h + " 小时 " + m + " 分";
    if (m > 0)
        return m + " 分 " + s + " 秒";
    return s + " 秒";
}
function logSlice(text, lines) {
    if (!text)
        return "(暂无输出)";
    return text.split("\n").slice(-lines).join("\n");
}
function pickVal(o) {
    return o && typeof o === "object" && "data" in o ? o.data : o;
}
function LogModal(props) {
    const [text, setText] = SP_REACT.useState("读取中…");
    const preRef = SP_REACT.useRef(null);
    const load = async () => {
        try {
            setText(await props.loader());
        }
        catch (e) {
            setText("读取失败: " + String(e && e.message ? e.message : e));
        }
    };
    SP_REACT.useEffect(() => {
        load();
        const timer = setInterval(load, 1500);
        return () => clearInterval(timer);
    }, []);
    SP_REACT.useEffect(() => {
        if (preRef.current)
            preRef.current.scrollTop = preRef.current.scrollHeight;
    }, [text]);
    return (SP_JSX.jsx(DFL.ModalRoot, { closeModal: props.onClose, bAllowFullSize: true, children: SP_JSX.jsxs("div", { style: { padding: 12, minWidth: "72vw" }, children: [SP_JSX.jsxs("div", { style: { fontSize: 16, fontWeight: 700, marginBottom: 8 }, children: [props.title, "\uFF08\u6BCF 1.5 \u79D2\u81EA\u52A8\u5237\u65B0\uFF09"] }), SP_JSX.jsx("pre", { ref: preRef, style: { whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "66vh", overflow: "auto", fontSize: 12, lineHeight: 1.4, background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 4, margin: 0 }, children: text || "(空)" })] }) }));
}
function showLog(title, loader) {
    let handle = null;
    const close = () => { try {
        if (handle)
            handle.Close();
    }
    catch (e) { /* ignore */ } };
    handle = DFL.showModal(SP_JSX.jsx(LogModal, { title: title, loader: loader, onClose: close }), undefined, { strTitle: title });
}
function Code(props) {
    return (SP_JSX.jsx("pre", { style: { whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflow: "auto", fontSize: 11, lineHeight: 1.35, background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4, margin: 0, width: "100%" }, children: props.text || "(空)" }));
}
function DynamicField(props) {
    const f = props.f;
    const row = (child) => SP_JSX.jsx(DFL.PanelSectionRow, { children: child });
    if (f.type === "bool") {
        return row(SP_JSX.jsx(DFL.ToggleField, { label: f.label, description: f.help || undefined, checked: !!props.value, onChange: (v) => props.onChange(v) }));
    }
    if (f.type === "select") {
        return row(SP_JSX.jsx(DFL.DropdownItem, { label: f.label, rgOptions: f.options.map((o) => ({ data: o[0], label: String(o[1]) })), selectedOption: props.value === undefined || props.value === null ? f.default : props.value, onChange: (o) => props.onChange(pickVal(o)) }));
    }
    const numeric = f.type === "int" || f.type === "float";
    return row(SP_JSX.jsx(DFL.TextField, { label: f.label, description: f.help || undefined, mustBeNumeric: numeric, value: props.value === undefined || props.value === null ? String(f.default === undefined ? "" : f.default) : String(props.value), onChange: (e) => props.onChange(e.target.value) }));
}
function Content() {
    const opLock = SP_REACT.useRef(false);
    const pendingSave = SP_REACT.useRef(false);
    const saveTimer = SP_REACT.useRef(null);
    const modeInit = SP_REACT.useRef(false);
    const cfgRef = SP_REACT.useRef(null);
    const runningRef = SP_REACT.useRef(false);
    const liveRef = SP_REACT.useRef(null);
    const [st, setSt] = SP_REACT.useState(null);
    const [tasks, setTasks] = SP_REACT.useState(null);
    const [cmd, setCmd] = SP_REACT.useState("");
    const [customSel, setCustomSel] = SP_REACT.useState("");
    const [busy, setBusy] = SP_REACT.useState(false);
    const [cfg, setCfg] = SP_REACT.useState(null);
    const [logs, setLogs] = SP_REACT.useState("");
    const [jobLog, setJobLog] = SP_REACT.useState("");
    const [err, setErr] = SP_REACT.useState("");
    const [mode, setMode] = SP_REACT.useState("basic");
    const [adv, setAdv] = SP_REACT.useState(null);
    const [page, setPage] = SP_REACT.useState("");
    const [pageParams, setPageParams] = SP_REACT.useState({});
    const [preview, setPreview] = SP_REACT.useState(null);
    const [queue, setQueue] = SP_REACT.useState([]);
    const [history, setHistory] = SP_REACT.useState([]);
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
            try {
                setLogs(await getRunLog(25));
            }
            catch (e) { /* ignore */ }
            if (s.job) {
                try {
                    setJobLog(await getJobLog(15));
                }
                catch (e) { /* ignore */ }
            }
        }
        catch (e) {
            setErr(String(e && e.message ? e.message : e));
        }
    };
    const refreshTasks = async () => {
        try {
            const t = await listTasks();
            setTasks(t);
            setCmd((prev) => prev || t.default_command || (t.predefined[0] ? t.predefined[0].id : ""));
        }
        catch (e) { /* ignore */ }
    };
    const refreshAdv = async () => {
        try {
            const a = await getAdvPages();
            setAdv(a);
            setPageParams(a.params || {});
            setQueue(a.queue || []);
            setHistory(a.history || []);
        }
        catch (e) { /* ignore */ }
    };
    SP_REACT.useEffect(() => {
        refreshTasks();
        refreshAdv();
        let alive = true;
        let timer = null;
        const tick = async () => {
            await refresh();
            if (!alive)
                return;
            timer = setTimeout(tick, runningRef.current ? 1000 : 3000);
        };
        tick();
        return () => {
            alive = false;
            if (timer)
                clearTimeout(timer);
        };
    }, []);
    SP_REACT.useEffect(() => {
        cfgRef.current = cfg;
    }, [cfg]);
    SP_REACT.useEffect(() => {
        runningRef.current = !!(st && (st.running || st.job));
    }, [st]);
    SP_REACT.useEffect(() => {
        if (liveRef.current)
            liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }, [logs]);
    SP_REACT.useEffect(() => {
        if (adv && !page) {
            const saved = cfg && cfg.ui_page;
            const keys = adv.pages.map((p) => p.key);
            setPage(saved && keys.indexOf(saved) >= 0 ? saved : (adv.pages[0] ? adv.pages[0].key : ""));
        }
    }, [adv, cfg, page]);
    const run = async (fn, okMsg) => {
        if (opLock.current)
            return;
        opLock.current = true;
        setBusy(true);
        try {
            const r = await fn();
            if (r && r.ok === false)
                toaster.toast({ title: "Maa Deck", body: r.error || "操作失败", duration: 5000 });
            else if (okMsg)
                toaster.toast({ title: "Maa Deck", body: okMsg, duration: 3000 });
        }
        catch (e) {
            toaster.toast({ title: "Maa Deck", body: String(e && e.message ? e.message : e), duration: 5000 });
        }
        finally {
            setBusy(false);
            opLock.current = false;
            await refresh();
        }
    };
    const patch = (key, value, debounce = false) => {
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
            }
            catch (e) {
                /* ignore */
            }
            finally {
                pendingSave.current = false;
                saveTimer.current = null;
            }
        };
        if (debounce) {
            saveTimer.current = setTimeout(doSave, 700);
        }
        else {
            doSave();
        }
    };
    const startCmd = (c, msg) => run(() => startMaa(c), msg);
    const saveCfg = async () => {
        if (!cfg)
            return;
        if (opLock.current)
            return;
        opLock.current = true;
        pendingSave.current = true;
        setBusy(true);
        try {
            const r = await setConfig(cfgRef.current || cfg);
            cfgRef.current = r;
            setCfg(r);
            toaster.toast({ title: "Maa Deck", body: "设置已保存", duration: 3000 });
        }
        catch (e) {
            toaster.toast({ title: "Maa Deck", body: String(e), duration: 5000 });
        }
        finally {
            pendingSave.current = false;
            setBusy(false);
            opLock.current = false;
            await refresh();
        }
    };
    const switchMode = async (m) => {
        if (opLock.current)
            return;
        opLock.current = true;
        setMode(m);
        pendingSave.current = true;
        try {
            await setConfig(Object.assign({}, cfgRef.current, { ui_mode: m }));
        }
        catch (e) { /* ignore */ }
        finally {
            opLock.current = false;
            pendingSave.current = false;
        }
    };
    const openRunLog = () => showLog("MAA 运行日志", () => getRunLog(500));
    const openJobLog = () => showLog("MaaCore 安装/更新日志", () => getJobLog(500));
    const pickPage = (k) => {
        setPage(k);
        pendingSave.current = true;
        try {
            setConfig(Object.assign({}, cfgRef.current, { ui_page: k }))
                .then((r) => {
                cfgRef.current = r;
                setCfg(r);
            })
                .catch(() => { })
                .finally(() => {
                pendingSave.current = false;
            });
        }
        catch (e) {
            pendingSave.current = false;
        }
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
    adv ? adv.pages.map((p) => ({ data: p.key, label: p.group + " · " + p.title })) : [];
    const curPage = adv ? adv.pages.find((p) => p.key === page) : undefined;
    const pv = (key) => {
        const pp = pageParams[page] || {};
        return pp[key] !== undefined ? pp[key] : undefined;
    };
    const setParam = (key, value) => {
        setPageParams((prev) => {
            const next = Object.assign({}, prev);
            next[page] = Object.assign({}, next[page] || {}, { [key]: value });
            return next;
        });
    };
    const currentParams = () => {
        const out = {};
        if (curPage)
            for (const f of curPage.fields)
                out[f.key] = pv(f.key) !== undefined ? pv(f.key) : f.default;
        return out;
    };
    SP_REACT.useEffect(() => {
        if (mode !== "advanced" || !page)
            return undefined;
        const t = setTimeout(async () => {
            try {
                setPreview(await previewCommand(page, currentParams()));
            }
            catch (e) { /* ignore */ }
        }, 350);
        return () => clearTimeout(t);
    }, [mode, page, JSON.stringify(pageParams)]);
    const refreshQueue = async () => {
        try {
            const q = await getQueue();
            setQueue(q.queue || []);
            setHistory(q.history || []);
        }
        catch (e) { /* ignore */ }
    };
    const modeToggle = (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => switchMode(mode === "advanced" ? "basic" : "advanced"), children: [SP_JSX.jsx(FaWrench, { style: { marginRight: 6 } }), mode === "advanced" ? "返回基础模式" : "切换到高级模式"] }) }));
    const statusSection = (SP_JSX.jsxs(DFL.PanelSection, { title: "\u8FD0\u884C\u72B6\u6001", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [SP_JSX.jsx("span", { style: { opacity: 0.72 }, children: "\u5F15\u64CE" }), SP_JSX.jsx(Badge, { text: engine.text, color: engine.color })] }) }), st && st.running ? SP_JSX.jsx(KV, { label: "\u5F53\u524D\u547D\u4EE4", value: st.command }) : null, st && st.running ? SP_JSX.jsx(KV, { label: "\u5DF2\u8FD0\u884C", value: fmtDuration(st.elapsed) }) : null, st && st.job ? SP_JSX.jsx(KV, { label: "\u540E\u53F0\u4EFB\u52A1", value: st.job + "（" + fmtDuration(st.job_elapsed) + "）" }) : null, st && st.queue && st.queue.length ? SP_JSX.jsx(KV, { label: "\u961F\u5217", value: st.queue.length + " 项" }) : null, SP_JSX.jsx(KV, { label: "\u6700\u8FD1\u8F93\u51FA", value: st && st.last_log ? logSlice(st.last_log, 1) : "—", small: true }), st && (st.running || st.job) ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("pre", { ref: liveRef, style: { whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 150, overflow: "auto", fontSize: 11, lineHeight: 1.35, background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4, margin: 0, width: "100%" }, children: logSlice(logs, 16) || "(等待输出…)" }) })) : null, err ? SP_JSX.jsx(KV, { label: "\u9519\u8BEF", value: err }) : null] }));
    const coreSection = (SP_JSX.jsxs(DFL.PanelSection, { title: "\u6838\u5FC3\u4E0E\u73AF\u5883", children: [SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: GREEN }), "maa-cli"] }), value: st && st.maa.installed ? st.maa.cli_version || "已安装" : "未安装" }), SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: coreColor }), "MaaCore"] }), value: coreText }), SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: adbColor }), "ADB \u8BBE\u5907"] }), value: st && st.adb.connected ? "已连接" : "未连接" }), SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: wdColor }), "Waydroid \u4F1A\u8BDD"] }), value: st ? (st.waydroid.installed ? st.waydroid.session : "未安装") : "-" }), SP_JSX.jsx(KV, { label: "\u5BB9\u5668\u670D\u52A1", value: st ? st.waydroid.container : "-", small: true }), SP_JSX.jsx(KV, { label: "\u5B89\u5353\u5206\u8FA8\u7387", value: wdRes, small: true })] }));
    const taskControl = (SP_JSX.jsxs(DFL.PanelSection, { title: "\u4EFB\u52A1\u63A7\u5236", children: [presetOpts.length > 0 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "\u9884\u5B9A\u4E49\u4EFB\u52A1", menuLabel: "\u9009\u62E9\u9884\u5B9A\u4E49\u4EFB\u52A1", rgOptions: presetOpts, selectedOption: cmd, onChange: (o) => setCmd(pickVal(o)) }) })) : null, customOpts.length > 0 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "\u81EA\u5B9A\u4E49\u4EFB\u52A1", menuLabel: "\u9009\u62E9\u81EA\u5B9A\u4E49\u4EFB\u52A1", rgOptions: customOpts, selectedOption: customSel, onChange: (o) => { const v = pickVal(o); setCustomSel(v); setCmd(v); } }) })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "\u547D\u4EE4", value: cmd, onChange: (e) => setCmd(e.target.value) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => startMaa(cmd), "已启动 MAA"), children: [SP_JSX.jsx(FaPlay, { style: { marginRight: 6 } }), "\u542F\u52A8 MAA"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => stopMaa(), "已停止 MAA"), children: [SP_JSX.jsx(FaStop, { style: { marginRight: 6 } }), "\u505C\u6B62 MAA"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => forceStop(), "已强制停止并清理（含队列）"), children: [SP_JSX.jsx(FaTrashAlt, { style: { marginRight: 6 } }), "\u5F3A\u5236\u505C\u6B62\u5E76\u6E05\u7406"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: 11, opacity: 0.6, marginTop: 4 }, children: "\u5FEB\u6377\u4EFB\u52A1" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => startCmd("startup Official", "已启动：启动游戏"), children: "\u542F\u52A8\u6E38\u620F\uFF08\u5B98\u670D\uFF09" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => startCmd("fight", "已启动：开始战斗"), children: "\u5F00\u59CB\u6218\u6597" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => startCmd("closedown", "已启动：关闭游戏"), children: "\u5173\u95ED\u6E38\u620F\u5BA2\u6237\u7AEF" }) })] }));
    const coreManage = (SP_JSX.jsxs(DFL.PanelSection, { title: "MaaCore \u7BA1\u7406", children: [SP_JSX.jsx(KV, { label: "\u72B6\u6001", value: st && st.maa.core_installed ? "已安装" : "未安装" }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !!st?.job, onClick: () => run(() => installCore(), "已开始安装 MaaCore"), children: [SP_JSX.jsx(FaDownload, { style: { marginRight: 6 } }), "\u5B89\u88C5 MaaCore"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !!st?.job, onClick: () => run(() => updateCore(), "已开始更新 MaaCore"), children: [SP_JSX.jsx(FaSyncAlt, { style: { marginRight: 6 } }), "\u66F4\u65B0 MaaCore"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !!st?.job, onClick: () => run(() => hotUpdate(), "已开始热更新资源"), children: [SP_JSX.jsx(FaBolt, { style: { marginRight: 6 } }), "\u70ED\u66F4\u65B0\u8D44\u6E90"] }) })] }));
    if (mode === "basic") {
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [modeToggle, statusSection, coreSection, taskControl, coreManage] }));
    }
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { textAlign: "center", fontWeight: 700, opacity: 0.9, width: "100%" }, children: "\u9AD8\u7EA7\u6A21\u5F0F" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => switchMode("basic"), children: [SP_JSX.jsx(FaArrowLeft, { style: { marginRight: 6 } }), "\u8FD4\u56DE\u57FA\u7840\u6A21\u5F0F"] }) }), statusSection, SP_JSX.jsxs(DFL.PanelSection, { title: "\u8BBE\u5907\u4E0E\u8FDE\u63A5", children: [SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: adbColor }), "ADB \u8BBE\u5907"] }), value: st && st.adb.connected ? "已连接" : "未连接" }), SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: wdColor }), "Waydroid"] }), value: st ? st.waydroid.session : "-" }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "ADB \u5730\u5740", value: (cfg && cfg.adb_address) || "", onChange: (e) => patch("adb_address", e.target.value, true) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "\u8FDE\u63A5\u6A21\u5F0F", rgOptions: [{ data: "manual", label: "手动 ADB（推荐）" }, { data: "waydroid", label: "maa-cli Waydroid 预设" }], selectedOption: (cfg && cfg.connection_mode) || "manual", onChange: (o) => patch("connection_mode", pickVal(o)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "\u89E6\u6478\u6A21\u5F0F", rgOptions: TOUCH_MODES.map((m) => ({ data: m, label: m === "" ? "默认" : m })), selectedOption: (cfg && cfg.touch_mode) || "", onChange: (o) => patch("touch_mode", pickVal(o)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => connectAdb(), "ADB 已连接"), children: [SP_JSX.jsx(FaPlug, { style: { marginRight: 6 } }), "\u8FDE\u63A5 ADB"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => disconnectAdb(), "ADB 已断开"), children: "\u65AD\u5F00 ADB" }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "\u5168\u5C40\u8FD0\u884C\u53C2\u6570", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "\u6F14\u7EC3\u6A21\u5F0F (--dry-run)", description: "\u53EA\u89E3\u6790\u53C2\u6570\uFF0C\u4E0D\u5B9E\u9645\u8BC6\u522B\u6E38\u620F", checked: !!(cfg && cfg.dry_run), onChange: (v) => patch("dry_run", v) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "\u4F7F\u7528\u81EA\u5B9A\u4E49\u8D44\u6E90 (--user-resource)", checked: !!(cfg && cfg.user_resource), onChange: (v) => patch("user_resource", v) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "\u4F1A\u8BDD\u7ED3\u675F\u81EA\u52A8\u505C\u6B62 MAA", description: "Waydroid \u4F1A\u8BDD\u4E00\u505C\u5C31\u5F3A\u5236\u7ED3\u675F MAA \u8FDB\u7A0B\u7EC4\u5E76\u6E05\u7A7A\u961F\u5217\uFF08\u9632\u5E7D\u7075\u8FDB\u7A0B\uFF09", checked: cfg ? cfg.stop_on_session_end !== false : true, onChange: (v) => patch("stop_on_session_end", v) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "\u9000\u51FA\u65F6\u7ED3\u675F adb (kill_adb_on_exit)", description: "\u505C\u6B62 MAA \u65F6\u4E00\u5E76\u6267\u884C adb kill-server", checked: !!(cfg && cfg.kill_adb_on_exit), onChange: (v) => patch("kill_adb_on_exit", v) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "\u65E5\u5FD7\u8BE6\u7EC6\u5EA6", rgOptions: VERBOSE_OPTS, selectedOption: (cfg && cfg.verbose) || 0, onChange: (o) => patch("verbose", pickVal(o)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "\u65E5\u5FD7\u7EA7\u522B", rgOptions: LOG_LEVELS.map((l) => ({ data: l, label: l })), selectedOption: (cfg && cfg.log_level) || "info", onChange: (o) => patch("log_level", pickVal(o)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !cfg, onClick: saveCfg, children: [SP_JSX.jsx(FaCog, { style: { marginRight: 6 } }), "\u4FDD\u5B58\u8BBE\u7F6E"] }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "\u4EFB\u52A1\u9875", children: [SP_JSX.jsx(KV, { label: "\u5F53\u524D\u9875\u9762", value: curPage ? curPage.group + " · " + curPage.title : "-" }), curPage ? SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: 11, opacity: 0.6 }, children: curPage.subtitle }) }) : null, adv
                        ? Array.from(new Set(adv.pages.map((p) => p.group))).map((g) => (SP_JSX.jsxs("div", { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: 11, opacity: 0.55, marginTop: 6 }, children: g }) }), adv.pages
                                    .filter((p) => p.group === g)
                                    .map((p) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: page === p.key, onClick: () => pickPage(p.key), children: (page === p.key ? "● " : "") + p.title }) }, p.key)))] }, g)))
                        : null] }), curPage ? (SP_JSX.jsx(DFL.PanelSection, { title: "参数 · " + curPage.title, children: curPage.fields.map((f) => (SP_JSX.jsx(DynamicField, { f: f, value: pv(f.key), onChange: (v) => setParam(f.key, v) }, page + ":" + f.key))) }, page)) : null, SP_JSX.jsxs(DFL.PanelSection, { title: "\u547D\u4EE4\u9884\u89C8", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(Code, { text: preview && preview.command ? preview.command : "读取中…" }) }), preview && preview.payload_json ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(Code, { text: preview.payload_json }) })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !page, onClick: () => run(() => runAdvanced(page, currentParams(), false), "已运行 " + (curPage ? curPage.title : "")), children: [SP_JSX.jsx(FaPlay, { style: { marginRight: 6 } }), "\u8FD0\u884C"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !page, onClick: () => run(() => runAdvanced(page, currentParams(), true), "已执行校验 (dry-run)"), children: [SP_JSX.jsx(FaBolt, { style: { marginRight: 6 } }), "\u6821\u9A8C\uFF08dry-run\uFF09"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy || !page, onClick: async () => { await run(async () => { const r = await enqueueAdvanced(page, currentParams()); return r; }, "已加入队列"); await refreshQueue(); }, children: [SP_JSX.jsx(FaListOl, { style: { marginRight: 6 } }), "\u52A0\u5165\u961F\u5217"] }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "\u961F\u5217", children: [queue.length ? queue.map((q, i) => SP_JSX.jsx(KV, { label: String(i + 1) + ".", value: q, small: true }, String(i))) : SP_JSX.jsx(KV, { label: "\u961F\u5217", value: "\uFF08\u7A7A\uFF09", small: true }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: async () => { await run(() => runQueue(), "队列已开始执行"); await refreshQueue(); }, children: ["\u8FD0\u884C\u961F\u5217\uFF08", queue.length, "\uFF09"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: async () => { await run(() => forceStop(), "已停止当前任务并中止队列"); await refreshQueue(); }, children: [SP_JSX.jsx(FaStop, { style: { marginRight: 6 } }), "\u505C\u6B62\u5F53\u524D\u4EFB\u52A1\u5E76\u4E2D\u6B62\u961F\u5217"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: async () => { await run(() => clearQueue(), "队列已清空"); await refreshQueue(); }, children: "\u6E05\u7A7A\u961F\u5217" }) })] }), SP_JSX.jsx(DFL.PanelSection, { title: "\u6700\u8FD1\u6267\u884C", children: history.length ? history.map((h, i) => (SP_JSX.jsx(KV, { label: SP_JSX.jsxs("span", { children: [SP_JSX.jsx(Dot, { color: h.code === 0 ? GREEN : "#d9534f" }), h.label] }), value: h.time, small: true }, String(i)))) : SP_JSX.jsx(KV, { label: "\u5386\u53F2", value: "\uFF08\u65E0\uFF09", small: true }) }), SP_JSX.jsxs(DFL.PanelSection, { title: "\u65E5\u5FD7", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(Code, { text: logSlice(logs, 25) }) }), st && st.job ? SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(Code, { text: logSlice(jobLog, 12) }) }) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: openRunLog, children: [SP_JSX.jsx(FaFileAlt, { style: { marginRight: 6 } }), "\u5C55\u5F00\u8FD0\u884C\u65E5\u5FD7"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: openJobLog, children: [SP_JSX.jsx(FaTerminal, { style: { marginRight: 6 } }), "\u5C55\u5F00\u5B89\u88C5/\u66F4\u65B0\u65E5\u5FD7"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(async () => { await clearRunLog(); return { ok: true }; }, "运行日志已清空"), children: [SP_JSX.jsx(FaTrashAlt, { style: { marginRight: 6 } }), "\u6E05\u7A7A\u8FD0\u884C\u65E5\u5FD7"] }) })] }), coreManage, SP_JSX.jsxs(DFL.PanelSection, { title: "Waydroid \u4F1A\u8BDD\uFF08\u9AD8\u7EA7\uFF09", children: [SP_JSX.jsx(KV, { label: "\u4F1A\u8BDD", value: st ? st.waydroid.session : "-" }), SP_JSX.jsx(KV, { label: "\u5BB9\u5668\u670D\u52A1", value: st ? st.waydroid.container : "-" }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: 11, opacity: 0.6 }, children: "\u4E00\u822C\u65E0\u9700\u624B\u52A8\u64CD\u4F5C\uFF1A\u5728\u6E38\u620F\u6A21\u5F0F\u6253\u5F00 Waydroid \u6761\u76EE\u4F1A\u81EA\u884C\u542F\u52A8\u4F1A\u8BDD\u3002" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => startSession(), "已请求启动会话"), children: [SP_JSX.jsx(FaAndroid, { style: { marginRight: 6 } }), "\u542F\u52A8\u4F1A\u8BDD"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => stopSession(), "已请求停止会话"), children: "\u505C\u6B62\u4F1A\u8BDD" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => run(() => forceStop(), "已强制停止并清理（含队列）"), children: [SP_JSX.jsx(FaTrashAlt, { style: { marginRight: 6 } }), "\u5F3A\u5236\u505C\u6B62 MAA \u5E76\u6E05\u7406"] }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "\u8BCA\u65AD", children: [SP_JSX.jsx(KV, { label: "\u63D2\u4EF6\u7248\u672C", value: st ? "v" + st.plugin_version : "-", small: true }), SP_JSX.jsx(KV, { label: "\u540E\u7AEF\u8BBE\u7F6E", value: st && st.config ? "触摸=" + (st.config.touch_mode || "默认") + " / 连接=" + st.config.connection_mode + " / 日志=" + st.config.log_level + " / dry=" + String(!!st.config.dry_run) : "-", small: true }), SP_JSX.jsx(KV, { label: "maa \u4E8C\u8FDB\u5236", value: st ? st.paths.maa : "-", small: true }), SP_JSX.jsx(KV, { label: "adb \u4E8C\u8FDB\u5236", value: st ? st.paths.adb : "-", small: true }), SP_JSX.jsx(KV, { label: "\u914D\u7F6E\u76EE\u5F55", value: st ? st.paths.config : "-", small: true }), SP_JSX.jsx(KV, { label: "\u6570\u636E\u76EE\u5F55", value: st ? st.paths.data : "-", small: true }), SP_JSX.jsx(KV, { label: "\u8FD0\u884C\u65E5\u5FD7", value: st ? st.paths.log : "-", small: true }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: refresh, children: [SP_JSX.jsx(FaSyncAlt, { style: { marginRight: 6 } }), "\u7ACB\u5373\u5237\u65B0\u72B6\u6001"] }) })] })] }));
}
var index = definePlugin(() => ({
    name: "Maa Deck",
    titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Maa Deck" }),
    content: SP_JSX.jsx(Content, {}),
    icon: SP_JSX.jsx(FaRobot, {}),
    onDismount() { },
}));

export { index as default };
//# sourceMappingURL=index.js.map
