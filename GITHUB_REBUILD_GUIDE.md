# Rebuilding the mr-door0 Devvit App

This guide explains how to recreate this app as a new Devvit app if the original app is removed, banned, or needs to be replaced.

The app is a Reddit moderator tool. Its main posting feature lets a subreddit moderator:

- Open the subreddit moderator menu and choose **Post now**.
- Enter a title and body in a form.
- Publish a text post to the subreddit where the app is installed.
- Run an automatic weekly post every Monday at 00:00 UTC.

The repository also contains template features for moderation, keyword votes, banned words, and flair updates. Review those features before publishing a replacement app. Remove or disable anything that is not wanted.

## Important Data Rule

Create a **new Devvit app identity** for a replacement app. Do not install the replacement by pretending it is the old app, and do not change the old app's code or settings while migrating.

The Redis keys used by this code include the subreddit ID and feature-specific prefixes such as:

- `weeklyMegathread:lastCreatedWeek:<subredditId>`
- `weeklyMegathread:lastPostId:<subredditId>`
- `weeklyMegathread:weekLock:<subredditId>:<week>`

A newly created Devvit app has a different app/installation identity, so it gets separate app data. The replacement starts with fresh Redis data and will not overwrite the original app's stored counters, post IDs, or weekly deduplication marker.

Do not copy old Redis keys into the new app unless an intentional migration is designed and tested. The current app has no export/import migration command.

Existing Reddit posts are not copied or deleted. They remain in the subreddit under the original app account.

## Before Rebuilding

1. Clone or download this repository.
2. Make a backup of the repository, including `devvit.json`, `package.json`, `package-lock.json`, `src/`, and this guide.
3. Record the original app name, subreddit installations, current settings, and any important post IDs.
4. Decide which features should exist in the replacement.
5. Choose a new app name, for example `mr-door0-replacement`.

Do not reuse the original app name while the original app still exists. A new app name creates a separate Devvit app identity.

## Create the New Devvit App

Install Node.js and npm, then log in to Reddit through Devvit:

```bash
npm exec devvit -- login
```

Create a new app using the official Devvit tooling, or create it through the Developer Portal:

```bash
npm create devvit@latest
```

When prompted, choose a suitable TypeScript/Devvit template and give the replacement app a new name.

Copy the source code from this repository into the new project. Preserve the project structure unless the newly generated template uses a newer SDK structure that requires adaptation.

## Required Configuration Changes

Update the new project's `devvit.json`:

1. Change `name` to the new app name.
2. Keep the server entry pointing to the built server entry point.
3. Copy only the menu items, forms, triggers, scheduler, settings, and permissions that the replacement needs.
4. Keep `reddit` permission enabled because posting uses the Reddit API.
5. Keep `redis` enabled only if the copied features use Redis.
6. Replace any old app-specific URLs, names, descriptions, or subreddit references.

The current posting configuration includes:

```json
{
  "menu": {
    "items": [
      {
        "label": "Post now",
        "location": "subreddit",
        "forUserType": "moderator",
        "endpoint": "/internal/menu/post-now"
      }
    ]
  },
  "forms": {
    "postNow": "/internal/form/post-now-submit"
  },
  "scheduler": {
    "tasks": {
      "weeklyMegathreadCheck": {
        "endpoint": "/internal/scheduler/weekly-megathread-check",
        "cron": "0 0 * * 1"
      }
    }
  }
}
```

The cron expression means every Monday at midnight UTC. Change this one value if a different cadence is required.

## Posting Code Locations

The posting feature is split into these files:

- `src/features/scheduler-megathread/settings.ts`: default title/body and install-setting reads.
- `src/features/scheduler-megathread/menu.ts`: builds the **Post now** form.
- `src/features/scheduler-megathread/handlers.ts`: checks permissions and calls `reddit.submitPost`.
- `src/routes/menu.ts`: opens the form from the subreddit moderator menu.
- `src/routes/forms.ts`: receives the submitted title/body and publishes the post.
- `src/routes/scheduler.ts`: receives the scheduled task request.
- `src/features/scheduler-megathread/storage.ts`: stores weekly deduplication data in Redis.
- `src/index.ts`: mounts all HTTP route groups.

The core submission shape for SDK `0.14.1` is:

```ts
await reddit.submitPost({
  subredditName: subreddit.name,
  title,
  text: body,
  runAs: 'APP',
});
```

Check the new project's installed SDK declarations before copying this call if the SDK version has changed.

## Install Dependencies and Test Locally

From the replacement project directory:

```bash
npm install
npm run test
```

Test manually on a development subreddit:

```bash
npm run dev
```

Playtest installs a development version and keeps the local development server involved. This is for testing only; your computer must remain on while playtest is running.

Verify all of these:

- A moderator can see **Post now** in the subreddit menu.
- The form accepts a title and body.
- The post appears in the correct subreddit.
- A non-moderator cannot use the posting action.
- Empty title/body values are rejected.
- The scheduler is declared and does not create duplicate weekly posts.
- Existing features do not accidentally run if they were not intended to be copied.

## Upload a Replacement

After testing, upload a private version first:

```bash
npm run deploy
```

If the new project does not have the same script, use:

```bash
npm run test
npm exec devvit -- upload
```

Private uploads are for the app owner and eligible test subreddits. Install it on a test subreddit before inviting anyone else:

```bash
npm exec devvit -- install TEST_SUBREDDIT NEW_APP_NAME
```

Replace `TEST_SUBREDDIT` and `NEW_APP_NAME` with the real values. The subreddit must be one you moderate.

## Let Another Subreddit Use It

For a selected community, submit an unlisted app for review:

```bash
npm exec devvit -- publish
```

For a general-purpose app that should be discoverable in the App Directory, submit it publicly:

```bash
npm exec devvit -- publish --public
```

Publishing submits the app for Reddit review. It does not mean immediate approval. After approval, the moderator can install it from the app page or CLI:

```bash
npm exec devvit -- install THEIR_SUBREDDIT NEW_APP_NAME
```

The installing moderator must have the required moderator permissions. This app requires Reddit moderator API access because it creates posts and includes moderation features.

Apps generally need additional approval to be installed in communities with more than 200 members.

## Settings After Installation

Installation settings are declared in `devvit.json` under `settings.subreddit`. They appear in the Developer Portal and the installed app settings page.

For the posting feature, configure:

- **Enable weekly megathread scheduler**
- **Weekly megathread title**
- **Weekly megathread body**

These settings provide defaults for scheduled posts and prefill the **Post now** form. A moderator can edit the title and body in the form before publishing.

## Migration Safety Checklist

Before installing the replacement on a real subreddit:

- [ ] The replacement has a new app name and Devvit app identity.
- [ ] The original app remains installed or preserved until the replacement is verified.
- [ ] The replacement was tested on a separate test subreddit.
- [ ] The Reddit permissions were reviewed.
- [ ] The intended feature toggles were checked.
- [ ] The **Post now** menu action was tested.
- [ ] The weekly scheduler was checked for its intended cron time.
- [ ] No old Redis data was copied into the replacement.
- [ ] No existing Reddit posts were deleted.
- [ ] The replacement app was uploaded or published successfully.
- [ ] The new version was installed on the target subreddit.

## Day-to-Day Commands

Run commands from the replacement project's directory:

```bash
npm install                  # Install dependencies
npm run test                 # Type check, lint, unit tests, and build
npm run dev                  # Local Devvit playtest
npm run deploy               # Validate and upload a private version
npm exec devvit -- upload    # Upload without the deploy script
npm exec devvit -- publish   # Submit an unlisted version for review
npm exec devvit -- publish --public  # Submit for public App Directory listing
```

Once an uploaded or approved version is installed, Devvit hosts it. Your computer does not need to stay on. You only need the computer for development and future code updates.

## Troubleshooting

### The new menu item is missing

Confirm the updated version was uploaded, installed on the correct subreddit, and that the current user is a moderator. Refresh Reddit after installation.

### The old settings are still visible

The subreddit is probably using an older installed version. Upload the new version and update/reinstall the app. Existing saved installation settings may remain; review them manually.

### The scheduler does not post

Check that the scheduler setting is enabled, the app is installed, the cron time has passed in UTC, and the app logs show no Reddit API rejection. A successful scheduled post is recorded in Redis so another post is not created in the same ISO week.

### The app was banned or removed

Do not attempt to bypass a Reddit enforcement action. Review the reason, fix policy or permission problems, and contact Reddit through the appropriate official support or Devvit channel before creating a replacement.
