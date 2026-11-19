import type { FeedbackRunner, ModelAlias, RunEvent } from './types.js';

/** The arguments one turn is started with (PF18). */
export function claudeArgs(request: {
  readonly sessionId: string;
  readonly resume: boolean;
  readonly model: ModelAlias;
  readonly systemPromptFile: string;
}): string[] {
  void request;
  throw new Error('not implemented');
}

/** The child's environment: the server's own, minus anything that would bill an API key (PF18). */
export function childEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  void env;
  throw new Error('not implemented');
}

/** Where the learner's `claude` executable is, or null when it cannot be found. */
export function resolveClaudeExecutable(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  exists: (candidate: string) => boolean,
): string | null {
  void env;
  void platform;
  void exists;
  throw new Error('not implemented');
}

/**
 * Reads Claude Code's `stream-json` output one line at a time. A `failed` event from `line` means
 * the caller must stop the process now (PF19, PF20).
 */
export class StreamInterpreter {
  line(text: string): readonly RunEvent[] {
    void text;
    throw new Error('not implemented');
  }

  /** The run's terminal event once the process has exited, or null if `line` already gave one. */
  end(exit: {
    readonly code: number | null;
    readonly stderr: string;
    readonly timedOut: boolean;
  }): RunEvent | null {
    void exit;
    throw new Error('not implemented');
  }
}

/** The runner that starts the learner's own Claude Code, one process per turn (ADR 0019). */
export function createClaudeCodeRunner(options: {
  /** The executable and any arguments before ours; null when Claude Code was not found. */
  readonly command: { readonly file: string; readonly leadingArgs: readonly string[] } | null;
  /** An empty directory the process runs in, so no project file is read. */
  readonly workDir: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
}): FeedbackRunner {
  void options;
  throw new Error('not implemented');
}
