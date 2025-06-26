import { wrapQuestion } from '../electron/promptHelpers.js';
import { describe, it, expect } from '@jest/globals';

describe('wrapQuestion', () => {
  it('wraps user question with tone and instructions', () => {
    const question = 'What is your biggest weakness?';
    const result = wrapQuestion(question);

    expect(result).toContain('biggest weakness');
    expect(result.startsWith('When providing a answer')).toBe(true);
    expect(result).toMatch(/QUESTION TYPE/); // ensure instructions present
  });
}); 