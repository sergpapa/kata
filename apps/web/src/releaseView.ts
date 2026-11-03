import type { ApiResult } from './api.js';
import type { ReleaseView } from './releaseTypes.js';

/**
 * What `GET /api/courses/:courseId/release` answered, narrowed to the four states a page can draw.
 *
 * Lives apart from any page because two of them need it: the dashboard draws the release, and the
 * shell's sidebar states its identity and size. One request, read in one way, rather than each
 * asking the server its own question.
 */
export function releaseViewOf(result: ApiResult): ReleaseView {
  if (result.state === 'reading') return { state: 'reading' };
  if (result.state === 'unavailable') return { state: 'unavailable', reason: result.reason };
  if (result.status !== 200) {
    return { state: 'unavailable', reason: `The app answered with status ${result.status}.` };
  }

  const body = result.body as ReleaseView;
  const readable =
    body?.state === 'failed' ||
    // An imported answer names its course: the sidebar states it, so one without is unreadable.
    (body?.state === 'imported' && typeof body.course?.title === 'string');
  if (!readable) {
    return { state: 'unavailable', reason: 'The app answered in a shape this page cannot read.' };
  }
  return body;
}
