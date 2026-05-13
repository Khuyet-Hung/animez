export type SocialTextModerationField = "caption" | "description" | "body" | "text";
export type SocialTextModerationReason = "adult" | "hate" | "profanity" | "spam";

export interface SocialTextModerationViolation {
  field: SocialTextModerationField;
  reason: SocialTextModerationReason;
}

export type SocialTextModerationResult =
  | {
      ok: true;
      violations: [];
    }
  | {
      ok: false;
      violations: SocialTextModerationViolation[];
    };

interface ModerationTextInput {
  field: SocialTextModerationField;
  text: string;
}

const COLLAPSIBLE_CHARACTER_PATTERN = /([a-z0-9])\1{2,}/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const SHORTENER_PATTERN = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|cutt\.ly|s\.id)\b/i;

const BLOCKED_PHRASES: Record<SocialTextModerationReason, string[]> = {
  adult: [
    "ban dam",
    "clip nong",
    "gai goi",
    "hiep dam",
    "khieu dam",
    "mai dam",
    "phim sex",
    "porn",
    "sex",
  ],
  hate: [
    "chet het di",
    "diet chung",
    "diet het",
    "do benh hoan",
    "do khuyet tat",
    "do moi",
    "rac ruoi xa hoi",
    "thu ha dang",
  ],
  profanity: [
    "con cac",
    "dit me",
    "do mat day",
    "do ngu",
    "do suc vat",
    "me kiep",
    "thang cho",
    "thang ngu",
  ],
  spam: [
    "ban acc",
    "casino",
    "cho vay",
    "kiem tien online",
    "khuyen mai soc",
    "nhan qua mien phi",
    "telegram",
  ],
};

const PASS_RESULT: SocialTextModerationResult = {
  ok: true,
  violations: [],
};

function normalizeModerationText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9./:@\s-]/g, " ")
    .replace(COLLAPSIBLE_CHARACTER_PATTERN, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

function includesBlockedPhrase(normalizedText: string, phrase: string) {
  const normalizedPhrase = normalizeModerationText(phrase);
  if (!normalizedPhrase) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}(?=\\s|$)`, "i");
  return pattern.test(normalizedText);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findViolation(input: ModerationTextInput): SocialTextModerationViolation | null {
  const normalizedText = normalizeModerationText(input.text);
  if (!normalizedText) return null;

  const urlMatches = input.text.match(URL_PATTERN) ?? [];
  if (urlMatches.length >= 2 || SHORTENER_PATTERN.test(input.text)) {
    return { field: input.field, reason: "spam" };
  }

  for (const reason of Object.keys(BLOCKED_PHRASES) as SocialTextModerationReason[]) {
    if (BLOCKED_PHRASES[reason].some((phrase) => includesBlockedPhrase(normalizedText, phrase))) {
      return { field: input.field, reason };
    }
  }

  return null;
}

export function moderateSocialText(
  text: string,
  field: SocialTextModerationField = "text"
): SocialTextModerationResult {
  const violation = findViolation({ field, text });

  if (!violation) return PASS_RESULT;

  return {
    ok: false,
    violations: [violation],
  };
}

export function moderateSocialPostText(input: {
  caption: string;
  description: string;
}): SocialTextModerationResult {
  const violations = [
    findViolation({ field: "caption", text: input.caption }),
    findViolation({ field: "description", text: input.description }),
  ].filter((violation): violation is SocialTextModerationViolation => Boolean(violation));

  if (violations.length === 0) return PASS_RESULT;

  return {
    ok: false,
    violations,
  };
}
