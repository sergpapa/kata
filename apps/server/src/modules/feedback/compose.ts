import type { createClaudeCodeRunner } from './claudeCode.js';

/** How long one turn may run before it is stopped (PF16). */
export const FEEDBACK_TIMEOUT_MS = 180_000;

/**
 * The options the composition root starts the real runner with (PF18): the learner's executable,
 * an empty working directory under the data directory, the stripped environment and the limit.
 */
export function feedbackRunnerOptions(input: {
  readonly dataDir: string;
  readonly env: NodeJS.ProcessEnv;
  readonly platform: NodeJS.Platform;
  readonly exists: (candidate: string) => boolean;
}): Parameters<typeof createClaudeCodeRunner>[0] {
  void input;
  throw new Error('not implemented');
}
