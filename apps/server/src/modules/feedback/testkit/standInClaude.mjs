// A stand-in for the `claude` executable, started by claudeCodeProcess.test.ts in its place.
//
// It speaks the same stream-json lines the real one does (trimmed), and its behaviour is chosen by
// STANDIN_MODE, which reaches it through the environment the runner hands down:
//   report  — finish normally; the reply text is a JSON report of what this process received
//   hang    — start, then never finish (the time limit must stop it)
//   overage — start, report extra usage in use, then never finish (the guard must stop it)
//   apikey  — start with an API key as the credential source, then never finish
import fs from 'node:fs';

const mode = process.env.STANDIN_MODE ?? 'report';
const args = process.argv.slice(2);
const emit = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const sessionId = String(process.pid);

const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  const stdin = Buffer.concat(chunks).toString('utf8');
  // A run stopped at its init event never reports its session (here: its pid), so this mode leaves
  // the pid where the test can find it, before saying anything.
  if (mode === 'apikey' || mode === 'hang') fs.writeFileSync('standin.pid', String(process.pid));
  emit({
    type: 'system',
    subtype: 'init',
    session_id: sessionId,
    model: 'claude-sonnet-5-5',
    tools: [],
    mcp_servers: [],
    apiKeySource: mode === 'apikey' ? 'ANTHROPIC_API_KEY' : 'none',
  });

  if (mode === 'hang' || mode === 'apikey') {
    setInterval(() => {}, 1000);
    return;
  }
  if (mode === 'overage') {
    emit({
      type: 'rate_limit_event',
      rate_limit_info: { status: 'allowed', isUsingOverage: true, overageStatus: 'allowed' },
      session_id: sessionId,
    });
    setInterval(() => {}, 1000);
    return;
  }

  const promptFileAt = args.indexOf('--system-prompt-file');
  const report = JSON.stringify({
    pid: process.pid,
    stdin,
    args,
    cwd: process.cwd(),
    cwdEntries: fs.readdirSync(process.cwd()),
    systemPrompt: promptFileAt >= 0 ? fs.readFileSync(args[promptFileAt + 1], 'utf8') : null,
    billingVariables: Object.keys(process.env).filter((name) =>
      /^(ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL|FOUNDRY_API_KEY)|CLAUDE_CODE_USE_(BEDROCK|VERTEX|FOUNDRY))$/i.test(
        name,
      ),
    ),
  });
  emit({
    type: 'stream_event',
    event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: report } },
    session_id: sessionId,
  });
  emit({
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: report,
    session_id: sessionId,
  });
});
