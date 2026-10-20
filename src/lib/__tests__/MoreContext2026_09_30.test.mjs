// src/lib/__tests__/MoreContext2026_09_30.test.mjs
//
// "More" quick action: the renderer hands the engine the question being
// deepened plus EVERY answer already shown for it (the base answer and each
// earlier More), so each press adds only what none of them covered.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectMoreContext } from '../moreContext.mjs';

const user = (text, extra = {}) => ({ id: text, role: 'user', text, ...extra });
const answer = (text, intent = 'what_to_answer', extra = {}) => ({ id: text, role: 'system', text, intent, ...extra });

test('typed question + base answer → question and one previous answer', () => {
  const ctx = collectMoreContext([user('what is event loop'), answer('EL answer')]);
  assert.deepEqual(ctx, { question: 'what is event loop', previousAnswers: ['EL answer'] });
});

test('earlier More answers are included in order, so each press goes deeper', () => {
  const ctx = collectMoreContext([
    user('what is event loop'),
    answer('EL answer'),
    user('More', { isQuickActionLabel: true }),
    answer('more #1', 'more'),
    user('More', { isQuickActionLabel: true }),
    answer('more #2', 'more'),
  ]);
  assert.deepEqual(ctx.previousAnswers, ['EL answer', 'more #1', 'more #2']);
  assert.equal(ctx.question, 'what is event loop');
});

test('button-triggered answer (quick-action label, no typed text) → question null for the engine to resolve', () => {
  const ctx = collectMoreContext([
    user('What should I say?', { isQuickActionLabel: true }),
    answer('WTA answer'),
  ]);
  assert.deepEqual(ctx, { question: null, previousAnswers: ['WTA answer'] });
});

test('stops at the previous answer: an older question is never reused for a newer answer', () => {
  const ctx = collectMoreContext([
    user('what is closure'),
    answer('closure answer'),
    user('What should I say?', { isQuickActionLabel: true }),
    answer('WTA answer'),
  ]);
  assert.deepEqual(ctx, { question: null, previousAnswers: ['WTA answer'] });
});

test('streaming, empty, and intent-less system notices are not answers', () => {
  const ctx = collectMoreContext([
    user('what is closure'),
    answer('closure answer'),
    { id: 'n', role: 'system', text: 'Still finishing the previous answer — one moment…' },
    answer('', 'more'),
    answer('partial', 'more', { isStreaming: true }),
  ]);
  assert.deepEqual(ctx, { question: 'what is closure', previousAnswers: ['closure answer'] });
});

test('no answer yet → null', () => {
  assert.equal(collectMoreContext([]), null);
  assert.equal(collectMoreContext([user('hello')]), null);
});
