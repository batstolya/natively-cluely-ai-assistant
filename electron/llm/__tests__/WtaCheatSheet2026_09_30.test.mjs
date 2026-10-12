// electron/llm/__tests__/WtaCheatSheet2026_09_30.test.mjs
//
// "What to answer?" renders in the typed-chat interview-answer layout for every
// non-coding turn; coding turns keep the coding contract untouched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = (p) => pathToFileURL(path.resolve(__dirname, '../../../dist-electron/electron/llm', p)).href;
const wta = await import(dist('wtaCheatSheet.js'));
const v2 = await import(dist('promptSystemV2.js'));

const chatPrompt = (tier = 'cloud') =>
  v2.buildSystemPromptV2({ mode: 'general', tier, ...wta.resolveWtaPersonaV2Input({ codingTurn: false }) });

test('non-coding turn → answer action on the chat surface → prompt carries <chat_layout>', () => {
  assert.deepEqual(wta.resolveWtaPersonaV2Input({ codingTurn: false }), { action: 'answer', chatSurface: true });
  assert.ok(chatPrompt().includes('<chat_layout>'));
});

test('coding turn → answer action WITHOUT the chat layout (coding contract owns the shape)', () => {
  assert.deepEqual(wta.resolveWtaPersonaV2Input({ codingTurn: true }), { action: 'answer', chatSurface: false });
});

test('the spoken 40-60 word default never rides a layout turn', () => {
  assert.equal(wta.wtaUsesSpokenLengthDefault({ codingTurn: false }), false);
  assert.equal(wta.wtaUsesSpokenLengthDefault({ codingTurn: true }), true);
});

test('layout answers are never flattened into speakable prose', () => {
  assert.equal(wta.wtaFlattensStructure({ codingTurn: false }), false);
});

// ── Layout content (user-approved reference answer, 2026-09-30) ──
for (const tier of ['cloud', 'local']) {
  test(`${tier}: one speakable answer in the approved order, no bold section labels`, () => {
    const p = chatPrompt(tier);
    const layout = p.slice(p.indexOf('<chat_layout>'), p.indexOf('</chat_layout>'));
    assert.ok(layout.includes('speakable interview answer'));
    const order = ['definition', 'mechanism', 'rule', 'example', 'consequence'].map((w) => layout.toLowerCase().indexOf(w));
    assert.ok(order.every((i) => i >= 0), `missing a step: ${order}`);
    assert.deepEqual([...order].sort((a, b) => a - b), order, 'steps out of order');
    assert.match(layout, /no bold section labels/i);
    assert.ok(!layout.includes('Good interview answer:'), 'the separate quote block is gone');
  });

  test(`${tier}: speech-recognition slips are corrected silently`, () => {
    assert.match(chatPrompt(tier), /silently/i);
  });

  test(`${tier}: examples show only output the spec guarantees`, () => {
    assert.match(chatPrompt(tier), /guaranteed/i);
  });
}

// ── Compact layout (external review 3, 2026-10-12) ──
// A few principles instead of long ban/swap lists, a flexible shape, no
// mandatory word minimum, and one short sample answer that shows the target
// language, depth, and rhythm. Voice and language control stay as they were.
for (const tier of ['cloud', 'local']) {
  const layoutOf = () => {
    const p = chatPrompt(tier);
    return p.slice(p.indexOf('<chat_layout>'), p.indexOf('</chat_layout>'));
  };

  test(`${tier}: plain spoken B2 English, short sentences, precise terms kept`, () => {
    const l = layoutOf();
    assert.match(l, /plain spoken English/i);
    assert.match(l, /B2/);
    assert.match(l, /short sentences/i);
    assert.match(l, /contractions/i);
    assert.match(l, /simplify the wording, never the technical content/i);
  });

  test(`${tier}: voice rules kept`, () => {
    const l = layoutOf();
    assert.match(l, /candidate's own voice/i);
    assert.match(l, /never talk about the interview/i);
    assert.match(l, /never address the listener as "you"/i);
    assert.ok(!/never invent the candidate's experience/i.test(l), 'chat layout still bans experience stories');
    assert.match(l, /Example to adapt/);
  });

  test(`${tier}: flexible shape — direct answer first, example and consequence optional`, () => {
    const l = layoutOf();
    assert.match(l, /direct answer/i);
    assert.match(l, /only when it helps/i);
    assert.match(l, /only when it adds meaning/i);
    assert.match(l, /call it and show the guaranteed result/i);
  });

  test(`${tier}: no mandatory word minimum; a simple question can be three sentences`, () => {
    const l = layoutOf();
    assert.ok(!/150-220/.test(l), 'the old 150-220 minimum band is back');
    assert.match(l, /three sentences/i);
    assert.match(l, /never pad/i);
  });

  test(`${tier}: no long ban or swap lists`, () => {
    const l = layoutOf();
    for (const old of ['Conversely', 'lies in', 'A common pitfall is', 'Before answering, check']) {
      assert.ok(!l.includes(old), `old list entry still present: ${old}`);
    }
  });
}

test('cloud: layout is compact', () => {
  const p = chatPrompt('cloud');
  const words = p.slice(p.indexOf('<chat_layout>'), p.indexOf('</chat_layout>')).split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 450, `cloud chat layout grew to ${words} words`);
});

test('local: layout is compact', () => {
  const p = chatPrompt('local');
  const words = p.slice(p.indexOf('<chat_layout>'), p.indexOf('</chat_layout>')).split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 220, `local chat layout grew to ${words} words`);
});

test('cloud: one short sample answer shows the target tone', () => {
  const p = chatPrompt('cloud');
  const l = p.slice(p.indexOf('<chat_layout>'), p.indexOf('</chat_layout>'));
  assert.match(l, /A shallow copy creates a new object, but nested objects are still shared/);
  assert.match(l, /language, depth, and rhythm/i);
});

test('cloud: the closing step no longer asks for "a pitfall"', () => {
  const p = chatPrompt('cloud');
  const layout = p.slice(p.indexOf('<chat_layout>'), p.indexOf('</chat_layout>'));
  assert.ok(!/practical pitfall or implication/.test(layout), 'step 6 still asks for a pitfall');
});
