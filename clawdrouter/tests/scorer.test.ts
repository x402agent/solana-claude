/**
 * ClawdRouter — Scorer Tests
 * Tests the 15-dimension request scoring engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRequest, extractText, countMatches, normalize, determineTier, WEIGHTS } from '../src/router/scorer.js';
import type { ChatMessage, DimensionScores } from '../src/types.js';

// ── Helper ──────────────────────────────────────────────────────────

function msg(content: string): ChatMessage[] {
  return [{ role: 'user', content }];
}

// ── Weight Validation ───────────────────────────────────────────────

describe('Dimension Weights', () => {
  it('should sum to 1.0', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1.0) < 0.001, `Weights sum to ${total}, expected 1.0`);
  });

  it('should have 15 dimensions', () => {
    assert.equal(Object.keys(WEIGHTS).length, 15);
  });

  it('should have all positive weights', () => {
    for (const [key, weight] of Object.entries(WEIGHTS)) {
      assert.ok(weight > 0, `Weight for ${key} should be positive, got ${weight}`);
    }
  });
});

// ── Scoring Tiers ───────────────────────────────────────────────────

describe('Request Scoring', () => {
  it('should classify "hello" as SIMPLE', () => {
    const result = scoreRequest(msg('Hello, how are you?'));
    assert.equal(result.tier, 'SIMPLE');
    assert.ok(result.totalScore < 0.25, `Score ${result.totalScore} should be < 0.25`);
  });

  it('should classify code requests as MEDIUM or higher', () => {
    const result = scoreRequest(msg('Write a TypeScript function to sort an array'));
    assert.ok(
      ['MEDIUM', 'COMPLEX', 'REASONING'].includes(result.tier),
      `Expected MEDIUM+, got ${result.tier}`
    );
  });

  it('should classify Solana-specific requests as MEDIUM or higher', () => {
    const result = scoreRequest(msg('Explain how Solana PDA accounts work and derive a token vault PDA'));
    assert.ok(
      ['MEDIUM', 'COMPLEX', 'REASONING'].includes(result.tier),
      `Expected MEDIUM+, got ${result.tier}`
    );
    assert.ok(result.scores.solanaSpecific > 0, 'Solana dimension should be > 0');
  });

  it('should classify math/reasoning requests as REASONING', () => {
    const result = scoreRequest(msg(
      'Prove that the algorithm has O(n log n) complexity. ' +
      'Derive the recurrence relation step by step and explain why the base case holds.'
    ));
    assert.ok(
      ['COMPLEX', 'REASONING'].includes(result.tier),
      `Expected COMPLEX or REASONING, got ${result.tier}`
    );
  });

  it('should detect vision requests with images', () => {
    const messages: ChatMessage[] = [{
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } },
      ],
    }];
    const result = scoreRequest(messages);
    assert.equal(result.scores.vision, 1.0, 'Vision score should be 1.0 for image messages');
  });

  it('should return scores in [0, 1] range', () => {
    const result = scoreRequest(msg('Write a complex distributed system for Solana token staking'));
    for (const [key, value] of Object.entries(result.scores)) {
      assert.ok(value >= 0 && value <= 1.0, `${key} = ${value} should be in [0, 1]`);
    }
  });

  it('should score in under 5ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      scoreRequest(msg('Write a Solana program for token staking with PDAs and CPIs'));
    }
    const elapsed = (performance.now() - start) / 100;
    assert.ok(elapsed < 5, `Average scoring time ${elapsed.toFixed(2)}ms should be < 5ms`);
  });
});

// ── Text Extraction ─────────────────────────────────────────────────

describe('Text Extraction', () => {
  it('should extract text from string content', () => {
    const text = extractText([{ role: 'user', content: 'Hello world' }]);
    assert.equal(text, 'Hello world');
  });

  it('should extract text from content parts', () => {
    const text = extractText([{
      role: 'user',
      content: [
        { type: 'text', text: 'First part' },
        { type: 'text', text: 'Second part' },
      ],
    }]);
    assert.ok(text.includes('First part'));
    assert.ok(text.includes('Second part'));
  });

  it('should handle empty messages', () => {
    const text = extractText([]);
    assert.equal(text, '');
  });
});

// ── Normalize ───────────────────────────────────────────────────────

describe('Normalize', () => {
  it('should cap at 1.0', () => {
    assert.equal(normalize(200, 100), 1.0);
  });

  it('should return fraction', () => {
    assert.equal(normalize(50, 100), 0.5);
  });

  it('should return 0 for 0', () => {
    assert.equal(normalize(0, 100), 0);
  });
});

// ── Tier Determination ──────────────────────────────────────────────

describe('Tier Determination', () => {
  const baseScores: DimensionScores = {
    tokenCount: 0, complexity: 0, technicalDepth: 0, codeGeneration: 0,
    reasoning: 0, creativity: 0, multiStep: 0, contextLength: 0,
    toolUse: 0, vision: 0, mathScience: 0, solanaSpecific: 0,
    agentAutonomy: 0, structuredOutput: 0, latencySensitivity: 0,
  };

  it('should override to REASONING for high reasoning score', () => {
    const scores = { ...baseScores, reasoning: 0.8 };
    assert.equal(determineTier(0.1, scores), 'REASONING');
  });

  it('should override to REASONING for high math score', () => {
    const scores = { ...baseScores, mathScience: 0.8 };
    assert.equal(determineTier(0.1, scores), 'REASONING');
  });

  it('should override to COMPLEX for high vision score', () => {
    const scores = { ...baseScores, vision: 0.9 };
    assert.equal(determineTier(0.1, scores), 'COMPLEX');
  });
});
