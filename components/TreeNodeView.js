﻿// ============================================================================
//  获取全局 React
// ============================================================================
const React = window.React;

// ============================================================================
//  导入依赖
// ============================================================================
import { GUTTER, BRANCH, LAST_B, EMPTY } from '../themes.js';
import { notationCache, createNotationAdapter } from '../notationCore.js';

// ============================================================================
//  buildRenderNode：将树节点数据转换为渲染所需的结构
// ============================================================================
export function buildRenderNode(manager, nodeId, notationKey, notationNames, treeIndex) {
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

// ============================================================================
//  TreeNodeView 组件
// ============================================================================
export function TreeNodeView({
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
        // 修改点：不可展开节点也显示为 theme.fg（白色/主色），不再使用 theme.fgDim
        { style: { color: node.error ? theme.error : theme.fg, whiteSpace: 'pre-wrap' } },
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