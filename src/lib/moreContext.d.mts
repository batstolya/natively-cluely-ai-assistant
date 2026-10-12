export interface MoreContextMessage {
  role: string;
  text: string;
  intent?: string;
  isStreaming?: boolean;
  isQuickActionLabel?: boolean;
}

export interface MoreContext {
  question: string | null;
  previousAnswers: string[];
}

export function collectMoreContext(messages: ReadonlyArray<MoreContextMessage>): MoreContext | null;
