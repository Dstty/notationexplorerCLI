// ============================================================================
//  导入树管理核心
// ============================================================================
import { TreeManager } from './treeManager.js';

// ============================================================================
//  导入主题、符号常量、记号核心、解析器
// ============================================================================
import { THEMES, GUTTER, BRANCH, LAST_B, EMPTY } from './themes.js';
import {
  NOTATION_REGISTRY,
  notationCache,
  loadNotation,
  createNotationAdapter,
} from './notationCore.js';
import { parseNotation, parseCommand } from './parser/index.js';

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

  const rawMod = notationCache.get(notationKey);
  const mod = rawMod ? createNotationAdapter(rawMod, notationKey) : null;

  if (node.type === 'LIMIT' && notationKey === 'help') {
    displayStr = '📖 帮助文档';
  } else if (node.data === null && node.type === 'LIMIT') {
    displayStr = `Limit ${notName}`;
  } else if (node.error) {
    displayStr = `Error: ${node.error}`;
  } else if (node.type === 'LIMIT') {
    try {
      if (mod && typeof mod.display === 'function') {
        const inner = mod.display(node.data, false);
        displayStr = `${notName} ${inner}`;
      } else {
        displayStr = `${notName} ...`;
      }
    } catch {
      displayStr = `${notName} ...`;
    }
  } else {
    try {
      if (mod && typeof mod.display === 'function') {
        displayStr = mod.display(node.data, true);
      } else {
        displayStr = String(node.data);
      }
    } catch {
      displayStr = String(node.data);
    }
  }

  let nativeDisplay = null;
  if (!node.error && mod && typeof mod.toNative === 'function' && node.data !== null) {
    try {
      const result = mod.toNative(node.data);
      if (result !== null && result !== undefined) {
        nativeDisplay = String(result);
      }
    } catch {
      // ignore
    }
  }

  const canActuallyExpand = manager.canExpandNode ? manager.canExpandNode(nodeId) : false;

  return {
    id: node.id,
    type: node.type,
    data: node.data,
    displayStr,
    nativeDisplay,
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
    note: node.note || null,
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
  editingNote,
  startNoteEditing,
  saveNote,
  cancelNoteEditing,
}) {
  const ref = React.useRef(null);
  const moreRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const cancelRef = React.useRef(false);

  const canExpand = !node.error && node.canActuallyExpand;
  const hasMore = canExpand && (node.children.length < 100);
  const isFocused = focusedItem?.type === "node" && focusedItem.id === node.id && focusedItem.treeIndex === node.treeIndex;
  const isMoreFocused = focusedItem?.type === "more" && focusedItem.parentId === node.id && focusedItem.treeIndex === node.treeIndex;

  const isHelp = node.notationKey === 'help';
  const hasExpanded = node.hasExpanded;

  const isEditing = editingNote && editingNote.treeIndex === node.treeIndex && editingNote.nodeId === node.id;
  const noteText = node.note || '';

  React.useEffect(() => {
    if (isFocused && ref.current) ref.current.scrollIntoView({ block: "nearest" });
  }, [isFocused]);
  React.useEffect(() => {
    if (isMoreFocused && moreRef.current) moreRef.current.scrollIntoView({ block: "nearest" });
  }, [isMoreFocused]);
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const connector = fsIndex !== undefined ? (isLast ? LAST_B : BRANCH) : "▸ ";
  const prefix = prefixes.join("");

  let icon = null;
  if (hasExpanded) {
    icon = node.isExpanded ? "[-]" : "[+]";
  } else if (canExpand) {
    icon = "[+]";
  }

  const setFocusToNode = () => {
    const idx = navItems.findIndex((n) => n.type === "node" && n.id === node.id && n.treeIndex === node.treeIndex);
    if (idx >= 0) setFocusIdx(idx);
  };

  const handleTextClick = () => {
    setFocusToNode();
    if (hasExpanded) {
      if (node.isExpanded) {
        if (hasMore) {
          onMore(node.treeIndex, node.id);
        }
      } else {
        onToggle(node.treeIndex, node.id);
      }
      return;
    }
    if (canExpand) {
      onToggle(node.treeIndex, node.id);
    }
  };

  const handleIconClick = (e) => {
    e.stopPropagation();
    setFocusToNode();
    if (hasExpanded || canExpand) {
      onToggle(node.treeIndex, node.id);
    }
  };

  const handleNoteButtonClick = (e) => {
    e.stopPropagation();
    setFocusToNode();
    if (isHelp) return;
    if (!isEditing) {
      startNoteEditing(node.treeIndex, node.id);
    }
  };

  const renderChildren = () => {
    if (!node.isExpanded) return null;
    const childrenList = isHelp ? [...node.children].reverse() : node.children;
    const n = childrenList.length;
    const elements = [];

    const renderMore = () => {
      const morePrefixes = (fsIndex !== undefined) ?
        [...prefixes, isLast ? EMPTY : GUTTER] :
        [...prefixes, GUTTER];
      const moreConn = (n > 0) ? BRANCH : LAST_B;
      return React.createElement(
        "div", {
          ref: moreRef,
          key: "__more__",
          style: {
            display: "flex",
            alignItems: "baseline",
            minHeight: 26,
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
          { style: { color: theme.fgMuted, whiteSpace: "pre", userSelect: "none" } },
          morePrefixes.join(""),
          moreConn
        ),
        React.createElement(
          "span",
          { style: { color: theme.moreColor, fontStyle: "italic", fontSize: 14 } },
          "… (点击或按 Enter)"
        )
      );
    };

    if (hasMore && !isHelp) elements.push(renderMore());
    for (let i = 0; i < n; i++) {
      const child = childrenList[i];
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
          editingNote,
          startNoteEditing,
          saveNote,
          cancelNoteEditing,
        })
      );
    }
    if (hasMore && isHelp) elements.push(renderMore());
    return elements;
  };

  // ---- 注释显示 / 编辑 ----
  let noteElement = null;
  if (isEditing) {
    noteElement = React.createElement(
      "input", {
        ref: inputRef,
        type: "text",
        defaultValue: noteText,
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            cancelRef.current = false;
            saveNote(node.treeIndex, node.id, e.target.value);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancelRef.current = true;
            cancelNoteEditing();
          }
        },
        onBlur: (e) => {
          if (cancelRef.current) {
            cancelRef.current = false;
            return;
          }
          saveNote(node.treeIndex, node.id, e.target.value);
        },
        style: {
          background: "transparent",
          border: "none",
          outline: "none",
          color: theme.noteColor,
          fontFamily: "inherit",
          fontSize: "1em",
          marginLeft: 8,
          padding: 0,
          width: "240px",
        },
        placeholder: "注释…",
        onClick: (e) => e.stopPropagation(),
      }
    );
  } else if (noteText) {
    noteElement = React.createElement(
      "span",
      {
        style: {
          color: theme.noteColor,
          marginLeft: 6,
          fontSize: "1em",
          cursor: "pointer",
        },
        onClick: (e) => {
          e.stopPropagation();
          handleNoteButtonClick(e);
        }
      },
      noteText
    );
  }

  const noteButton = !isHelp && !isEditing ? React.createElement(
    "span", {
      style: {
        color: theme.accent2,
        marginLeft: 4,
        fontSize: 13,
        cursor: "pointer",
        userSelect: "none",
      },
      onClick: handleNoteButtonClick,
    },
    "[✎]"
  ) : null;

  return React.createElement("div", null,
    React.createElement(
      "div", {
        ref,
        style: {
          display: "flex",
          alignItems: "baseline",
          minHeight: 26,
          cursor: (hasExpanded || canExpand) ? "pointer" : "pointer",
          background: isFocused ? theme.highlight : "transparent",
          borderRadius: 2,
          margin: "0 -4px",
          padding: "0 4px"
        },
        onClick: handleTextClick
      },
      React.createElement(
        "span",
        { style: { color: theme.fgMuted, whiteSpace: "pre", userSelect: "none" } },
        prefix,
        connector
      ),
      React.createElement(
        "span",
        { style: { color: node.error ? theme.error : (hasExpanded || canExpand) ? theme.fg : theme.fgDim, whiteSpace: 'pre-wrap' } },
        node.displayStr
      ),
      node.nativeDisplay && React.createElement(
        "span",
        { style: { color: theme.fgMuted, marginLeft: 8, fontSize: '0.9em', fontStyle: 'italic', whiteSpace: 'pre-wrap' } },
        ` → ${node.nativeDisplay}`
      ),
      icon && React.createElement(
        "span",
        {
          style: { color: theme.accent2, marginLeft: 6, fontSize: 13, cursor: "pointer" },
          onClick: handleIconClick
        },
        icon
      ),
      noteButton,
      noteElement
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
  const [editingNote, setEditingNote] = React.useState(null);

  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const theme = THEMES[themeKey];

  const addOutput = React.useCallback((message, type = 'info') => {
    setItems(prev => [...prev, {
      id: nextItemId,
      type: 'output',
      message: message,
      outputType: type,
    }]);
    setNextItemId(id => id + 1);
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 0);
    }
  }, [nextItemId]);

  const getTreeEntries = React.useCallback(() => {
    return items.filter(item => item.type === 'tree');
  }, [items]);

  // ===== 关键定义：findTreeByIndex =====
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
      const isHelp = manager.notationKey === 'help';
      nav.push({
        type: "node",
        id: node.id,
        parentId: node.parentId,
        canExpand,
        hasMore,
        notationKey: manager.notationKey || '',
        error: !!node.error,
        treeIndex: treeIndex,
        hasExpanded: node.hasExpanded,
        note: node.note || null,
      });
      if (node.isExpanded) {
        const childrenList = isHelp ? [...node.children].reverse() : node.children;
        const n = childrenList.length;
        if (hasMore && !isHelp) nav.push({ type: "more", parentId: node.id, treeIndex });
        for (let i = 0; i < n; i++) walkNode(manager, childrenList[i], treeIndex);
        if (hasMore && isHelp) nav.push({ type: "more", parentId: node.id, treeIndex });
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

  const startNoteEditing = React.useCallback((treeIndex, nodeId) => {
    setEditingNote({ treeIndex, nodeId });
  }, []);

  const saveNote = React.useCallback((treeIndex, nodeId, text) => {
    if (!editingNote || editingNote.treeIndex !== treeIndex || editingNote.nodeId !== nodeId) {
      return;
    }
    const entry = findTreeByIndex(treeIndex);
    if (!entry) return;
    const mgr = entry.manager;
    const node = mgr.getNode(nodeId);
    if (!node) return;
    const trimmed = text.trim();
    if (trimmed === '') {
      delete node.note;
    } else {
      node.note = trimmed;
    }
    setEditingNote(null);
    refreshUI();
    containerRef.current?.focus();
  }, [editingNote, findTreeByIndex, refreshUI]);

  const cancelNoteEditing = React.useCallback(() => {
    setEditingNote(null);
    containerRef.current?.focus();
  }, []);

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
        addOutput(`展开失败: ${result.message}`, 'error');
        break;
      }
      expanded++;
    }
    refreshUI();
    return expanded;
  }, [findTreeByIndex, addOutput, refreshUI]);

  const onToggle = React.useCallback((treeIndex, id) => {
    const entry = findTreeByIndex(treeIndex);
    if (!entry) return;
    const mgr = entry.manager;
    const node = mgr.getNode(id);
    if (!node) return;
    if (!node.hasExpanded && !mgr.canExpandNode(id)) {
      addOutput(`节点不可展开`, 'error');
      return;
    }
    if (!node.hasExpanded) {
      node.isExpanded = true;
      doExpand(treeIndex, id, 1);
    } else {
      const result = mgr.toggleNode(id);
      if (!result.success) {
        addOutput(`切换失败: ${result.message}`, 'error');
      } else {
        refreshUI();
      }
    }
  }, [findTreeByIndex, refreshUI, addOutput, doExpand]);

  // ========================================================================
  //  修正后的 onMore：仅 help 树更多按钮展开后保持焦点，完全展开后聚焦到最后一个子节点
  // ========================================================================
  const onMore = React.useCallback((treeIndex, id) => {
    const entry = findTreeByIndex(treeIndex);
    if (!entry) return;
    const mgr = entry.manager;
    const node = mgr.getNode(id);
    if (node && mgr.canExpandNode(id)) {
      const expanded = doExpand(treeIndex, id, settings.additionalExpand);
      // 只有 help 树且成功展开时，才处理焦点
      if (expanded > 0 && entry.notationKey === 'help') {
        setTimeout(() => {
          const nav = collectNavItems();
          // 1. 尝试找到“更多”按钮（可能还存在）
          const moreIdx = nav.findIndex(n => n.type === "more" && n.parentId === id && n.treeIndex === treeIndex);
          if (moreIdx !== -1) {
            setFocusIdx(moreIdx);
          } else {
            // 2. “更多”按钮消失（已完全展开），聚焦到该父节点的最后一个子节点
            const childNodes = nav.filter(n => n.type === "node" && n.parentId === id && n.treeIndex === treeIndex);
            if (childNodes.length > 0) {
              const lastChild = childNodes[childNodes.length - 1];
              const idx = nav.indexOf(lastChild);
              if (idx !== -1) setFocusIdx(idx);
            } else {
              // 3. 极端情况：无子节点，回退到父节点
              const parentIdx = nav.findIndex(n => n.type === "node" && n.id === id && n.treeIndex === treeIndex);
              if (parentIdx !== -1) setFocusIdx(parentIdx);
            }
          }
        }, 0);
      }
    } else {
      addOutput(`节点不可展开，无法加载更多`, 'error');
    }
  }, [findTreeByIndex, settings.additionalExpand, doExpand, addOutput, collectNavItems, setFocusIdx]);

  // ========================================================================
  //  /save 处理函数（禁止保存 help 树）
  // ========================================================================
  const handleSaveCommand = React.useCallback((parsedNum) => {
    const treeEntries = getTreeEntries();
    if (treeEntries.length === 0) {
      addOutput('没有可保存的树', 'error');
      return;
    }

    let targetEntry = null;
    if (parsedNum !== undefined) {
      const idx = parsedNum - 1;
      targetEntry = treeEntries.find(entry => entry.treeIndex === idx);
      if (!targetEntry) {
        addOutput(`找不到第 ${parsedNum} 棵树`, 'error');
        return;
      }
    } else {
      const maxIdx = Math.max(...treeEntries.map(e => e.treeIndex));
      targetEntry = treeEntries.find(e => e.treeIndex === maxIdx);
    }

    if (targetEntry.notationKey === 'help') {
      addOutput('无法保存帮助树（help）', 'error');
      return;
    }

    const manager = targetEntry.manager;
    const notationKey = targetEntry.notationKey;
    const root = manager.getRoot();
    if (!root) {
      addOutput('树根节点不存在', 'error');
      return;
    }

    const rawMod = notationCache.get(notationKey);
    const mod = rawMod ? createNotationAdapter(rawMod, notationKey) : null;
    const notName = notationNames[notationKey] || notationKey;

    const allNodes = [];
    function collect(nodeId) {
      const node = manager.getNode(nodeId);
      if (!node) return;
      allNodes.push(node);
      for (const childId of node.children) {
        collect(childId);
      }
    }
    collect(root.id);

    if (allNodes.length === 0) {
      addOutput('该树没有任何节点', 'error');
      return;
    }

    const reversed = allNodes.reverse();

    function getNodeDisplay(node) {
      if (node.error) {
        return `Error: ${node.error}`;
      }
      if (node.type === 'LIMIT') {
        if (notationKey === 'help') {
          return '📖 帮助文档';
        }
        if (node.data === null) {
          return `Limit ${notName}`;
        }
        try {
          if (mod && typeof mod.display === 'function') {
            const inner = mod.display(node.data, false);
            return `${notName} ${inner}`;
          } else {
            return `${notName} ...`;
          }
        } catch {
          return `${notName} ...`;
        }
      } else {
        try {
          if (mod && typeof mod.display === 'function') {
            return mod.display(node.data, true);
          } else {
            return String(node.data);
          }
        } catch {
          return String(node.data);
        }
      }
    }

    function escapeCSV(str) {
      if (str === undefined || str === null) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    const rows = reversed.map(node => {
      const displayStr = getNodeDisplay(node);
      const noteStr = node.note || '';
      return [escapeCSV(displayStr), escapeCSV(noteStr)];
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `${notName}_${timestamp}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addOutput(`✅ 已保存树 #${targetEntry.treeIndex + 1} 为 ${filename} (${reversed.length} 个节点)`, 'info');
  }, [getTreeEntries, addOutput, notationNames, notationCache, createNotationAdapter]);

  // ==========================================================================
  //  原有 handleSubmit
  // ==========================================================================
  const handleSubmit = React.useCallback(async () => {
    const raw = input.trim();
    if (!raw) return;
    setInput("");
    addOutput(`▸ ${raw}`, 'input');

    if (raw.startsWith("/")) {
      const parsed = parseCommand(raw);
      switch (parsed.command) {
        case 'help': {
          try {
            const resp = await fetch('help.txt');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const text = await resp.text();
            const lines = text.split(/\r?\n/);
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed !== '') addOutput(`» ${trimmed}`, 'info');
            }
          } catch (err) {
            addOutput(`» 加载帮助文件失败: ${err.message}`, 'error');
          }
          return;
        }
        case 'clear': {
          setItems([]);
          setNextItemId(0);
          setNextTreeIndex(0);
          setFocusIdx(-1);
          return;
        }
        case 'list': {
          const avail = Object.keys(NOTATION_REGISTRY).map(k => NOTATION_REGISTRY[k].name).join(', ');
          addOutput(`» 已注册记号: ${avail || '无'}`, 'info');
          return;
        }
        case 'set': {
          const key = parsed.key;
          const valStr = parsed.value;
          if (key === 'theme') {
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
            const tk = themeMap[valStr.toLowerCase().replace(/[\s.]+/g, "")];
            if (tk) {
              setThemeKey(tk);
              addOutput(`» Theme: ${THEMES[tk].name}`, 'info');
            } else {
              addOutput(`未知主题: ${valStr}`, 'error');
            }
          } else {
            const val = parseInt(valStr, 10);
            if (isNaN(val) || val < 1) {
              addOutput(`无效数值: ${valStr}`, 'error');
              return;
            }
            if (key === 'default_expand' || key === 'default') {
              setSettings((s) => ({ ...s, defaultExpand: val }));
              addOutput(`» default expand = ${val}`, 'info');
            } else if (key === 'additional_expand' || key === 'additional') {
              setSettings((s) => ({ ...s, additionalExpand: val }));
              addOutput(`» additional expand = ${val}`, 'info');
            } else {
              addOutput(`未知设置: ${key}`, 'error');
            }
          }
          return;
        }
        case 'save': {
          handleSaveCommand(parsed.num);
          return;
        }
        default: {
          addOutput(`未知命令: ${raw}`, 'error');
          return;
        }
      }
    }

    try {
      const parsed = parseNotation(raw);
      const { notationKey, rawName, inner, fromOrdinal } = parsed;
      if (fromOrdinal) {
        addOutput(`» ${raw} → PrSS ${inner}`, 'conversion');
      }
      const mod = await loadNotation(notationKey);
      let expr;
      let isPlaceholder = false;
      if (inner === 'LIMIT_PLACEHOLDER') {
        expr = null;
        isPlaceholder = true;
      } else {
        try {
          expr = mod.parse(inner);
        } catch (parseErr) {
          addOutput(`解析失败: ${parseErr.message || String(parseErr)}`, 'error');
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
      setNotationNames(prev => ({ ...prev, [notationKey]: rawName }));
    } catch (err) {
      addOutput(`错误: ${err.message}`, 'error');
    }
  }, [input, settings, addOutput, nextItemId, nextTreeIndex, handleSaveCommand]);

  // ===== 键盘事件（增加 help 树注释拦截） =====
  const handleGlobalKey = React.useCallback((e) => {
    if (editingNote) {
      const isUp = e.key === "ArrowUp";
      const isDown = e.key === "ArrowDown";
      if (isUp || isDown) {
        e.preventDefault();
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT') {
          const text = active.value;
          const { treeIndex, nodeId } = editingNote;
          saveNote(treeIndex, nodeId, text);
        } else {
          cancelNoteEditing();
        }
        const nav = collectNavItems();
        const total = nav.length;
        const cur = focusIdx;
        const validCur = (cur >= 0 && cur < total) ? cur : (total > 0 ? total - 1 : -1);
        let next;
        if (isUp) {
          next = validCur > 0 ? validCur - 1 : 0;
        } else {
          next = validCur < total - 1 ? validCur + 1 : total - 1;
        }
        setFocusIdx(next);
        if (nav[next]?.type === "input") {
          inputRef.current?.focus();
        } else {
          containerRef.current?.focus();
        }
      }
      return;
    }

    const nav = collectNavItems();
    const total = nav.length;
    const cur = focusIdx >= 0 && focusIdx < total ? focusIdx : -1;
    const item = cur >= 0 ? nav[cur] : null;

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

    // help 树禁止注释快捷键
    if (e.key === "n" || e.key === "N") {
      if (item?.type === "node") {
        if (item.notationKey === 'help') {
          addOutput('帮助树无法添加注释', 'error');
          e.preventDefault();
          return;
        }
        startNoteEditing(item.treeIndex, item.id);
        e.preventDefault();
        return;
      }
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
      const isHelp = mgr.notationKey === 'help';
      const childrenList = isHelp ? [...parent.children].reverse() : parent.children;
      if (n >= 0 && n < childrenList.length) {
        const targetId = childrenList[n];
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
      if (item?.type === "node" && item.canExpand) {
        onToggle(item.treeIndex, item.id);
        e.preventDefault();
      } else if (item?.type === "more") {
        onMore(item.treeIndex, item.parentId);
        e.preventDefault();
      }
    } else if (e.key === "+" || e.key === "=") {
      if (item?.type === "node" && item.hasMore) {
        onMore(item.treeIndex, item.id);
        e.preventDefault();
      } else if (item?.type === "more") {
        onMore(item.treeIndex, item.parentId);
        e.preventDefault();
      }
    } else if (/^[0-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10);
      if (goSiblingFS(n)) e.preventDefault();
    }
  }, [collectNavItems, focusIdx, onToggle, onMore, findTreeByIndex, startNoteEditing, editingNote, saveNote, cancelNoteEditing, addOutput]);

  const renderItems = items.map((item) => {
    if (item.type === 'output') {
      let color = theme.logColor;
      if (item.outputType === 'error') color = theme.error;
      else if (item.outputType === 'conversion') color = theme.accent;
      else if (item.outputType === 'input') color = theme.fg;
      return React.createElement("div", {
        key: `output-${item.id}`,
        style: { color, minHeight: 26, display: "flex", alignItems: "baseline" }
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
          style: { color: theme.fgMuted, fontSize: 13, marginBottom: 2 }
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
          editingNote,
          startNoteEditing,
          saveNote,
          cancelNoteEditing,
        })
      );
    }
    return null;
  });

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
        fontSize: 16,
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
      React.createElement("span", { style: { fontWeight: 700, fontSize: 18, color: theme.accent } }, "记号展开器 (CLI 风格)"),
      React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("span", { style: { fontSize: 12, color: theme.settingColor } },
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
              padding: "2px 8px",
              fontSize: 12,
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
      React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
        React.createElement("div", { style: {
            display: "flex",
            alignItems: "baseline",
            minHeight: 32,
            background: focusedItem?.type === "input" ? theme.highlight : "transparent",
            margin: "0 -4px",
            padding: "0 4px",
            borderRadius: 2
          } },
          React.createElement("span", { style: { color: theme.accent, userSelect: "none", marginRight: 6, fontSize: 18 } },
            "▸"),
          React.createElement(
            "input", {
              ref: inputRef,
              value: input,
              onChange: (e) => setInput(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                  e.stopPropagation();
                }
              },
              onFocus: () => setFocusIdx(navItems.length - 1),
              placeholder: `输入 记号名 表达式，如 PrSS 0,1,2 或直接输入记号名`,
              autoFocus: true,
              style: {
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: theme.fg,
                fontFamily: "inherit",
                fontSize: 16,
                caretColor: theme.accent
              }
            }
          )
        )
      )
    ),
    React.createElement("div", { style: {
        padding: "6px 16px",
        borderTop: `1px solid ${theme.border}`,
        fontSize: 13,
        color: theme.settingColor,
        display: "flex",
        flexWrap: "wrap",
        gap: "0 12px",
        flexShrink: 0
      } },
      "↑↓导航 · ←→折叠 · , 父节点 · 0-9 FS[n] · += 更多 · n 注释 · Esc 取消 · Enter 保存"
    )
  );
}

// ============================================================================
//  渲染
// ============================================================================
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));