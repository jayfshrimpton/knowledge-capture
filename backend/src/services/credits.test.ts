import { describe, it, expect } from 'vitest';
import { estimateCreditCost, finalCreditCost, PLAN_LIMITS } from './credits';

// Generate a string with exactly `n` words.
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
}

describe('estimateCreditCost', () => {
  it('costs 1 credit for a short note (≤500 words)', () => {
    expect(estimateCreditCost(words(20))).toBe(1);
    expect(estimateCreditCost(words(500))).toBe(1);
  });

  it('costs 2 credits for a long document (>500 words)', () => {
    expect(estimateCreditCost(words(501))).toBe(2);
    expect(estimateCreditCost(words(1000))).toBe(2);
  });

  it('handles empty string as 1 credit', () => {
    expect(estimateCreditCost('')).toBe(1);
  });
});

describe('finalCreditCost', () => {
  it('costs 5 credits for diagram format regardless of length', () => {
    expect(finalCreditCost('diagram', words(10))).toBe(5);
    expect(finalCreditCost('diagram', words(600))).toBe(5);
  });

  it('costs 1 credit for short non-diagram', () => {
    expect(finalCreditCost('procedure', words(20))).toBe(1);
    expect(finalCreditCost('checklist', words(500))).toBe(1);
    expect(finalCreditCost('reference', words(1))).toBe(1);
  });

  it('costs 2 credits for long non-diagram (>500 words)', () => {
    expect(finalCreditCost('procedure', words(501))).toBe(2);
    expect(finalCreditCost('reference', words(1000))).toBe(2);
  });
});

describe('PLAN_LIMITS', () => {
  it('starter plan has a finite limit', () => {
    expect(typeof PLAN_LIMITS['starter']).toBe('number');
    expect(PLAN_LIMITS['starter']).toBeGreaterThan(0);
  });

  it('business plan has a higher limit than starter', () => {
    expect(PLAN_LIMITS['business']!).toBeGreaterThan(PLAN_LIMITS['starter']!);
  });

  it('enterprise plan is unlimited (null)', () => {
    expect(PLAN_LIMITS['enterprise']).toBeNull();
  });
});
