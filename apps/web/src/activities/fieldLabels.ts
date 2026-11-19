/**
 * The `response_fields` this app has words for. An unknown one is shown as the author wrote it.
 * Shared by the boxes and by the feedback area's "What you sent", so a box is named one way.
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
