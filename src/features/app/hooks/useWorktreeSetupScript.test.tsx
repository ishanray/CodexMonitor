// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceInfo } from "../../../types";
import type { TerminalSessionState } from "../../terminal/hooks/useTerminalSession";
import {
  getWorktreeSetupStatus,
  markWorktreeSetupRan,
  writeTerminalSession,
} from "../../../services/tauri";
import { useWorktreeSetupScript } from "./useWorktreeSetupScript";

vi.mock("../../../services/tauri", () => ({
  getWorktreeSetupStatus: vi.fn(),
  markWorktreeSetupRan: vi.fn(),
  writeTerminalSession: vi.fn(),
}));

const baseWorktree: WorkspaceInfo = {
  id: "workspace-1",
  name: "Worktree",
  path: "/tmp/worktree",
  connected: true,
  kind: "worktree",
  parentId: "parent-1",
  settings: { sidebarCollapsed: false },
};

const terminalState: TerminalSessionState = {
  status: "ready",
  message: "",
  containerRef: { current: null },
  hasSession: false,
  readyKey: null,
  cleanupTerminalSession: vi.fn(),
};

describe("useWorktreeSetupScript", () => {
  it("writes setup script only after the terminal session is ready", async () => {
    vi.mocked(getWorktreeSetupStatus).mockResolvedValue({
      shouldRun: true,
      script: "npm install",
    });
    vi.mocked(writeTerminalSession).mockResolvedValue(undefined);
    vi.mocked(markWorktreeSetupRan).mockResolvedValue(undefined);

    const ensureTerminalWithTitle = vi.fn(() => "worktree-setup");
    const restartTerminalSession = vi.fn().mockResolvedValue(undefined);
    const openTerminal = vi.fn();

    type HookProps = {
      terminalState: TerminalSessionState;
      activeTerminalId: string | null;
    };

    const initialProps: HookProps = {
      terminalState,
      activeTerminalId: null,
    };

    const { result, rerender } = renderHook(
      (props: HookProps) =>
        useWorktreeSetupScript({
          ensureTerminalWithTitle,
          restartTerminalSession,
          openTerminal,
          terminalState: props.terminalState,
          activeTerminalId: props.activeTerminalId,
        }),
      {
        initialProps,
      },
    );

    await act(async () => {
      await result.current.maybeRunWorktreeSetupScript(baseWorktree);
    });

    expect(openTerminal).toHaveBeenCalled();
    expect(ensureTerminalWithTitle).toHaveBeenCalledWith(
      "workspace-1",
      "worktree-setup",
      "Setup",
    );
    expect(restartTerminalSession).toHaveBeenCalledWith("workspace-1", "worktree-setup");
    expect(writeTerminalSession).not.toHaveBeenCalled();

    rerender({
      terminalState: {
        ...terminalState,
        hasSession: true,
        readyKey: "workspace-1:worktree-setup",
      },
      activeTerminalId: "worktree-setup",
    });

    await waitFor(() => {
      expect(writeTerminalSession).toHaveBeenCalledWith(
        "workspace-1",
        "worktree-setup",
        "npm install\n",
      );
    });

    await waitFor(() => {
      expect(markWorktreeSetupRan).toHaveBeenCalledWith("workspace-1");
    });
  });
});
