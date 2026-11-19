/**
 * The page's own label for each response field, so Claude, the export and the learner all name a
 * box the same way. A field the app has no words for keeps its own name.
 *
 * The web app holds the same four words in `apps/web/src/activities/fieldLabels.ts`; the two
 * workspaces share no source today, so a change here must be made there too.
 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  prediction: 'Your prediction',
  observation: 'What you observed',
  explanation: 'Your explanation',
  help_used: 'Whether you used help',
};

export function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}
