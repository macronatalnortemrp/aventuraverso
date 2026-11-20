import { describe, expect, test } from 'vitest';
import { loudness } from '../src/engine/ambient';

describe('som das faíscas', () => {
  test('mais alto perto, some longe', () => {
    expect(loudness(0)).toBe(1);
    expect(loudness(8)).toBeGreaterThan(loudness(16));
    expect(loudness(40)).toBe(0);
  });
});
