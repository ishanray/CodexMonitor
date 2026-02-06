import { useCallback, useEffect, useRef } from "react";
import type { DebugEntry, WorkspaceInfo } from "../../../types";
import { buildErrorDebugEntry } from "../../../utils/debugEntries";
import {
  getWorktreeSetupStatus,
  markWorktreeSetupRan,
  writeTerminalSession,
} from "../../../services/tauri";
import type { TerminalSessionState } from "../../terminal/hooks/useTerminalSession";

const WORKTREE_SETUP_TERMINAL_ID = "worktree-setup";
const WORKTREE_SETUP_TERMINAL_TITLE = "Setup";
type PendingWorktreeSetup = {
  workspaceId: string;
  terminalId: string;
  script: string;
};

type UseWorktreeSetupScriptOptions = {
  ensureTerminalWithTitle: (workspaceId: string, terminalId: string, title: string) => string;
  restartTerminalSession: (workspaceId: string, terminalId: string) => Promise<void>;
  openTerminal: () => void;
  terminalState: TerminalSessionState | null;
  activeTerminalId: string | null;
  onDebug?: (entry: DebugEntry) => void;
};

export type WorktreeSetupScriptState = {
  maybeRunWorktreeSetupScript: (worktree: WorkspaceInfo) => Promise<void>;
};

export function useWorktreeSetupScript({
  ensureTerminalWithTitle,
  restartTerminalSession,
  openTerminal,
  terminalState,
  activeTerminalId,
  onDebug,
}: UseWorktreeSetupScriptOptions): WorktreeSetupScriptState {
  const runningRef = useRef<Set<string>>(new Set());
  const pendingRunRef = useRef<PendingWorktreeSetup | null>(null);

  const maybeRunWorktreeSetupScript = useCallback(
    async (worktree: WorkspaceInfo) => {
      if ((worktree.kind ?? "main") !== "worktree") {
        return;
      }
      if (runningRef.current.has(worktree.id)) {
        return;
      }
      runningRef.current.add(worktree.id);
      try {
        const status = await getWorktreeSetupStatus(worktree.id);
        const script = status.script?.trim() ? status.script : null;
        if (!status.shouldRun || !script) {
          return;
        }

        openTerminal();
        const terminalId = ensureTerminalWithTitle(
          worktree.id,
          WORKTREE_SETUP_TERMINAL_ID,
          WORKTREE_SETUP_TERMINAL_TITLE,
        );

        try {
          await restartTerminalSession(worktree.id, terminalId);
        } catch (error) {
          onDebug?.(buildErrorDebugEntry("worktree setup restart error", error));
        }

        pendingRunRef.current = {
          workspaceId: worktree.id,
          terminalId,
          script,
        };
      } catch (error) {
        onDebug?.(buildErrorDebugEntry("worktree setup script error", error));
      } finally {
        runningRef.current.delete(worktree.id);
      }
    },
    [ensureTerminalWithTitle, onDebug, openTerminal, restartTerminalSession],
  );

  useEffect(() => {
    const pending = pendingRunRef.current;
    const pendingKey = pending
      ? `${pending.workspaceId}:${pending.terminalId}`
      : null;
    if (
      !pending ||
      terminalState?.readyKey !== pendingKey ||
      activeTerminalId !== pending.terminalId
    ) {
      return;
    }

    pendingRunRef.current = null;

    writeTerminalSession(pending.workspaceId, pending.terminalId, `${pending.script}\n`)
      .then(() => markWorktreeSetupRan(pending.workspaceId))
      .catch((error) => {
        onDebug?.(buildErrorDebugEntry("worktree setup script error", error));
      });
  }, [activeTerminalId, onDebug, terminalState?.readyKey]);

  return {
    maybeRunWorktreeSetupScript,
  };
}
