import { describe, expect, it } from 'vitest';

import {
  dataAttributeForTag,
  isValidTag,
  normalizeTag,
  tagFromDataAttribute,
} from '@veneer/core';

describe('tag utilities', () => {
  it('accepts lowercase, numbers, and hyphens', () => {
    expect(isValidTag('hero-title')).toBe(true);
    expect(isValidTag('section-2')).toBe(true);
  });

  it('rejects uppercase, spaces, and bad hyphens', () => {
    expect(isValidTag('HeroTitle')).toBe(false);
    expect(isValidTag('hero title')).toBe(false);
    expect(isValidTag('-hero')).toBe(false);
    expect(isValidTag('hero--title')).toBe(false);
  });

  it('normalizes messy input into a valid tag', () => {
    expect(normalizeTag('  Hero Title!  ')).toBe('hero-title');
    expect(isValidTag(normalizeTag('Hero Title!'))).toBe(true);
  });

  it('builds and reads the data attribute', () => {
    const attribute = dataAttributeForTag('hero-title');

    expect(attribute).toBe('data-veneer-hero-title');
    expect(tagFromDataAttribute(attribute)).toBe('hero-title');
    expect(tagFromDataAttribute('class')).toBeNull();
  });
});
