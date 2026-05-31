# Unified Calendar Setup Guide

## Overview
The unified calendar view is now available at: `/unified-calendar`

This setup uses:
- **Nylas API** for Apple Calendar (serverless, no local servers needed)
- **Google Calendar API** with OAuth for Google Calendar

## Setup Steps

### 1. Nylas API Setup (for Apple Calendar)

1. **Sign up at Nylas**: https://dashboard.nylas.com
2. **Create a new application** in the Nylas dashboard
3. **Connect iCloud Calendar**:
   - Go to "Integrations" → "Apple iCloud"
   - Authenticate with your iCloud account (yassin.ali@freshpeople.co.za)
   - You'll need to generate an app-specific password for iCloud
   - Follow Nylas docs: https://docs.nylas.com/docs/quickstart-authenticate-users-with-hosted-auth
4. **Get your credentials**:
   - Copy the **API Key** from the dashboard
   - Copy the **Grant ID** from the authenticated user

### 2. Google Calendar API Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create a new project** or select existing
3. **Enable Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API" and enable it
4. **Create OAuth 2.0 credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URI: `https://fresh-people-command-center.vercel.app/api/auth/google/callback`
5. **Get the tokens**:
   - Copy the **Client ID** and **Client Secret**
   - Use OAuth 2.0 playground or similar to get a **refresh token**

### 3. Set Environment Variables in Vercel

Go to your Vercel project dashboard: https://vercel.com/<your-account>/fresh-people-command-center/settings/environment-variables

Add these variables:

```
NYLAS_API_KEY=your-nylas-api-key
NYLAS_GRANT_ID=your-nylas-grant-id

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
```

### 4. Redeploy

After setting the environment variables, trigger a new deployment:
- Go to Vercel dashboard → "Deployments"
- Click "Redeploy" on the latest deployment

## Testing

Once deployed with the correct credentials:

1. Visit: https://fresh-people-command-center.vercel.app/unified-calendar
2. The page will show connection status for both Google and Apple calendars
3. Events from both sources will be displayed with color-coding:
   - **Blue**: Google Calendar events
   - **Green**: Apple Calendar events (via Nylas)

## API Endpoints

- **Unified Calendar**: `/api/calendar/unified` - Fetches from both sources
- **Google Calendar**: `/api/calendar/google/test` - Google Calendar events
- **Apple Calendar (Nylas)**: `/api/calendar/apple/nylas` - Apple Calendar events via Nylas

## Troubleshooting

### Apple Calendar not connecting
- Verify NYLAS_API_KEY and NYLAS_GRANT_ID are correct
- Check Nylas dashboard for connection status
- Ensure iCloud account is properly connected in Nylas

### Google Calendar not connecting
- Verify GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN
- Check that Google Calendar API is enabled
- Ensure refresh token is valid and not expired

### Still using old VPS endpoint
- The old `/api/calendar/apple/test` endpoint that called the VPS has been replaced
- The new Nylas endpoint is at `/api/calendar/apple/nylas`
- The unified endpoint combines both sources automatically

## No Local Servers! 🎉

This setup uses:
- **Nylas Cloud API** for Apple Calendar (no local PM2/Nginx needed)
- **Google APIs** directly from serverless functions
- **Vercel serverless functions** for all API endpoints

No more managing local calendar servers!
