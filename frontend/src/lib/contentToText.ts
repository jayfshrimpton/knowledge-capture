import { DocumentSection } from '../types';

export function contentToText(sections: DocumentSection[]): string {
  return sections
    .map((s) => {
      const lines: string[] = [];
      if (s.heading) lines.push(s.heading);
      const prose = s.content ?? s.desc;
      if (prose) lines.push(prose);
      (s.items ?? []).forEach((item) => lines.push(`- ${item}`));
      return lines.join('\n');
    })
    .join('\n\n')
    .trim();
}
