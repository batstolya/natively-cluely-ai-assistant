// src/lib/__tests__/OverlayNoCodeWiden2026_09_30.test.mjs
//
// User decision 2026-09-30: the overlay keeps its text width when an answer
// contains code. Code cards scroll horizontally inside the panel instead of
// widening the shell. Both widening triggers (eager first-fence token and the
// scroll-visibility scanner) are gated on AUTO_WIDEN_FOR_CODE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTO_WIDEN_FOR_CODE } from '../overlayCodeExpansion.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ui = fs.readFileSync(path.resolve(dirname, '../../components/NativelyInterface.tsx'), 'utf8');

test('code answers do not widen the overlay', () => {
  assert.equal(AUTO_WIDEN_FOR_CODE, false);
});

test('the eager first-fence expansion is gated on AUTO_WIDEN_FOR_CODE', () => {
  assert.match(ui, /if \(AUTO_WIDEN_FOR_CODE && shouldEagerExpandForCodeToken\(/);
});

test('the visibility scanner never targets the expanded width when widening is off', () => {
  const start = ui.indexOf('const checkCodeVisibility = useCallback(');
  const body = ui.slice(start, ui.indexOf('}, [startTransition', start));
  assert.match(body, /if \(!AUTO_WIDEN_FOR_CODE\) visible = false;/);
});
