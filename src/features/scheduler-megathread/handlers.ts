import { context, reddit } from '@devvit/web/server';
import type { T3 } from '@devvit/web/shared';
import {
  getWeeklyMegathreadSettings,
  type WeeklyMegathreadSettings,
} from './settings.js';
import { getIsoWeekKey } from './date.js';
import {
  acquireWeekCreationLock,
  getLastCreatedWeek,
  releaseWeekCreationLock,
  setLastCreatedPostId,
  setLastCreatedWeek,
} from './storage.js';

type SchedulerResult =
  | { created: true; postId: T3 }
  | { created: false; reason: string };

type ManualMegathreadResult = {
  success: boolean;
  message: string;
};

export type PostNowFormValues = {
  title?: string;
  body?: string;
};

async function createMegathreadPost(
  megathreadSettings: WeeklyMegathreadSettings
): Promise<T3> {
  // Resolve current subreddit context where app is installed.
  const subreddit = await reddit.getCurrentSubreddit();
  // Submit post as app account to keep automation behavior predictable.
  try {
    const post = await reddit.submitPost({
      subredditName: subreddit.name,
      title: megathreadSettings.title,
      text: megathreadSettings.body,
      runAs: 'APP',
    });

    return post.id;
  } catch (error) {
    console.error(
      `[scheduler-megathread] Failed to submit post to r/${subreddit.name}`,
      error
    );
    throw error;
  }
}

async function canCurrentUserCreatePost(): Promise<string | undefined> {
  const currentUser = await reddit.getCurrentUser();
  const subreddit = await reddit.getCurrentSubreddit();
  if (!currentUser) return 'Unable to identify current user.';

  const modPermissions = await currentUser.getModPermissionsForSubreddit(
    subreddit.name
  );
  const canManagePosts =
    modPermissions.includes('all') || modPermissions.includes('posts');
  return canManagePosts
    ? undefined
    : 'You need mod post permissions to create a post.';
}

export async function runWeeklyMegathreadCheck(): Promise<SchedulerResult> {
  // Read fresh settings each scheduler run.
  const megathreadSettings = await getWeeklyMegathreadSettings();
  if (!megathreadSettings.enabled) {
    return { created: false, reason: 'feature-disabled' };
  }

  const now = new Date();
  // Idempotency: one auto-created megathread per ISO week.
  const weekKey = getIsoWeekKey(now);
  const lastCreatedWeek = await getLastCreatedWeek(context.subredditId);
  if (lastCreatedWeek === weekKey) {
    return { created: false, reason: 'already-created-this-week' };
  }

  // Prevent duplicate scheduled posts when jobs overlap/retry at the same time.
  const lockAcquired = await acquireWeekCreationLock(
    context.subredditId,
    weekKey
  );
  if (!lockAcquired) {
    return { created: false, reason: 'creation-lock-not-acquired' };
  }

  try {
    // Create and persist markers on success.
    const postId = await createMegathreadPost(megathreadSettings);
    await setLastCreatedWeek(context.subredditId, weekKey);
    await setLastCreatedPostId(context.subredditId, postId);

    return { created: true, postId };
  } catch (error) {
    // Unlock on failure so the next scheduler tick can retry.
    await releaseWeekCreationLock(context.subredditId, weekKey);
    throw error;
  }
}

export async function createWeeklyMegathreadManual(): Promise<ManualMegathreadResult> {
  // Manual menu action still respects feature toggle.
  const megathreadSettings = await getWeeklyMegathreadSettings();
  if (!megathreadSettings.enabled) {
    return {
      success: false,
      message: 'Weekly megathread feature is disabled in install settings.',
    };
  }

  // Explicit permission check keeps endpoint safe even if menu exposure changes.
  const permissionError = await canCurrentUserCreatePost();
  if (permissionError) {
    return {
      success: false,
      message: permissionError,
    };
  }

  // Manual path intentionally bypasses weekly idempotency for testing/override.
  try {
    const postId = await createMegathreadPost(megathreadSettings);
    return {
      success: true,
      message: `Weekly megathread created successfully (${postId}).`,
    };
  } catch {
    return {
      success: false,
      message: 'Unable to create the weekly megathread. Check the app logs.',
    };
  }
}

export async function createPostNow(
  values: PostNowFormValues
): Promise<ManualMegathreadResult> {
  const title = values.title?.trim() ?? '';
  const body = values.body?.trim() ?? '';
  if (!title || !body) {
    return { success: false, message: 'Title and body are required.' };
  }

  const permissionError = await canCurrentUserCreatePost();
  if (permissionError) {
    return { success: false, message: permissionError };
  }

  try {
    const postId = await createMegathreadPost({
      enabled: true,
      title,
      body,
    });
    return { success: true, message: `Post created successfully (${postId}).` };
  } catch {
    return {
      success: false,
      message: 'Unable to create the post. Check the app logs.',
    };
  }
}
