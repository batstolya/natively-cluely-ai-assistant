// "What to answer?" in the typed-chat cheat-sheet layout (2026-09-30).
//
// The button used to produce a spoken 40-60 word answer. It now renders the
// same <chat_layout> as the typed chat panel (Good interview answer first,
// labeled sections, Example last) for every non-coding turn. Coding turns keep
// the coding contract, the spoken length default, and the existing cleanup.

export interface WtaTurn {
    codingTurn: boolean;
}

/** v2 composition input for the WTA persona prompt. */
export function resolveWtaPersonaV2Input({ codingTurn }: WtaTurn): { action: 'answer'; chatSurface: boolean } {
    return { action: 'answer', chatSurface: !codingTurn };
}

/** The spoken 40-60 word length default would fight the 120-180 word layout. */
export function wtaUsesSpokenLengthDefault({ codingTurn }: WtaTurn): boolean {
    return codingTurn;
}

/** Scaffold/bold-label flattening into speakable prose destroys the layout. */
export function wtaFlattensStructure({ codingTurn }: WtaTurn): boolean {
    return codingTurn;
}
