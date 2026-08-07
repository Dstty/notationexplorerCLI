// ============================================================================
//  命令解析器
// ============================================================================
export function parseCommand(input) {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { command: 'unknown', raw: trimmed };
  }

  const parts = trimmed.slice(1).trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  // 无参数命令（/clear、/list）
  if (cmd === 'clear' || cmd === 'list') {
    return { command: cmd };
  }

  // /set key=value 或 /set key value
  if (cmd === 'set') {
    const rest = parts.slice(1).join(' ');
    const eqMatch = rest.match(/^(\w+)\s*=\s*(.+)$/);
    if (eqMatch) {
      return { command: 'set', key: eqMatch[1].toLowerCase(), value: eqMatch[2].trim() };
    }
    const spaceMatch = rest.match(/^(\w+)\s+(.+)$/);
    if (spaceMatch) {
      return { command: 'set', key: spaceMatch[1].toLowerCase(), value: spaceMatch[2].trim() };
    }
    return { command: 'set', key: rest.toLowerCase(), value: '' };
  }

  // 未知命令
  return { command: 'unknown', raw: trimmed };
}