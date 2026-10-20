// electron/llm/__tests__/MorePrompt2026_09_30.test.mjs
//
// "More" quick action prompt: deepen the last question with ONLY material that
// none of the already-shown answers contain. Pure builder, dist-electron import.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const more = await import(
  pathToFileURL(path.resolve(__dirname, '../../../dist-electron/electron/llm/MorePrompt.js')).href
);

test('system prompt forbids repeating shown answers', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /never repeat/i);
});

// User decision 2026-09-30: More reads like the main answer — speakable
// paragraphs, no bold section labels — just one level deeper.
test('More is speakable paragraphs with no bold section labels', () => {
  const sys = more.MORE_SYSTEM_PROMPT;
  assert.match(sys, /speakable/i);
  assert.match(sys, /no bold section labels/i);
  assert.match(sys, /1-2 short paragraphs/i);
  for (const label of ['**Under the hood:**', '**Advanced details:**', '**Likely follow-up questions:**', '**Example:**']) {
    assert.ok(!sys.includes(label), `old section label still present: ${label}`);
  }
});

// User decision 2026-09-30 (reference structure): code only as a tiny
// example when the code IS the point of the theme.
test('code is a tiny optional example only when it is the point', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /at most 4 lines/i);
  assert.match(more.MORE_SYSTEM_PROMPT, /only when the code is the point/i);
});

test('system prompt defers language to the settings LANGUAGE instruction', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /LANGUAGE instruction/);
});

test('user message carries the question and every shown answer, numbered in order', () => {
  const msg = more.buildMoreUserMessage('what is event loop', ['base answer', 'more #1']);
  assert.ok(msg.includes('what is event loop'));
  const a = msg.indexOf('base answer');
  const b = msg.indexOf('more #1');
  assert.ok(a >= 0 && b > a, 'answers must appear in order');
  assert.match(msg, /ANSWER 1/);
  assert.match(msg, /ANSWER 2/);
});

test('missing question is stated, not invented', () => {
  const msg = more.buildMoreUserMessage(null, ['base answer']);
  assert.match(msg, /infer the question from the answers/i);
});

test('the display label for the chat card is "More"', () => {
  assert.equal(more.MORE_INTENT, 'more');
});

// ── Accuracy rules (interview review 2026-09-30: wrong execution orders,
// "reference counting", invented V8 internals, "synchronous" MutationObserver) ──
test('execution-order examples show only spec-guaranteed output and flag environment-dependent order', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /guaranteed by the specification/i);
  assert.match(more.MORE_SYSTEM_PROMPT, /depends on the environment/i);
});

test('forbids invented engine internals', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /never invent internal engine/i);
});

test('an uncertain claim is left out rather than stated', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /not certain.*leave it out/i);
});

// ── Interview-importance ordering (user decision 2026-09-30) ──
// More picks what an interviewer is most likely to ask that no shown answer
// covered — not the most exotic internals — and each press steps one tier down.
test('priority is interview likelihood, not depth for its own sake', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /how likely an interviewer is to ask/i);
  assert.match(more.MORE_SYSTEM_PROMPT, /most important first/i);
});

test('first press asks for the most commonly asked missing points', () => {
  const msg = more.buildMoreUserMessage('what is event loop', ['base answer']);
  assert.match(msg, /MORE PRESS: 1/);
  assert.match(msg, /asked in most interviews/i);
});

test('second press steps down to the middle/senior tier', () => {
  const msg = more.buildMoreUserMessage('q', ['base', 'more #1']);
  assert.match(msg, /MORE PRESS: 2/);
  assert.match(msg, /middle\/senior/i);
  assert.match(msg, /performance/i);
});

test('third and later presses reach rare, deep material', () => {
  for (const n of [3, 5]) {
    const msg = more.buildMoreUserMessage('q', Array.from({ length: n }, (_, i) => `a${i}`));
    assert.match(msg, new RegExp(`MORE PRESS: ${n}`));
    assert.match(msg, /rare/i);
  }
});

// ── Which question More deepens (bug 2026-09-30) ──
// A button-triggered answer has no typed question. More used the interviewer's
// LAST turn, so a newer question ("async/await?") hijacked More on an older
// Event Loop answer. The question the answer was generated FOR wins.
test('typed question wins', () => {
  assert.equal(more.resolveMoreQuestion('typed q', 'answered q', 'latest turn'), 'typed q');
});

test('without a typed question, the question the answer was generated for wins over the latest turn', () => {
  assert.equal(more.resolveMoreQuestion(null, 'what is event loop', 'what is async await'), 'what is event loop');
});

test('latest interviewer turn is only the last resort; blanks count as missing', () => {
  assert.equal(more.resolveMoreQuestion('  ', '', 'latest turn'), 'latest turn');
  assert.equal(more.resolveMoreQuestion(null, null, null), null);
});

// ── One theme per press with an English header (reference structure 2026-09-30) ──
test('each press covers ONE theme under an English "More N — Theme" header', () => {
  const sys = more.MORE_SYSTEM_PROMPT;
  assert.match(sys, /exactly ONE theme/);
  assert.match(sys, /\*\*More <N> — <Theme in English>\*\*/);
});

test('the user message tells the model which header number to use', () => {
  assert.match(more.buildMoreUserMessage('q', ['base']), /HEADER: \*\*More 1 — /);
  assert.match(more.buildMoreUserMessage('q', ['base', 'm1', 'm2']), /HEADER: \*\*More 3 — /);
});

test('asks for concrete API names and precise terms', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /concrete API names/i);
  assert.match(more.MORE_SYSTEM_PROMPT, /precise terms/i);
});

test('third tier is runtime/environment differences and advanced material', () => {
  assert.match(more.buildMoreUserMessage('q', ['a', 'b', 'c']), /environment/i);
});

// ── Candidate voice (user feedback 2026-09-30) ──
// More text is read aloud as the candidate's own answer. Meta-commentary about
// the interview ("the most important detail interviewers ask about is...",
// "worth mentioning", "it is important to understand") must never appear.
test('More speaks in the candidate\'s own voice, no meta-commentary about the interview', () => {
  const sys = more.MORE_SYSTEM_PROMPT;
  assert.match(sys, /candidate's own voice/i);
  assert.match(sys, /never talk about the interview/i);
});

// ── Format drift seen in a live interview (2026-10-12) ──
// The global no-dash law turned the header into "More 1, Shallow vs. Deep
// Copying", and the text opened with "it is important to remember".
test('the header dash is exempt from the no-dash rule', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /header.*em dash.*exception|em dash.*header.*exception/is);
});


test('normalizeMoreHeader restores the em dash whatever separator the model used', () => {
  for (const sep of [', ', ': ', ' - ', ' – ', ' — ', '. ']) {
    assert.equal(
      more.normalizeMoreHeader(`**More 1${sep}Shallow vs. Deep Copying**\n\nBody text.`),
      '**More 1 — Shallow vs. Deep Copying**\n\nBody text.',
      `separator ${JSON.stringify(sep)} not normalized`,
    );
  }
});

test('normalizeMoreHeader bolds an unbolded header line and tolerates leading blanks', () => {
  assert.equal(
    more.normalizeMoreHeader('\n More 2: Microtask Starvation\nBody.'),
    '**More 2 — Microtask Starvation**\nBody.',
  );
});

test('normalizeMoreHeader leaves non-header text and later "More" lines alone', () => {
  const plain = 'There is nothing substantive left to add.';
  assert.equal(more.normalizeMoreHeader(plain), plain);
  const body = '**More 1 — Theme**\n\nMore 3, people say, is fine here.';
  assert.equal(more.normalizeMoreHeader(body), body);
});

// Live check 2026-10-12: "it is important to recognize that" slipped past the
// phrase list, and the text addressed the listener ("you use", "allows you").

test('never addresses the listener as "you"', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /never address the listener as "you"/i);
});

// External review 2026-10-12: More answers were the hardest to say aloud
// ("The primary technical distinction lies in...") and re-explained the base
// answer's mechanism instead of adding one new point.
test('More uses the same plain spoken English as the main answer', () => {
  const sys = more.MORE_SYSTEM_PROMPT;
  assert.match(sys, /plain spoken English/i);
  assert.match(sys, /short sentences/i);
  assert.match(sys, /simplify the wording, never the technical content/i);
});

test('More opens with the new point and never re-explains the base mechanism', () => {
  assert.match(more.MORE_SYSTEM_PROMPT, /never re-explain/i);
});

test('More allows labeled hypothetical experience examples consistent with the previous one', () => {
  const sys = more.MORE_SYSTEM_PROMPT;
  assert.match(sys, /Hypothetical experience examples are allowed for practice/);
  assert.match(sys, /consistent with the previous example/);
  assert.match(sys, /Example to adapt/);
  assert.ok(!/Never invent the candidate's experience/i.test(sys), 'More still bans experience examples');
});

// Second external review 2026-10-12: More invented a first-person narrative
// ("When I think about how these scopes are stored, I look at..."), said
// "I always", opened with "The primary distinction in practice", and stated
// that a closure keeps "the whole environment" alive as a universal fact.
test('More no longer invites first person everywhere', () => {
  assert.ok(!/first person where natural/i.test(more.MORE_SYSTEM_PROMPT));
});



test('the prompt\'s own voice sample does not address the listener as "you"', () => {
  assert.ok(!/If you call reduce/.test(more.MORE_SYSTEM_PROMPT), 'voice sample uses "you"');
});

// ── Compact More (external review 3, 2026-10-12) ──
// One new point, 1-2 paragraphs, no re-definition; a short reminder only when
// the new point needs it. Principles instead of long ban lists.
test('More adds ONE new point; a short reminder only when the point needs it', () => {
  const sys = more.MORE_SYSTEM_PROMPT;
  assert.match(sys, /ONE new point/);
  assert.match(sys, /short reminder is fine only when/i);
});

test('More instructions stay compact (no long ban lists)', () => {
  const words = more.MORE_SYSTEM_PROMPT.split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 450, `More prompt grew to ${words} words`);
  for (const old of ['Найважливішою', 'The primary technical distinction', 'A common pitfall is', 'When I think about']) {
    assert.ok(!more.MORE_SYSTEM_PROMPT.includes(old), `long ban-list entry still present: ${old}`);
  }
});
