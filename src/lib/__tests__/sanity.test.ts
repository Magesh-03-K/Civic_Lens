import { describe, it, expect } from 'vitest';
import { mediaUrl } from '../supabase';

describe('Sanity & Baseline Utilities', () => {
  it('correctly handles seed media paths', () => {
    expect(mediaUrl('/seed/sample-pothole.svg')).toBe('/seed/sample-pothole.svg');
  });

  it('correctly handles external absolute urls', () => {
    const url = 'https://example.com/photo.jpg';
    expect(mediaUrl(url)).toBe(url);
  });

  it('returns null for empty media paths', () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl('')).toBeNull();
  });
});
