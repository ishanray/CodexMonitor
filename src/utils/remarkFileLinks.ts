import type { Root, PhrasingContent } from "mdast";
import { visit } from "unist-util-visit";
import { buildFileLinkUrl, splitFilePathMatch } from "./fileLinks";

const filePathPattern =
  /(?:~\/|\.\.\/|\.\/|\/|[A-Za-z]:[\\/])?[^\s<>`"\]\[()]+(?:[\\/][^\s<>`"\]\[()]+)+(?:(?:#L|:)(?:\d+)(?::\d+)?)?/g;

function trimTrailingPunctuation(raw: string) {
  let trimmed = raw;
  let trailing = "";
  while (/[),;!?]$/.test(trimmed)) {
    trailing = trimmed.slice(-1) + trailing;
    trimmed = trimmed.slice(0, -1);
  }
  return { trimmed, trailing };
}

export function remarkFileLinks() {
  return (tree: Root) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || typeof index !== "number") {
        return;
      }
      if (
        parent.type === "link" ||
        parent.type === "linkReference" ||
        parent.type === "inlineCode" ||
        parent.type === "code"
      ) {
        return;
      }
      const value = node.value;
      if (!value || !filePathPattern.test(value)) {
        return;
      }
      filePathPattern.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;
      for (const match of value.matchAll(filePathPattern)) {
        if (match.index === undefined) {
          continue;
        }
        const start = match.index;
        if (start > lastIndex) {
          parts.push({ type: "text", value: value.slice(lastIndex, start) });
        }
        const rawMatch = match[0];
        if (rawMatch.includes("://")) {
          parts.push({ type: "text", value: rawMatch });
          lastIndex = start + rawMatch.length;
          continue;
        }
        const { trimmed, trailing } = trimTrailingPunctuation(rawMatch);
        if (!trimmed) {
          parts.push({ type: "text", value: rawMatch });
          lastIndex = start + rawMatch.length;
          continue;
        }
        const target = splitFilePathMatch(trimmed);
        parts.push({
          type: "link",
          url: buildFileLinkUrl(target),
          children: [{ type: "text", value: trimmed }],
        });
        if (trailing) {
          parts.push({ type: "text", value: trailing });
        }
        lastIndex = start + rawMatch.length;
      }
      if (lastIndex < value.length) {
        parts.push({ type: "text", value: value.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
