// client/src/templates/bindings.ts
// Tiny binding engine for scalar {{...}} and collection specs like: findings|severity>=3|sort=-severity,createdAt|limit=10

export type BindingContext = {
  run?: Record<string, unknown>;     // project/client/site/date/etc.
  draft?: Record<string, unknown>;
  findings?: Record<string, unknown>[];
  item?: Record<string, unknown>;    // current repeater item
};

const EXPR = /\{\{\s*([^}]+)\s*\}\}/g;

type SortKey = { key: string; dir: 1 | -1 };

export function renderString(input: string, ctx: BindingContext): string {
  if (!input || typeof input !== "string") return input as any;
  return input.replace(EXPR, (_, raw) => {
    try {
      const val = evalExpr(String(raw).trim(), ctx);
      return val == null ? "" : String(val);
    } catch {
      return "";
    }
  });
}

export function evalExpr(expr: string, ctx: BindingContext): unknown {
  // helpers: count(), first(), exists()
  if (expr.startsWith("count(") && expr.endsWith(")")) {
    const spec = expr.slice(6, -1);
    return select(spec, ctx).length;
  }
  if (expr.startsWith("first(") && expr.endsWith(")")) {
    const spec = expr.slice(6, -1);
    return select(spec, ctx)[0] ?? null;
  }
  if (expr.startsWith("exists(") && expr.endsWith(")")) {
    const spec = expr.slice(7, -1);
    return select(spec, ctx).length > 0;
  }
  // path lookup e.g. run.projectName or item.title
  return getPath(expr, ctx);
}

export function select(spec: string, ctx: BindingContext): any[] {
  // spec: <name>|<filter>|sort=-a,b|limit=10
  const parts = spec.split("|").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return [];
  const name = parts.shift()!;
  let rows: any[] = resolveCollection(name, ctx);
  if (!Array.isArray(rows)) rows = [];

  let sortKeys: SortKey[] = [];
  let limit: number | null = null;

  for (const p of parts) {
    if (p.startsWith("sort=")) {
      sortKeys = p
        .slice(5)
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => (k.startsWith("-") ? { key: k.slice(1), dir: -1 as const } : { key: k, dir: 1 as const }));
      continue;
    }
    if (p.startsWith("limit=")) {
      const n = Number(p.slice(6));
      limit = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
      continue;
    }
    // filter token: field op value  (supports =,!=,>=,<=,>,<)
    const m = p.match(/^([^!<>=]+)\s*(>=|<=|!=|=|>|<)\s*(.+)$/);
    if (m) {
      const [, fld, op, rawVal] = m;
      const value = coerce(rawVal);
      rows = rows.filter((row) => compare(get(row, fld.trim()), op as any, value));
    }
  }

  if (sortKeys.length) {
    rows = [...rows].sort((a, b) => {
      for (const s of sortKeys) {
        const av = get(a, s.key);
        const bv = get(b, s.key);
        const base =
          av == null && bv == null
            ? 0
            : av == null
            ? 1
            : bv == null
            ? -1
            : typeof av === "string" && typeof bv === "string"
            ? av.localeCompare(bv)
            : av > bv
            ? 1
            : av < bv
            ? -1
            : 0;
        if (base !== 0) return base * s.dir;
      }
      return 0;
    });
  }

  if (limit != null) rows = rows.slice(0, limit);
  return rows;
}

// ---------- helpers ----------

function resolveCollection(name: string, ctx: BindingContext): any[] {
  if (name === "findings") return (ctx.findings as any[]) ?? [];
  if (name === "media" || name === "photos") {
    const media = (ctx.draft as any)?.media;
    return Array.isArray(media) ? media : [];
  }
  // allow "item.<arrayField>"
  const maybe = get(ctx.item ?? {}, name);
  return Array.isArray(maybe) ? maybe : [];
}

function getPath(path: string, ctx: BindingContext): unknown {
  // allow raw literals
  if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);

  // dot paths with roots: run., draft., item., findings
  const [root, ...rest] = path.split(".");
  let base: any;
  if (root === "run") base = ctx.run ?? {};
  else if (root === "draft") base = ctx.draft ?? {};
  else if (root === "item") base = ctx.item ?? {};
  else if (root === "findings") base = ctx.findings ?? [];
  else base = (ctx as any)[root];
  return get(base, rest.join("."));
}

function get(obj: any, path: string): any {
  if (!path) return obj;
  return path.split(".").reduce((acc: any, k: string) => (acc == null ? undefined : acc[k]), obj);
}

function compare(a: any, op: "=" | "!=" | ">" | "<" | ">=" | "<=", b: any): boolean {
  switch (op) {
    case "=": return a === b;
    case "!=": return a !== b;
    case ">": return a > b;
    case "<": return a < b;
    case ">=": return a >= b;
    case "<=": return a <= b;
  }
}

function coerce(v: string): any {
  const s = v.trim().replace(/^['"]|['"]$/g, "");
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.toLowerCase() === "true") return true;
  if (s.toLowerCase() === "false") return false;
  return s;
}
