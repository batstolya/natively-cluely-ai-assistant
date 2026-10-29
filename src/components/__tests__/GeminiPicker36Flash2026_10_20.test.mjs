// gemini-3.6-flash is offered in the Gemini model picker.
//
// Measured on 2026-10-20 against the real "What to answer?" request: with
// MINIMAL thinking (LLMHelper MINIMAL_THINKING_MODELS) it starts answering in
// ~1.3s with ~80% fact coverage, vs ~2.6s / ~76% for gemini-3.8-flash at LOW.
// The picker zips ids and names positionally, so both must carry it at the
// same index, and adding it must not shift the existing rows' labels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD_CLOUD_MODELS } from '../../utils/modelUtils.ts';

const gemini = STANDARD_CLOUD_MODELS.gemini;

test('the Gemini picker offers gemini-3.6-flash with its own label', () => {
    const i = gemini.ids.indexOf('gemini-3.6-flash');
    assert.notEqual(i, -1, 'gemini-3.6-flash missing from the picker');
    assert.equal(gemini.names[i], 'Gemini 3.6 Flash');
});

test('existing Gemini rows keep their ids, labels and descriptions', () => {
    assert.deepEqual(gemini.ids.slice(0, 3), ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']);
    assert.deepEqual(gemini.names.slice(0, 3), ['Gemini 3.8 Flash', 'Gemini 3.1 Flash Lite', 'Gemini 3.1 Pro']);
    assert.deepEqual(gemini.descs.slice(0, 2), ['Fastest • Multimodal', 'Reasoning • High Quality']);
    assert.equal(gemini.ids.length, gemini.names.length, 'ids and names must stay zipped');
});
