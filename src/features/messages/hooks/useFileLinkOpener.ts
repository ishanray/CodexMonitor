import { useCallback } from "react";
import { resolve } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { isAbsolutePath } from "../../../utils/fileLinks";

type FileLinkHandler = (
  path: string,
  line?: number | null,
  column?: number | null,
) => Promise<void>;

export function useFileLinkOpener(basePath?: string | null): FileLinkHandler {
  return useCallback(
    async (path: string) => {
      if (!path) {
        return;
      }
      const trimmed = path.trim();
      if (!trimmed) {
        return;
      }
      let resolvedPath = trimmed;
      if (!isAbsolutePath(trimmed) && basePath) {
        try {
          resolvedPath = await resolve(basePath, trimmed);
        } catch {
          resolvedPath = trimmed;
        }
      }
      try {
        await openPath(resolvedPath);
      } catch {
        // Ignore opener failures to avoid breaking message rendering.
      }
    },
    [basePath],
  );
}
