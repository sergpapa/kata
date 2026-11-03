/**
 * A source lesson's manifest entry, derived from the lesson itself — never typed by hand — so the
 * manifest cannot drift from the file it describes (spec C4).
 */
import fs from 'node:fs';
import path from 'node:path';
import { firstHeadingOneText, splitFrontMatter } from '../modules/content/frontMatter.js';
import { sha256 } from './kits.js';
import { Refusal, type SourceRelease } from './sourceTree.js';

export interface DerivedLesson {
  readonly order: number;
  readonly lesson_id: string;
  readonly document_id: string;
  readonly version: string;
  readonly module: string;
  readonly title: string;
  readonly path: string;
  readonly sha256: string;
  readonly lab_id: string | null;
}

export interface LessonSource {
  readonly entry: DerivedLesson;
  readonly fileName: string;
  readonly bytes: Buffer;
}

function requiredField(frontMatter: Record<string, unknown>, field: string, file: string): string {
  const value = frontMatter[field];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Refusal(`${file} has no ${field} in its front matter.`);
  }
  return String(value);
}

/** Every lesson `release.json` lists, in its order, with the entry the manifest will carry. */
export function deriveLessons(sourceDir: string, release: SourceRelease): LessonSource[] {
  return release.lessons.map((fileName, index) => {
    const file = path.join(sourceDir, 'lessons', fileName);
    if (!fs.existsSync(file))
      throw new Refusal(`release.json lists ${fileName}, but lessons/ has no such file.`);
    const bytes = fs.readFileSync(file);
    const split = splitFrontMatter(bytes.toString('utf8'));
    if (!split.ok) {
      throw new Refusal(
        `${fileName} does not carry readable front matter: ${split.problem.detail}.`,
      );
    }
    const { frontMatter, body } = split.value;
    const lessonId = requiredField(frontMatter, 'candidate_lesson_id', fileName);
    const title = firstHeadingOneText(body);
    if (title === undefined) throw new Refusal(`${fileName} has no level-one heading to title it.`);
    const kits = release.labs.filter((lab) => lab.lesson_ids.includes(lessonId));
    if (kits.length > 1) {
      throw new Refusal(
        `${lessonId} is served by ${kits.length} kits; a lesson belongs to one at most.`,
      );
    }
    return {
      fileName,
      bytes,
      entry: {
        order: index + 1,
        lesson_id: lessonId,
        document_id: requiredField(frontMatter, 'document_id', fileName),
        version: requiredField(frontMatter, 'version', fileName),
        module: requiredField(frontMatter, 'module', fileName),
        title,
        path: `lessons/${fileName}`,
        sha256: sha256(bytes),
        lab_id: kits[0]?.lab_id ?? null,
      },
    };
  });
}
