# Apple Calendar (iCloud CalDAV) Integration

## Overview
This integration connects Fresh People Command Center to your iCloud Calendar via CalDAV protocol, enabling event synchronization between FPCC and Apple Calendar.

## Prerequisites
1. Active iCloud account
2. App-Specific Password (required for iCloud with 2FA enabled)

## Setup Instructions

### 1. Generate iCloud App-Specific Password
1. Go to [Apple ID Settings](https://appleid.apple.com)
2. Sign in with your iCloud credentials
3. Navigate to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Label it `FPCC CalDAV Integration`
6. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)
   - **Important:** This password is shown only once - store it securely

### 2. Configure Environment Variables
Add these to your Vercel project settings (or `.env.local` for local development):

| Variable | Description | Example |
|----------|-------------|---------|
| `ICLOUD_EMAIL` | Your iCloud email address | `yassin1984ali@icloud.com` |
| `ICLOUD_APP_PASSWORD` | App-specific password (with dashes) | `abcd-efgh-ijkl-mnop` |

To set in Vercel CLI:
```bash
cd /home/yassin/fresh-people-command-center
npx vercel env add ICLOUD_EMAIL production
npx vercel env add ICLOUD_APP_PASSWORD production
npx vercel --prod  # Redeploy to apply changes
```

### 3. Test Connection
Once environment variables are set, test the integration:

```bash
curl https://fresh-people-command-center.vercel.app/api/calendar/apple/test
```

**Successful response:**
```json
{
  "connected": true,
  "user": "yas***@icloud.com",
  "calendars": [
    {
      "id": "/caldav/v2/calendars/12345678-1234-1234-1234-123456789012/",
      "name": "Fresh People",
      "description": "Operational calendar",
      "timezone": "Africa/Johannesburg"
    }
  ]
}
```

**Failed response:**
```json
{
  "connected": false,
  "error": "Missing required credentials: ICLOUD_EMAIL or ICLOUD_APP_PASSWORD"
}
```

## Endpoint Reference

### GET `/api/calendar/apple/test`
Tests connection to iCloud CalDAV and returns available calendars.

**Response Fields:**
- `connected` (boolean): Connection status
- `user` (string): Masked iCloud email
- `calendars` (array): Available calendars with:
  - `id`: Calendar identifier (use for syncing)
  - `name`: Calendar display name
  - `description`: Calendar description
  - `timezone`: Calendar timezone
- `error` (string, optional): Error message if connection fails

## Security Notes
- ✅ App-specific passwords are masked in all logs
- ✅ Email addresses are partially redacted in logs
- ✅ No credentials are exposed in API responses
- ✅ Never commit `.env` files or credentials to version control
- ✅ Use Vercel's encrypted environment variables for production

## Troubleshooting
1. **"Missing required credentials"**: Verify both `ICLOUD_EMAIL` and `ICLOUD_APP_PASSWORD` are set in Vercel
2. **"Authentication failed"**: Check app-specific password is correct (include dashes)
3. **"Connection timeout"**: Verify iCloud CalDAV URL is accessible (https://caldav.icloud.com)
4. **No calendars returned**: Ensure the iCloud account has at least one calendar created

## Next Steps
After successful connection:
1. Note the `id` of your "Fresh People" calendar
2. Use this ID to implement bidirectional event syncing
3. Set up webhook listeners for real-time updates (optional)
