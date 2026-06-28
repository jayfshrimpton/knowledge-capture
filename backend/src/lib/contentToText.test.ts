import { describe, it, expect } from 'vitest';
import { contentToText } from './contentToText';
import type { DocumentSection } from '../types';

describe('contentToText', () => {
  it('returns empty string for an empty array', () => {
    expect(contentToText([])).toBe('');
  });

  it('returns heading only when no content, desc, or items', () => {
    const sections: DocumentSection[] = [{ heading: 'Overview' }];
    expect(contentToText(sections)).toBe('Overview');
  });

  it('includes content prose under the heading', () => {
    const sections: DocumentSection[] = [
      { heading: 'Background', content: 'Some context here.' },
    ];
    expect(contentToText(sections)).toBe('Background\nSome context here.');
  });

  it('uses desc when content is absent', () => {
    const sections: DocumentSection[] = [
      { heading: 'Step 1', desc: 'Do the thing.' },
    ];
    expect(contentToText(sections)).toBe('Step 1\nDo the thing.');
  });

  it('prefers content over desc when both are present', () => {
    const sections: DocumentSection[] = [
      { heading: 'Step 1', content: 'Content wins.', desc: 'Desc loses.' },
    ];
    expect(contentToText(sections)).toBe('Step 1\nContent wins.');
  });

  it('renders items as bullet lines', () => {
    const sections: DocumentSection[] = [
      { heading: 'Checklist', items: ['Item A', 'Item B', 'Item C'] },
    ];
    expect(contentToText(sections)).toBe('Checklist\n- Item A\n- Item B\n- Item C');
  });

  it('combines heading, content, and items', () => {
    const sections: DocumentSection[] = [
      { heading: 'Setup', content: 'Follow these steps.', items: ['Install node', 'Run npm install'] },
    ];
    expect(contentToText(sections)).toBe(
      'Setup\nFollow these steps.\n- Install node\n- Run npm install'
    );
  });

  it('joins multiple sections with a double newline', () => {
    const sections: DocumentSection[] = [
      { heading: 'A', content: 'First.' },
      { heading: 'B', content: 'Second.' },
    ];
    expect(contentToText(sections)).toBe('A\nFirst.\n\nB\nSecond.');
  });

  it('handles a section with no heading', () => {
    const sections: DocumentSection[] = [{ content: 'No heading here.' }];
    expect(contentToText(sections)).toBe('No heading here.');
  });
});
