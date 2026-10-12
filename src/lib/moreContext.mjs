// "More" quick action context: the question being deepened and every answer
// already shown for it (the base answer plus each earlier More, oldest first),
// so each press asks the model only for what none of them covered.

const MORE_INTENT = 'more';

const isFinishedAnswer = (m) =>
  m.role === 'system' && Boolean(m.intent) && !m.isStreaming && Boolean(m.text && m.text.trim());

/**
 * @param {ReadonlyArray<{role: string, text: string, intent?: string, isStreaming?: boolean, isQuickActionLabel?: boolean}>} messages
 * @returns {{question: string | null, previousAnswers: string[]} | null}
 */
export function collectMoreContext(messages) {
  const previousAnswers = [];
  let i = messages.length - 1;

  // Walk back over the More chain until the base (non-More) answer.
  for (; i >= 0; i--) {
    const m = messages[i];
    if (!isFinishedAnswer(m)) continue;
    previousAnswers.unshift(m.text);
    if (m.intent !== MORE_INTENT) break;
  }
  if (previousAnswers.length === 0 || i < 0) return null;

  // The typed question right before the base answer. A quick-action label is
  // not a question (the engine resolves those from the transcript), and an
  // older answer means this one had no typed question of its own.
  let question = null;
  for (let j = i - 1; j >= 0; j--) {
    const m = messages[j];
    if (isFinishedAnswer(m)) break;
    if (m.role === 'user' && !m.isQuickActionLabel && m.text && m.text.trim()) {
      question = m.text.trim();
      break;
    }
  }
  return { question, previousAnswers };
}
