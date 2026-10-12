// "More" quick action (2026-09-30): deepen the last question with ONLY material
// that none of the already-shown answers contain. Each press passes every
// answer shown so far (base answer + earlier Mores), so repeated presses keep
// going deeper instead of circling back.

export const MORE_INTENT = 'more';

export const MORE_SYSTEM_PROMPT = `You help a candidate in a technical interview. They already have one or more answers to a question and pressed "More" to go deeper.

Task: add ONE new point about the same question that none of the shown answers contain. Choose by how likely an interviewer is to ask about it, most important first, not by how exotic it is; the MORE PRESS tier in the user message says how deep to go. That point is exactly ONE theme. Never repeat a fact, example, or code sample already shown, and never re-explain the earlier answers or re-define the topic. A short reminder is fine only when the new point makes no sense without it. If nothing substantive is left, say so in one short sentence.

Format: the first line is the header **More <N> — <Theme in English>**, exactly as given in the user message with a short English theme name. Its em dash is the one exception to any no-dash rule elsewhere. Then 1-2 short paragraphs of speakable sentences, about 90-160 words. Apart from the header: no headings and no bold section labels. A tiny code example (at most 4 lines, with its output) only when the code is the point.

Style: the same as the main answer. Plain spoken English at about B2 level, natural when read aloud: short sentences, simple words, contractions. Simplify the wording, never the technical content: keep concrete API names and precise terms. Start straight with the new point. No filler and no repetition.

Voice: the candidate's own voice. Never talk about the interview or interviewers. Never address the listener as "you"; state facts impersonally, and use "I" only for real practice. Hypothetical experience examples are allowed for practice. Keep them consistent with the previous example and mark them as "Example to adapt" outside the spoken text.

Accuracy: for execution order, state only the order guaranteed by the specification, and say so when it depends on the environment. Never invent internal engine names or steps. If you are not certain a detail is correct, leave it out.

Language: write everything except the English theme name in the header in the response language set by the LANGUAGE instruction of this prompt (the user's settings). Code, API names, and identifiers stay as written in code.`;

// The model sometimes swaps the header's em dash for a comma or colon (the
// global no-dash law wins over the header instruction), e.g.
// "**More 1, Shallow vs. Deep Copying**". Only the first non-blank line is
// rewritten, so a later sentence starting with "More" is never touched.
const MORE_HEADER_RE = /^\s*(?:\*\*)?More\s+(\d+)\s*(?:[,:.\-–—]\s*)+(.+?)\s*(?:\*\*)?\s*$/;

/** Restore the canonical `**More N — Theme**` header line. */
export function normalizeMoreHeader(text: string): string {
    const lead = text.match(/^\s*/)?.[0] ?? '';
    const rest = text.slice(lead.length);
    const nl = rest.indexOf('\n');
    const first = nl === -1 ? rest : rest.slice(0, nl);
    const m = first.match(MORE_HEADER_RE);
    if (!m) return text;
    return `**More ${m[1]} — ${m[2]}**${nl === -1 ? '' : rest.slice(nl)}`;
}

/**
 * The question More deepens: the typed question, else the question the base
 * answer was generated for, else (last resort) the latest interviewer turn.
 * A newer interviewer question must not hijack More on an older answer.
 */
export function resolveMoreQuestion(
    typedQuestion: string | null | undefined,
    answeredQuestion: string | null | undefined,
    latestInterviewerTurn: string | null | undefined,
): string | null {
    for (const q of [typedQuestion, answeredQuestion, latestInterviewerTurn]) {
        if (typeof q === 'string' && q.trim()) return q.trim();
    }
    return null;
}

/** Interview-importance tier for the Nth More press (1 = first press). */
function moreTier(press: number): string {
    if (press <= 1) return 'Tier: the follow-up theme asked in most interviews right after the main answer (the core mechanism the main answer only touched).';
    if (press === 2) return 'Tier: practical impact commonly asked at middle/senior level (performance, blocking, pitfalls, real-world usage).';
    return 'Tier: rarer, advanced material asked when the interviewer digs deeper (runtime and environment differences such as browser vs Node.js, specification details).';
}

export function buildMoreUserMessage(question: string | null, previousAnswers: readonly string[]): string {
    const q = question && question.trim()
        ? `QUESTION:\n${question.trim()}`
        : 'QUESTION: (not captured — infer the question from the answers below)';
    const answers = previousAnswers
        .map((a, i) => `ANSWER ${i + 1} (already shown):\n${a.trim()}`)
        .join('\n\n');
    const press = previousAnswers.length;
    return `${q}\n\n${answers}\n\nMORE PRESS: ${press}. ${moreTier(press)}\nHEADER: **More ${press} — <Theme in English>**\n\nTASK: Add only what none of the answers above already cover, most important first.`;
}
