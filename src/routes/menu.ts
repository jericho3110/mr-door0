import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { buildNukeForm } from '../features/mop/menu.js';
import { buildPostNowForm } from '../features/scheduler-megathread/menu.js';

// Router for menu actions declared in devvit.json/menu.items.
export const menu = new Hono();

menu.post('/mop-comment', async (c) => {
  // Parse menu payload to access selected target id.
  const request = await c.req.json<MenuItemRequest>();
  console.log('request', request.targetId);
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'mopComment',
        form: buildNukeForm('Mop Comments', request.targetId),
      },
    },
    200
  );
});

menu.post('/mop-post', async (c) => {
  // Parse menu payload to access selected target id.
  const request = await c.req.json<MenuItemRequest>();
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'mopPost',
        form: buildNukeForm('Mop Post Comments', request.targetId),
      },
    },
    200
  );
});

menu.post('/post-now', async (c) => {
  await c.req.json<MenuItemRequest>();
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'postNow',
        form: await buildPostNowForm(),
      },
    },
    200
  );
});
