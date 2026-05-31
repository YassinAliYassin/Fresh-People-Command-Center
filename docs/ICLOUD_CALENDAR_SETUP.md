# iCloud Calendar Integration Setup

## Permanent Steps to Configure
1. Open **Apple Calendar** on your Mac/iOS device
2. Go to **Calendar** > **Settings** (macOS) or **Calendars** > **iCloud** (iOS)
3. Select the calendar you want to sync with FPCC
4. Click **Share Calendar** > Enable **Public Calendar**
5. Copy the **Calendar URL** (ends with `.ics`)
6. Paste the URL into Vercel/Render environment variable `ICLOUD_CALENDAR_URL`

## Critical Note: Expired URLs
iCloud calendar URLs **expire every 30 days**. If events stop syncing:
1. Repeat steps 1-5 above to regenerate the URL
2. Update the `ICLOUD_CALENDAR_URL` environment variable in:
   - Vercel: Project Settings > Environment Variables
   - Render: Service Settings > Environment Variables
3. Redeploy both Vercel and Render services

## Verify Sync
Check the FPCC dashboard after 5 minutes of updating the URL - events should appear automatically.
