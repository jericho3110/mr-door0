import { settings } from '@devvit/web/server';
import type { Form } from '@devvit/web/shared';
import {
  DEFAULT_POST_BODY,
  DEFAULT_POST_TITLE,
} from './settings.js';

export async function buildPostNowForm(): Promise<Form> {
  const title = (await settings.get<string>('weeklyMegathreadTitle'))?.trim();
  const body = (await settings.get<string>('weeklyMegathreadBody'))?.trim();

  return {
    fields: [
      {
        name: 'title',
        label: 'Post title',
        type: 'string',
        required: true,
        defaultValue: title || DEFAULT_POST_TITLE,
      },
      {
        name: 'body',
        label: 'Post body',
        type: 'paragraph',
        required: true,
        defaultValue: body || DEFAULT_POST_BODY,
      },
    ],
    title: 'Post now',
    acceptLabel: 'Publish post',
    cancelLabel: 'Cancel',
  };
}