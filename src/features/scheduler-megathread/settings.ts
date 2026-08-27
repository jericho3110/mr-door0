import { settings } from '@devvit/web/server';
import type {
  SettingsValidationRequest,
  SettingsValidationResponse,
} from '@devvit/web/shared';

// Edit these defaults to change what both scheduled and manual posts publish.
export const DEFAULT_POST_TITLE = 'Weekly Episode Discussion Thread';
export const DEFAULT_POST_BODY =
  "Welcome to this week's TV discussion thread.\n\nPlease keep spoilers hidden using Reddit spoiler syntax: `>!spoiler text!<` (example: >!the ending reveal!<).\n\nShare your theories, reactions, and favorite moments below.";
const MAX_TITLE_LENGTH = 300;
// Reddit text post bodies support up to 40,000 characters.
const MAX_BODY_LENGTH = 40000;

export type WeeklyMegathreadSettings = {
  title: string;
  body: string;
};

function toSettingString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

export async function getWeeklyMegathreadSettings(): Promise<WeeklyMegathreadSettings> {
  // Read all install settings needed for weekly posting.
  const configuredTitle = toSettingString(
    await settings.get<string>('weeklyMegathreadTitle')
  )?.trim();
  const configuredBody = toSettingString(
    await settings.get<string>('weeklyMegathreadBody')
  )?.trim();

  return {
    // Use defaults if setting is blank or undefined.
    title: configuredTitle || DEFAULT_POST_TITLE,
    body: configuredBody || DEFAULT_POST_BODY,
  };
}

export function validateWeeklyMegathreadTitle(
  request: SettingsValidationRequest<string>
): SettingsValidationResponse {
  // Trim so whitespace-only values are rejected.
  const title = request.value?.trim() ?? '';
  if (title.length === 0) {
    return {
      success: false,
      error: 'Post title cannot be empty.',
    };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return {
      success: false,
      error: `Post title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    };
  }

  // Validation passed.
  return { success: true };
}

export function validateWeeklyMegathreadBody(
  request: SettingsValidationRequest<string>
): SettingsValidationResponse {
  // Trim so whitespace-only values are rejected.
  const body = request.value?.trim() ?? '';
  if (body.length === 0) {
    return {
      success: false,
      error: 'Post body cannot be empty.',
    };
  }

  if (body.length > MAX_BODY_LENGTH) {
    return {
      success: false,
      error: `Post body must be ${MAX_BODY_LENGTH} characters or fewer.`,
    };
  }

  // Validation passed.
  return { success: true };
}
