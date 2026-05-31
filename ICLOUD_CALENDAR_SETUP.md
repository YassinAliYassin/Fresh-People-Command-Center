# iCloud Calendar URL Regeneration Steps

When the iCloud calendar URL expires, follow these permanent steps to regenerate and update FPCC:

## Regenerate iCloud Public Calendar URL
1. Open **Calendar** on Mac or iOS device
2. In the left sidebar, right-click (long-press on iOS) the calendar to share
3. Select **Share Calendar** (or **Calendar Sharing** on iOS)
4. Toggle **Public Calendar** to ON
5. Click **Copy Link** to copy the new `.ics` URL
6. (Optional) Toggle **Public Calendar** back OFF if you don't want permanent public access

## Update Environment Variables
Replace the old `ICLOUD_CALENDAR_URL` in these platforms:
- **Vercel**: Project Settings → Environment Variables → Update `ICLOUD_CALENDAR_URL`
- **Render**: Service Settings → Environment → Update `ICLOUD_CALENDAR_URL`
- **Local .env**: Update `ICLOUD_CALENDAR_URL` in `/home/yassin/fresh-people-command-center/.env`

## Verify
After updating, test the calendar endpoint:
```bash
curl https://fresh-people-command-center.vercel.app/api/calendar
```
You should receive a JSON response with `events` array (not an error).

## Permanent Fix Note
For a fully permanent solution, consider migrating to:
1. iCloud private calendar access via Apple's CalDAV API (requires Apple Developer account)
2. Google Calendar integration (more stable long-term public URLs)
3. Self-hosted calendar sync service