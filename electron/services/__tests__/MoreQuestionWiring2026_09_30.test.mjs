// electron/services/__tests__/MoreQuestionWiring2026_09_30.test.mjs
//
// Source wiring (repo pattern): the WTA path records the question each stored
// answer was generated for, and runMore resolves its question through
// resolveMoreQuestion with that record ahead of the latest interviewer turn.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(dirname, '../../IntelligenceEngine.ts'), 'utf8');

test('WTA records the answered question right where it stores the answer', () => {
  const store = src.indexOf("this.session.addAssistantMessage(finalWtaAnswer, wtaWriteDecision, 'what_to_answer');");
  assert.ok(store > 0, 'WTA store site moved');
  const near = src.slice(store - 600, store + 600);
  assert.match(near, /this\.lastAnsweredWtaQuestion = /);
});

test('runMore resolves the question via resolveMoreQuestion with the recorded WTA question', () => {
  const start = src.indexOf('async runMore(');
  const body = src.slice(start, src.indexOf('\n    }\n', start));
  assert.match(body, /resolveMoreQuestion\(\s*question,\s*this\.lastAnsweredWtaQuestion,\s*this\.session\.getLastInterviewerTurn\(\)\s*\)/);
});

test('runMore stores and emits the header-normalized text', () => {
  const start = src.indexOf('async runMore(');
  const body = src.slice(start, src.indexOf('\n    }\n', start));
  assert.match(body, /normalizeMoreHeader\(full\)/);
  const norm = body.indexOf('normalizeMoreHeader(full)');
  assert.ok(norm < body.indexOf("this.session.addAssistantMessage(full"), 'normalize before storing');
});

// Captured live (2026-10-12 prompt dump): More's request carried the legacy
// General mode template ("## ACTIVE MODE", ~7.3k chars) AFTER the More prompt,
// because runMore did not pass skipModeInjection. WTA already passes it.
test('runMore skips the legacy mode-template injection', () => {
  const start = src.indexOf('async runMore(');
  const body = src.slice(start, src.indexOf('\n    }\n', start));
  const call = body.slice(body.indexOf('this.llmHelper.streamChat('), body.indexOf(');', body.indexOf('this.llmHelper.streamChat(')));
  assert.match(call, /MORE_SYSTEM_PROMPT,\s*true,[^,]*\n\s*true,/, 'streamChat must get ignoreKnowledgeMode=true and skipModeInjection=true');
});
