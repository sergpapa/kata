import type { ReactNode } from 'react';
import type { Element } from 'hast';
import { MermaidDiagram } from './MermaidDiagram.js';
import { KataDiagram } from './KataSequenceFigure.js';
import {
  DESCRIBED_BY,
  DIAGRAM_NUMBER,
  DIAGRAM_PLACE,
  KATA_LANGUAGE,
  PAIRED,
} from './regionNames.js';

/** Whether a fence of this language is a diagram rather than a code sample. */
export function isDiagramLanguage(language: string | undefined): boolean {
  return language === 'mermaid' || language === KATA_LANGUAGE;
}

/**
 * What a diagram fence becomes on the page: a Kata diagram, a Mermaid diagram, or nothing when it
 * is the Mermaid fallback of a Kata diagram that drew (docs/specs/kata-diagrams.md KD14).
 *
 * `block` is the fence as the labelled code block every other fence gets. It is handed over as the
 * diagram's source and fallback rather than rebuilt, so the source a reader falls back to is the
 * same markup, character for character. The properties read here are written by
 * `rehypeRegionNames`, which pairs the fences and numbers the diagrams.
 */
export function diagramFence(
  node: Element | undefined,
  language: string | undefined,
  source: string,
  block: ReactNode,
): ReactNode {
  const describedBy = node?.properties?.[DESCRIBED_BY];
  const number = node?.properties?.[DIAGRAM_NUMBER];
  const place = node?.properties?.[DIAGRAM_PLACE];
  const paired = node?.properties?.[PAIRED];
  const common = {
    source,
    describedBy: typeof describedBy === 'string' ? describedBy : undefined,
    number: typeof number === 'string' ? number : 'Diagram',
    place: typeof place === 'string' ? place : '',
  };

  if (language === KATA_LANGUAGE) {
    return (
      <KataDiagram {...common} hasFallback={paired === 'fallback'}>
        {block}
      </KataDiagram>
    );
  }
  if (paired === 'superseded') return null;
  return <MermaidDiagram {...common}>{block}</MermaidDiagram>;
}
