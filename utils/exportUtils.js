// ============================================================================
//  导入所需依赖（不需要 React）
// ============================================================================
import { notationCache, createNotationAdapter } from '../notationCore.js';

// ============================================================================
//  导出树为 CSV 并触发下载
// ============================================================================
export function downloadTreeAsCSV(manager, notationKey, notationNames, addOutput) {
  const rawMod = notationCache.get(notationKey);
  const mod = rawMod ? createNotationAdapter(rawMod, notationKey) : null;
  const notName = notationNames[notationKey] || notationKey;

  const root = manager.getRoot();
  if (!root) {
    addOutput('树根节点不存在', 'error');
    return;
  }

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

  addOutput(`✅ 已保存树 #${manager.treeIndex + 1} 为 ${filename} (${reversed.length} 个节点)`, 'info');
}