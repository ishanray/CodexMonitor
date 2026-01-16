export type FileLinkTarget = {
  path: string;
  line?: number | null;
  column?: number | null;
};

const FILE_LINK_PROTOCOL = "codex-file:";
const FILE_LINK_HOST = "open";

export function buildFileLinkUrl(target: FileLinkTarget) {
  const params = new URLSearchParams({ path: target.path });
  if (target.line) {
    params.set("line", String(target.line));
  }
  if (target.column) {
    params.set("column", String(target.column));
  }
  return `${FILE_LINK_PROTOCOL}//${FILE_LINK_HOST}?${params.toString()}`;
}

export function parseFileLinkUrl(href: string): FileLinkTarget | null {
  try {
    const url = new URL(href);
    if (url.protocol !== FILE_LINK_PROTOCOL || url.host !== FILE_LINK_HOST) {
      return null;
    }
    const path = url.searchParams.get("path");
    if (!path) {
      return null;
    }
    const lineRaw = url.searchParams.get("line");
    const columnRaw = url.searchParams.get("column");
    const line = lineRaw ? Number(lineRaw) : null;
    const column = columnRaw ? Number(columnRaw) : null;
    return {
      path,
      line: Number.isFinite(line) ? line : null,
      column: Number.isFinite(column) ? column : null,
    };
  } catch {
    return null;
  }
}

export function splitFilePathMatch(raw: string): FileLinkTarget {
  const hashMatch = raw.match(/^(.*)#L(\d+)(?::(\d+))?$/);
  if (hashMatch) {
    return {
      path: hashMatch[1],
      line: Number(hashMatch[2]),
      column: hashMatch[3] ? Number(hashMatch[3]) : null,
    };
  }

  const colonMatch = raw.match(/^(.*?)(?::(\d+))(?:[:](\d+))?$/);
  if (colonMatch) {
    return {
      path: colonMatch[1],
      line: Number(colonMatch[2]),
      column: colonMatch[3] ? Number(colonMatch[3]) : null,
    };
  }

  return { path: raw };
}

export function isAbsolutePath(path: string) {
  return (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(path)
  );
}
