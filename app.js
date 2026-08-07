// ============================================================================
//  导入树管理核心
// ============================================================================
import { TreeManager, TreeNode, compareArrays } from './treeManager.js';

// ============================================================================
//  导入主题、符号常量、记号核心
// ============================================================================
import { THEMES, GUTTER, BRANCH, LAST_B, EMPTY } from './themes.js';
import {
  NOTATION_REGISTRY,
  notationCache,
  loadNotation,
  createNotationAdapter,
  parseInput,
} from './notationCore.js';

// ============================================================================
//  React 组件 (TreeNodeView)
// ============================================================================
function buildRenderNode(manager, nodeId, notationKey, notationNames, treeIndex) {
  const node = manager.getNode(nodeId);
  if (!node) return null;
  const children = node.children.map(cid => buildRenderNode(manager, cid, notationKey, notationNames, treeIndex))
    .filter(Boolean);
  let displayStr;
  const notName = notationNames[notationKey] || notationKey;

  if (node.data === null && node.type === 'LIMIT') {
    displayStr = `Limit ${notName}`;
  } else if (node.error) {
    displayStr = `Error: ${node.error}`;
  } else if (node.type === 'LIMIT') {
    try {
      const mod = notationCache.get(notationKey);
      if (mod && typeof mod.display === 'function') {
        const inner = mod.display(node.data, false);
        displayStr = `${notName}(${inner})`;
      } else {
        displayStr = `${notName}(...)`;
      }
    } catch {
      displayStr = `${notName}(...)`;
    }
  } else {
    try {
      const mod = notationCache.get(notationKey);
      if (mod && typeof mod.display === 'function') {
        displayStr = mod.display(node.data, true);
      } else {
        displayStr = String(node.data);
      }
    } catch {
      displayStr = String(node.data);
    }
  }

  const canActuallyExpand = manager.canExpandNode ? manager.canExpandNode(nodeId) : false;

  return {
    id: node.id,
    type: node.type,
    data: node.data,
    displayStr,
    isExpanded: node.isExpanded,
    hasExpanded: node.hasExpanded,
    error: node.error,
    children,
    fsIndex: null,
    clickIndex: node.clickIndex,
    isLimit: node.type === 'LIMIT',
    isSuccessor: node.isSuccessor,
    notationKey,
    treeIndex,
    canActuallyExpand,
  };
}

function TreeNodeView({
  node,
  isLast,
  prefixes,
  theme,
  focusedItem,
  navItems,
  setFocusIdx,
  onToggle,
  onMore,
  notationNames,
  fsIndex,
}) {
  const ref = React.useRef(null);
  const moreRef = React.useRef(null);

  const canExpand = !node.error && node.canActuallyExpand;
  const hasMore = canExpand && (node.children.length < 100);
  const isFocused = focusedItem?.type === "node" && focusedItem.id === node.id && focusedItem.treeIndex === node.treeIndex;
  const isMoreFocused = focusedItem?.type === "more" && focusedItem.parentId === node.id && focusedItem.treeIndex === node.treeIndex;

  React.useEffect(() => {
    if (isFocused && ref.current) ref.current.scrollIntoView({ block: "nearest" });
  }, [isFocused]);
  React.useEffect(() => {
    if (isMoreFocused && moreRef.current) moreRef.current.scrollIntoView({ block: "nearest" });
  }, [isMoreFocused]);

  const connector = fsIndex !== undefined ? (isLast ? LAST_B : BRANCH) : "▸ ";
  const prefix = prefixes.join("");

  let icon = null;
  if (canExpand) {
    if (!node.hasExpanded) {
      icon = "⊕";
    } else {
      icon = node.isExpanded ? "⊖" : "⊕";
    }
  }

  const renderChildren = () => {
    if (!node.isExpanded) return null;
    const renderChildrenList = node.children;
    const n = renderChildrenList.length;
    const elements = [];

    if (hasMore) {
      const morePrefixes = (fsIndex !== undefined) ?
        [...prefixes, isLast ? EMPTY : GUTTER] :
        [...prefixes, GUTTER];
      const moreConn = (n > 0) ? BRANCH : LAST_B;

      const moreElement = React.createElement(
        "div", {
          ref: moreRef,
          key: "__more__",
          style: {
            display: "flex",
            alignItems: "baseline",
            minHeight: 22,
            cursor: "pointer",
            background: isMoreFocused ? theme.highlight : "transparent",
            margin: "0 -4px",
            padding: "0 4px",
            borderRadius: 2,
          },
          onClick: (e) => {
            e.stopPropagation();
            onMore(node.treeIndex, node.id);
          }
        },
        React.createElement(
          "span",
          {
            style: {
              color: theme.fgMuted,
              whiteSpace: "pre",
              userSelect: "none"
            }
          },
          morePrefixes.join(""),
          moreConn
        ),
        React.createElement(
          "span",
          {
            style: {
              color: theme.moreColor,
              fontStyle: "italic",
              fontSize: 12
            }
          },
          "… (点击或按 Enter)"
        )
      );
      elements.push(moreElement);
    }

    for (let i = 0; i < n; i++) {
      const child = renderChildrenList[i];
      const isLastChild = (i === n - 1);
      const childPrefixes = (fsIndex !== undefined) ?
        [...prefixes, isLast ? EMPTY : GUTTER] :
        [...prefixes, GUTTER];

      elements.push(
        React.createElement(TreeNodeView, {
          key: child.id,
          node: child,
          isLast: isLastChild,
          prefixes: childPrefixes,
          theme,
          focusedItem,
          navItems,
          setFocusIdx,
          onToggle,
          onMore,
          notationNames,
          fsIndex: i,
        })
      );
    }

    return elements;
  };

  return React.createElement("div", null,
    React.createElement(
      "div", {
        ref,
        style: {
          display: "flex",
          alignItems: "baseline",
          minHeight: 22,
          cursor: canExpand ? "pointer" : "default",
          background: isFocused ? theme.highlight : "transparent",
          borderRadius: 2,
          margin: "0 -4px",
          padding: "0 4px"
        },
        onClick: () => {
          if (canExpand) onToggle(node.treeIndex, node.id);
          const idx = navItems.findIndex((n) => n.type === "node" && n.id === node.id && n.treeIndex === node.treeIndex);
          if (idx >= 0) setFocusIdx(idx);
        }
      },
      React.createElement(
        "span",
        {
          style: {
            color: theme.fgMuted,
            whiteSpace: "pre",
            userSelect: "none"
          }
        },
        prefix,
        connector
      ),
      React.createElement(
        "span",
        {
          style: {
            color: node.error ? theme.error : canExpand ? theme.fg : theme.fgDim
          }
        },
        node.displayStr
      ),
      icon && React.createElement(
        "span",
        {
          style: {
            color: theme.accent2,
            marginLeft: 6,
            fontSize: 11
          }
        },
        icon
      )
    ),
    renderChildren()
  );
}

// ============================================================================
//  App 组件
// ============================================================================
function App() {
  const [items, setItems] = React.useState([]);
  const [nextItemId, setNextItemId] = React.useState(0);
  const [nextTreeIndex, setNextTreeIndex] = React.useState(0);

  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState(null);
  const [settings, setSettings] = React.useState({ defaultExpand: 2, additionalExpand: 1 });
  const [themeKey, setThemeKey] = React.useState("dark");
  const [focusIdx, setFocusIdx] = React.useState(-1);
  const [notationNames, setNotationNames] = React.useState(() => {
    const map = {};
    for (const [k, v] of Object.entries(NOTATION_REGISTRY)) {
      map[k] = v.name;
    }
    return map;
  });

  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const theme = THEMES[themeKey];

  const getTreeEntries = React.useCallback(() => {
    return items.filter(item => item.type === 'tree');
  }, [items]);

  const findTreeByIndex = React.useCallback((treeIndex) => {
    return items.find(item => item.type === 'tree' && item.treeIndex === treeIndex) || null;
  }, [items]);

  const collectNavItems = React.useCallback(() => {
    const nav = [];

    function walkNode(manager, nodeId, treeIndex) {
      const node = manager.getNode(nodeId);
      if (!node) return;

      const canExpand = manager.canExpandNode ? manager.canExpandNode(nodeId) : false;
      const hasMore = canExpand && node.children.length < 100;

      nav.push({
        type: "node",
        id: node.id,
        parentId: node.parentId,
        canExpand,
        hasMore,
        notationKey: manager.notationKey || '',
        error: !!node.error,
        treeIndex: treeIndex,
      });

      if (node.isExpanded) {
        const childrenList = node.children;
        const n = childrenList.length;

        if (hasMore) {
          nav.push({
            type: "more",
            parentId: node.id,
            treeIndex: treeIndex,
          });
        }
        for (let i = 0; i < n; i++) {
          const cid = childrenList[i];
          walkNode(manager, cid, treeIndex);
        }
      }
    }

    const treeEntries = getTreeEntries();
    for (const entry of treeEntries) {
      const root = entry.manager.getRoot();
      if (!root) continue;
      entry.manager.notationKey = entry.notationKey;
      walkNode(entry.manager, root.id, entry.treeIndex);
    }

    nav.push({ type: "input" });
    return nav;
  }, [getTreeEntries]);

  const navItems = collectNavItems();
  const clampedFocus = focusIdx >= 0 && focusIdx < navItems.length ? focusIdx : -1;
  const focusedItem = clampedFocus >= 0 ? navItems[clampedFocus] : null;

  const refreshUI = React.useCallback(() => {
    setItems(prev => [...prev]);
  }, []);

  const addLog = React.useCallback((message) => {
    setItems(prev => [...prev, {
      id: nextItemId,
      type: 'log',
      message: message,
    }]);
    setNextItemId(id => id + 1);
  }, [nextItemId]);

  const doExpand = React.useCallback((treeIndex, nodeId, count) => {
    let expanded = 0;
    const entry = findTreeByIndex(treeIndex);
    if (!entry) return 0;
    const mgr = entry.manager;
    const node = mgr.getNode(nodeId);
    if (!node) return 0;
    const target = node.expansionCount + count;
    while (node.expansionCount < target) {
      const result = mgr.expandNode(nodeId, {});
      if (!result.success) {
        addLog(`展开失败: ${result.message}`);
        break;
      }
      expanded++;
    }
    refreshUI();
    return expanded;
  }, [findTreeByIndex, addLog, refreshUI]);

  const onToggle = React.useCallback((treeIndex, id) => {
    const entry = findTreeByIndex(treeIndex);
    if (!entry) return;
    const mgr = entry.manager;
    const node = mgr.getNode(id);
    if (!node) return;
    if (!mgr.canExpandNode(id)) {
      addLog(`节点不可展开（预判失败）`);
      return;
    }
    if (!node.hasExpanded) {
      node.isExpanded = true;
      doExpand(treeIndex, id, 1);
    } else {
      const result = mgr.toggleNode(id);
      if (!result.success) {
        addLog(`切换失败: ${result.message}`);
      } else {
        refreshUI();
      }
    }
  }, [findTreeByIndex, refreshUI, addLog, doExpand]);

  const onMore = React.useCallback((treeIndex, id) => {
    const entry = findTreeByIndex(treeIndex);
    if (!entry) return;
    const mgr = entry.manager;
    const node = mgr.getNode(id);
    if (node && mgr.canExpandNode(id)) {
      doExpand(treeIndex, id, settings.additionalExpand);
    } else {
      addLog(`节点不可展开，无法加载更多`);
    }
  }, [findTreeByIndex, settings.additionalExpand, doExpand, addLog]);

  const handleSubmit = React.useCallback(async () => {
    const raw = input.trim();
    if (!raw) return;

    if (raw.startsWith("/")) {
      setInput("");
      setError(null);

      if (raw === "/help") {
        try {
          const resp = await fetch('help.txt');
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const text = await resp.text();
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed !== '') {
              addLog(`» ${trimmed}`);
            }
          }
        } catch (err) {
          addLog(`» 加载帮助文件失败: ${err.message}`);
        }
        return;
      }
      if (raw === "/clear") {
        setItems([]);
        setNextItemId(0);
        setNextTreeIndex(0);
        setFocusIdx(-1);
        return;
      }
      if (raw === "/list") {
        const avail = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
        addLog(`» 已注册记号: ${avail || '无'}`);
        return;
      }
      const setMatch = raw.match(/^\/set\s+(\w+)\s*=\s*(.+)$/i);
      if (setMatch) {
        const key = setMatch[1].toLowerCase();
        const valStr = setMatch[2].trim();
        const themeMap = {
          dark: "dark",
          light: "light",
          paper: "paper",
          solarizedlight: "solarizedLight",
          sollight: "solarizedLight",
          sl: "solarizedLight",
          solarizeddark: "solarizedDark",
          soldark: "solarizedDark",
          sd: "solarizedDark"
        };
        if (key === "theme") {
          const tk = themeMap[valStr.toLowerCase().replace(/[\s.]+/g, "")];
          if (tk) { setThemeKey(tk);
            addLog(`» Theme: ${THEMES[tk].name}`); } else setError(`Unknown theme.`);
        } else {
          const val = parseInt(valStr, 10);
          if (isNaN(val) || val < 1) { setError(`Invalid value: ${valStr}`); return; }
          if (key === "default_expand" || key === "default") {
            setSettings((s) => ({ ...s, defaultExpand: val }));
            addLog(`» default expand = ${val}`);
          } else if (key === "additional_expand" || key === "additional") {
            setSettings((s) => ({ ...s, additionalExpand: val }));
            addLog(`» additional expand = ${val}`);
          } else {
            setError(`Unknown setting: ${key}`);
          }
        }
        return;
      }
      setError(`未知命令: ${raw}`);
      return;
    }

    try {
      const { notationKey, rawName, inner } = parseInput(raw);
      loadNotation(notationKey).then((mod) => {
        let expr;
        let isPlaceholder = false;
        if (inner === 'LIMIT_PLACEHOLDER') {
          expr = null;
          isPlaceholder = true;
        } else {
          try {
            expr = mod.parse(inner);
          } catch (parseErr) {
            setError(`解析失败: ${parseErr.message || String(parseErr)}`);
            return;
          }
        }

        const adapter = createNotationAdapter(mod, notationKey);
        const manager = new TreeManager(adapter);
        if (isPlaceholder) {
          manager.initPlaceholder();
        } else {
          manager.init(expr);
        }

        const root = manager.getRoot();
        if (settings.defaultExpand > 0) {
          let expanded = 0;
          const target = settings.defaultExpand;
          while (expanded < target) {
            if (!manager.canExpandNode(root.id)) break;
            const result = manager.expandNode(root.id, {});
            if (!result.success) break;
            expanded++;
          }
        }

        const treeIndex = nextTreeIndex;
        setNextTreeIndex(idx => idx + 1);

        setItems(prev => [...prev, {
          id: nextItemId,
          type: 'tree',
          treeIndex: treeIndex,
          manager: manager,
          notationKey: notationKey,
          rootId: root.id,
        }]);
        setNextItemId(id => id + 1);

        setFocusIdx(-1);
        setError(null);
        setNotationNames(prev => ({ ...prev, [notationKey]: rawName }));
        setInput("");
      }).catch((err) => {
        setError(`加载记号失败: ${err.message || String(err)}`);
      });
    } catch (err) {
      setError(err.message);
    }
  }, [input, settings, addLog, nextItemId, nextTreeIndex]);

  const handleGlobalKey = React.useCallback((e) => {
    const nav = collectNavItems();
    const total = nav.length;
    const cur = clampedFocus;
    const item = cur >= 0 && cur < total ? nav[cur] : null;

    if (e.key === "Escape") {
      setFocusIdx(total - 1);
      inputRef.current?.focus();
      e.preventDefault();
      return;
    }
    if (document.activeElement === inputRef.current) {
      if (e.key === "ArrowUp" && total > 1) {
        setFocusIdx(total - 2);
        inputRef.current?.blur();
        containerRef.current?.focus();
        e.preventDefault();
      }
      return;
    }

    function getMgr(treeIndex) {
      const entry = findTreeByIndex(treeIndex);
      return entry ? entry.manager : null;
    }

    const goParent = () => {
      const pid = item?.parentId ?? (item?.type === "more" ? item.parentId : null);
      if (pid == null) return;
      const idx = nav.findIndex((n) => n.type === "node" && n.id === pid && n.treeIndex === item?.treeIndex);
      if (idx >= 0) setFocusIdx(idx);
    };

    const goSiblingFS = (n) => {
      const pid = item?.type === "node" ? item.parentId : item?.type === "more" ? item.parentId : null;
      if (pid == null) return false;
      const mgr = getMgr(item?.treeIndex);
      if (!mgr) return false;
      const parent = mgr.getNode(pid);
      if (!parent) return false;
      const children = parent.children;
      if (n >= 0 && n < children.length) {
        const targetId = children[n];
        const idx = nav.findIndex(ni => ni.type === "node" && ni.id === targetId && ni.treeIndex === item?.treeIndex);
        if (idx >= 0) { setFocusIdx(idx); return true; }
      }
      return false;
    };

    if (e.key === "ArrowDown" || e.key === "j") {
      const next = cur < 0 ? 0 : Math.min(cur + 1, total - 1);
      setFocusIdx(next);
      if (nav[next]?.type === "input") inputRef.current?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowUp" || e.key === "k") {
      const next = cur <= 0 ? 0 : cur - 1;
      setFocusIdx(next);
      if (nav[next]?.type === "input") inputRef.current?.focus();
      else inputRef.current?.blur();
      containerRef.current?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "l") {
      if (item?.type === "node" && item.canExpand) {
        const mgr = getMgr(item.treeIndex);
        if (mgr) {
          const node = mgr.getNode(item.id);
          if (node && !node.isExpanded) onToggle(item.treeIndex, item.id);
        }
      } else if (item?.type === "more") {
        onMore(item.treeIndex, item.parentId);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "h") {
      if (item?.type === "node" && item.canExpand) {
        const mgr = getMgr(item.treeIndex);
        if (mgr) {
          const node = mgr.getNode(item.id);
          if (node && node.isExpanded) onToggle(item.treeIndex, item.id);
          else goParent();
        }
      } else if (item?.type === "more" || (item?.type === "node" && !item.canExpand)) {
        goParent();
      }
      e.preventDefault();
    } else if (e.key === "," || e.key === "Backspace") {
      goParent();
      e.preventDefault();
    } else if (e.key === "Enter" || e.key === " ") {
      if (item?.type === "node" && item.canExpand) { onToggle(item.treeIndex, item.id);
        e.preventDefault(); } else if (item?.type === "more") { onMore(item.treeIndex, item.parentId);
        e.preventDefault(); }
    } else if (e.key === "+" || e.key === "=") {
      if (item?.type === "node" && item.hasMore) { onMore(item.treeIndex, item.id);
        e.preventDefault(); } else if (item?.type === "more") { onMore(item.treeIndex, item.parentId);
        e.preventDefault(); }
    } else if (/^[0-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10);
      if (goSiblingFS(n)) e.preventDefault();
    }
  }, [collectNavItems, clampedFocus, onToggle, onMore, findTreeByIndex]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  const renderItems = items.map((item) => {
    if (item.type === 'log') {
      return React.createElement("div", {
        key: `log-${item.id}`,
        style: { color: theme.logColor, minHeight: 22, display: "flex", alignItems: "baseline" }
      },
        React.createElement("span", null, item.message)
      );
    } else if (item.type === 'tree') {
      const root = item.manager.getRoot();
      if (!root) return null;
      const renderRoot = buildRenderNode(item.manager, root.id, item.notationKey, notationNames, item.treeIndex);
      if (!renderRoot) return null;

      return React.createElement("div", {
        key: `tree-wrapper-${item.id}`,
        style: { marginTop: 4 }
      },
        React.createElement("div", {
          style: { color: theme.fgMuted, fontSize: 11, marginBottom: 2 }
        },
          `--- 树 #${item.treeIndex+1} (${notationNames[item.notationKey] || item.notationKey}) ---`
        ),
        React.createElement(TreeNodeView, {
          key: `tree-${item.id}`,
          node: renderRoot,
          isLast: true,
          prefixes: [],
          theme,
          focusedItem,
          navItems,
          setFocusIdx,
          onToggle,
          onMore,
          notationNames,
          fsIndex: undefined,
        })
      );
    }
    return null;
  });

  const availableNotations = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(' ');

  return React.createElement(
    "div", {
      ref: containerRef,
      tabIndex: 0,
      onKeyDown: handleGlobalKey,
      style: {
        background: theme.bg,
        color: theme.fg,
        height: "100vh",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        outline: "none"
      }
    },
    React.createElement("link", { href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap", rel: "stylesheet" }),
    React.createElement("div", { style: {
        padding: "8px 16px",
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: theme.headerBg,
        flexWrap: "wrap",
        gap: 4,
        flexShrink: 0
      } },
      React.createElement("span", { style: { fontWeight: 700, fontSize: 14, color: theme.accent } }, "记号展开器 (CLI 风格)"),
      React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("span", { style: { fontSize: 10, color: theme.settingColor, marginRight: 4 } },
          "记号:"),
        React.createElement("span", { style: { fontSize: 11, color: theme.fgDim, fontWeight: 500 } },
          availableNotations || "无"),
        React.createElement("span", { style: { fontSize: 11, color: theme.settingColor, marginLeft: 8 } },
          "def=", settings.defaultExpand, " +", settings.additionalExpand
        ),
        Object.keys(THEMES).map((k) => React.createElement(
          "button", {
            key: k,
            onClick: () => setThemeKey(k),
            style: {
              background: k === themeKey ? theme.accent : "transparent",
              color: k === themeKey ? theme.bg : theme.fgDim,
              border: `1px solid ${k === themeKey ? theme.accent : theme.border}`,
              borderRadius: 3,
              padding: "2px 6px",
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit"
            }
          },
          THEMES[k].name
        ))
      )
    ),
    React.createElement(
      "div", {
        ref: scrollRef,
        className: "scroll-area",
        style: { flex: 1, overflow: "auto", padding: "8px 16px" },
        onClick: (e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus();
        }
      },
      renderItems,
      React.createElement("div", { style: {
          display: "flex",
          flexDirection: "column",
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${theme.border}`
        } },
        React.createElement("div", { style: {
            display: "flex",
            alignItems: "baseline",
            minHeight: 28,
            background: focusedItem?.type === "input" ? theme.highlight : "transparent",
            margin: "0 -4px",
            padding: "0 4px",
            borderRadius: 2
          } },
          React.createElement("span", { style: { color: theme.accent, userSelect: "none", marginRight: 4 } },
            "▸"),
          React.createElement(
            "input", {
              ref: inputRef,
              value: input,
              onChange: (e) => {
                setInput(e.target.value);
                setError(null);
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                  e.stopPropagation();
                }
              },
              onFocus: () => setFocusIdx(navItems.length - 1),
              placeholder: `输入 记号名(表达式)，如 PrSS(0,1,2) 或直接输入 BMS 创建占位极限  (可用: ${availableNotations})`,
              autoFocus: true,
              style: {
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: theme.fg,
                fontFamily: "inherit",
                fontSize: 13,
                caretColor: theme.accent
              }
            }
          )
        ),
        error && React.createElement("div", { style: { color: theme.error, fontSize: 12, marginTop: 2,
            paddingLeft: 18 } }, error)
      )
    ),
    React.createElement("div", { style: {
        padding: "6px 16px",
        borderTop: `1px solid ${theme.border}`,
        fontSize: 11,
        color: theme.settingColor,
        display: "flex",
        flexWrap: "wrap",
        gap: "0 12px",
        flexShrink: 0
      } },
      "↑↓导航 · ←→折叠 · , 父节点 · 0-9 FS[n] · += 更多 · Esc 输入框 · /help",
      React.createElement("span", { style: { color: theme.fgMuted } }, " | 可用记号: ", availableNotations)
    )
  );
}

// ============================================================================
//  渲染
// ============================================================================
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));