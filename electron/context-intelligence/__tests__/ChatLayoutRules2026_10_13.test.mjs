// Context Intelligence V3 — permanent rules defer to the typed-chat layout.
//
// Captured live (2026-10-12 prompt dump): on a "What to answer?" turn the V3
// "# Rules" block rendered AFTER the persona's <chat_layout> and told the model
// "aim for two to four sentences" and "Never fabricate personal experience",
// overriding the layout's length and its labeled practice-story rule by
// recency. Only when the persona actually carries the layout do those two
// lines yield; every other permanent rule stays.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');
const { composePrompt } = await import(pathToFileURL(path.join(base, 'generation/prompt-composer.js')).href);
const { decide } = await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href);
const { MODE_POLICIES } = await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

const d = decide({ requestId: 'r1', requestSequence: 1, surface: 'manual-chat', modeId: 'technical-interview', scope: { userId: 'u1' }, sessionId: 's1', manualQuestion: 'What is a closure?' });
const compose = (personaBase) => composePrompt({ decision: d, policy: MODE_POLICIES['technical-interview'], evidence: [], personaBase }).system;
const LAYOUT_PERSONA = '<identity>persona</identity>\n\n<chat_layout>\nWrite ONE speakable interview answer.\n</chat_layout>';
const SHORT = 'aim for two to four sentences';
const FABRICATE = 'Never fabricate personal experience, employment, projects, skills or education.';

describe('permanent rules with the typed-chat layout', () => {
  test('the two-to-four-sentence line yields to the layout', () => {
    assert.ok(!compose(LAYOUT_PERSONA).includes(SHORT));
  });

  test('the blanket fabrication ban becomes the labeled practice-story rule', () => {
    const s = compose(LAYOUT_PERSONA);
    assert.ok(!s.includes(FABRICATE));
    assert.ok(s.includes('Example to adapt'));
    assert.ok(s.includes('never present it as real'));
  });

  test('every other permanent rule still rides', () => {
    const s = compose(LAYOUT_PERSONA);
    for (const kept of [
      'Never state that a technology was used unless the evidence supports it.',
      'Never treat job-description requirements as the user\'s own experience.',
      'Produce one natural, speakable answer.',
      'Distinguish direct evidence, inference, and general knowledge.',
    ]) assert.ok(s.includes(kept), `missing: ${kept}`);
  });
});

describe('without the layout nothing changes', () => {
  for (const [name, persona] of [['no persona', undefined], ['persona without layout', '<identity>persona</identity>']]) {
    test(`${name}: both original lines still render`, () => {
      const s = compose(persona);
      assert.ok(s.includes(SHORT));
      assert.ok(s.includes(FABRICATE));
    });
  }
});
