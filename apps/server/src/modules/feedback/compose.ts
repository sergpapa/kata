import path from 'node:path';
import {
  childEnvironment,
  resolveClaudeExecutable,
  type createClaudeCodeRunner,
} from './claudeCode.js';

/** How long one turn may run before it is stopped (PF16). */
export const FEEDBACK_TIMEOUT_MS = 180_000;

/**
 * The options the composition root starts the real runner with (PF18): the learner's executable,
 * an empty working directory under the data directory, the stripped environment and the limit.
 *
 * Its own function so the wiring is testable: the runner takes all of these as parameters, and a
 * wrong value here (the repo as working directory, the raw environment) passes every runner test.
 */
export function feedbackRunnerOptions(input: {
  readonly dataDir: string;
  readonly env: NodeJS.ProcessEnv;
  readonly platform: NodeJS.Platform;
  readonly exists: (candidate: string) => boolean;
}): Parameters<typeof createClaudeCodeRunner>[0] {
  const executable = resolveClaudeExecutable(input.env, input.platform, input.exists);
  return {
    command: executable ? { file: executable, leadingArgs: [] } : null,
    workDir: path.join(input.dataDir, 'feedback', 'workspace'),
    env: childEnvironment(input.env),
    timeoutMs: FEEDBACK_TIMEOUT_MS,
  };
}
