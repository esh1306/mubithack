// Minimal CSV line parser: handles quoted fields with commas and "" escapes.
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): Record<string, string>[] {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const keys = parseCsvLine(header);
  return rows.filter(Boolean).map((r) => Object.fromEntries(parseCsvLine(r).map((v, i) => [keys[i], v])));
}
