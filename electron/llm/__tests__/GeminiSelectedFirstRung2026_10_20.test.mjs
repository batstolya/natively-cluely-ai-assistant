// The selected Gemini model leads the TEXT cascade when it is one we probed for
// the interactive path.
//
// Captured on the wire 2026-10-20 ("What to answer?", NATIVELY_PROMPT_DEBUG=1):
// with "Gemini 3.6 Flash" selected the request went to gemini-3.1-flash-lite.
// The ladder is flash-lite → flash → pro and the selection only picked a start
// rung for 3.8 Flash and 3.1 Pro, so every other pick started at flash-lite.
// gemini-3.6-flash (MINIMAL thinking, probed live) now leads, and the ladder
// stays behind it as the fallback. Real cascade, stubbed model streams, real
// timers — same harness as GeminiTextCascadeTtft2026_09_26.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { LLMHelper, GEMINI_TEXT_TTFT_MS } = require(path.resolve(__dirname, '../../../dist-electron/electron/LLMHelper.js'));

function cascadeHelper(firstTokenMsByModel, currentModelId) {
  const h = Object.create(LLMHelper.prototype);
  const calls = [];
  Object.assign(h, {
    client: {}, currentModelId, textHealth: new Map(),
    async *streamWithGeminiModel(_msg, model, _imgs, _sys, signal, thinkingBudget) {
      calls.push({ model, thinkingBudget });
      const wait = firstTokenMsByModel[model] ?? 50;
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, wait);
        signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
      });
      yield `answer from ${model}`;
    },
  });
  return { h, calls };
}

async function collect(gen) { let out = ''; for await (const c of gen) out += c; return out; }

test('selected gemini-3.6-flash answers first — not gemini-3.1-flash-lite', async () => {
  const { h, calls } = cascadeHelper({}, 'gemini-3.6-flash');
  const out = await collect(h.streamGeminiTextCascade('q', undefined, 'sys', undefined, 0));
  assert.match(out, /answer from gemini-3\.6-flash/);
  assert.deepEqual(calls.map((c) => c.model), ['gemini-3.6-flash'], 'one call to the selected model');
  assert.equal(calls[0].thinkingBudget, 0, 'the interactive budget rides through (MINIMAL for 3.6 Flash)');
});

test('a stalled gemini-3.6-flash falls back to the ladder, flash-lite first', async () => {
  const { h, calls } = cascadeHelper({ 'gemini-3.6-flash': GEMINI_TEXT_TTFT_MS.flash + 1000 }, 'gemini-3.6-flash');
  const out = await collect(h.streamGeminiTextCascade('q', undefined, 'sys', undefined, 0));
  assert.match(out, /answer from gemini-3\.1-flash-lite/);
  // The engine retries a timed-out rung once before moving on (see
  // GeminiTextCascadeTtft2026_09_26); the next model after it is flash-lite.
  const models = calls.map((c) => c.model);
  assert.equal(models[0], 'gemini-3.6-flash');
  assert.equal(models.find((m) => m !== 'gemini-3.6-flash'), 'gemini-3.1-flash-lite');
});

test('the selection still leads once a faster flash-lite has been measured', async () => {
  const { h, calls } = cascadeHelper({}, 'gemini-3.6-flash');
  h.textHealth.set('gemini_flash_lite', { openUntil: 0, consecutiveFails: 0, ttftEma: 500 });
  h.textHealth.set('gemini_selected:gemini-3.6-flash', { openUntil: 0, consecutiveFails: 0, ttftEma: 1300 });
  const out = await collect(h.streamGeminiTextCascade('q', undefined, 'sys', undefined, 0));
  assert.match(out, /answer from gemini-3\.6-flash/);
  assert.equal(calls[0].model, 'gemini-3.6-flash');
});

test('a selection cooling down after a failure waits behind the ladder', async () => {
  const { h, calls } = cascadeHelper({}, 'gemini-3.6-flash');
  h.textHealth.set('gemini_selected:gemini-3.6-flash', { openUntil: Date.now() + 60_000, consecutiveFails: 1, ttftEma: null });
  const out = await collect(h.streamGeminiTextCascade('q', undefined, 'sys', undefined, 0));
  assert.match(out, /answer from gemini-3\.1-flash-lite/);
  assert.equal(calls[0].model, 'gemini-3.1-flash-lite');
});

test('the other picks keep their start rung', async () => {
  for (const [selected, first] of [
    ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite'],
    ['gemini-3.8-flash', 'gemini-3.8-flash'],
    ['gemini-3.1-pro-preview', 'gemini-3.1-pro-preview'],
    // Not probed for the interactive path: unchanged, the ladder starts at flash-lite.
    ['gemini-2.5-flash', 'gemini-3.1-flash-lite'],
    ['gemini-3.7-flash', 'gemini-3.1-flash-lite'],
  ]) {
    const { h, calls } = cascadeHelper({}, selected);
    await collect(h.streamGeminiTextCascade('q', undefined, 'sys', undefined, 0));
    assert.equal(calls[0].model, first, `${selected} should start at ${first}`);
  }
});
