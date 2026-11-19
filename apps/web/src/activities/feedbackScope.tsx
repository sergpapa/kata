import { createContext, useContext, type ReactNode } from 'react';
import type { FeedbackArea, FeedbackAvailability, LessonFeedback } from './feedbackTypes.js';

/**
 * What the lesson answer said about practice feedback, for the activity panels placed deep inside
 * the Markdown renderer (docs/specs/practice-feedback.md PF8).
 *
 * A context, like the course scope, rather than a prop threaded through the renderer: that
 * renderer memoises its components, and a new prop there remounts every box on the lesson and
 * takes the reader's typed text with it. Null when the server sent no feedback at all, which the
 * page treats as "no feedback area" (PF11).
 */
const LessonFeedbackContext = createContext<LessonFeedback | null>(null);

export function FeedbackScope({
  feedback,
  children,
}: {
  readonly feedback: LessonFeedback | null;
  readonly children: ReactNode;
}) {
  return (
    <LessonFeedbackContext.Provider value={feedback}>{children}</LessonFeedbackContext.Provider>
  );
}

export function useActivityFeedback(
  activityId: string,
): { readonly availability: FeedbackAvailability; readonly area: FeedbackArea } | null {
  const feedback = useContext(LessonFeedbackContext);
  const area = feedback?.activities.find((one) => one.activityId === activityId);
  return feedback && area ? { availability: feedback.availability, area } : null;
}
