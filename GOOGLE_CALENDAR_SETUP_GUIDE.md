# Google Calendar Integration Setup Guide

## Overview

This guide provides step-by-step instructions for setting up Google Calendar integration with HandyTech Solutions. This integration automatically syncs customer appointments to the business Google Calendar (contact@handytech-solutions.com), enabling real-time calendar management and reducing scheduling conflicts.

## Features

- **Automatic Event Creation**: New appointments are automatically added to Google Calendar
- **Real-time Updates**: Rescheduled appointments update the corresponding calendar event
- **Event Deletion**: Cancelled appointments are removed from the calendar
- **Customer Attendees**: Customers are automatically added as attendees to calendar events
- **Failure Tolerance**: Booking operations continue even if Google Calendar sync fails

## Environment Variables

### Required Environment Variables

Add these exact environment variables to your deployment environment:

```bash
# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=<<to be added after Google Cloud Console setup>>
GOOGLE_CLIENT_SECRET=<<to be added after Google Cloud Console setup>>
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/admin/google/callback

# Target Calendar Configuration
GOOGLE_CALENDAR_ID=contact@handytech-solutions.com

# Timezone Configuration
TZ=America/Chicago
```

### Environment Variable Descriptions

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | `123456789-abc123.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | `GOCSPX-abc123xyz789` |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (must match Google Cloud Console) | `https://yourapp.com/api/admin/google/callback` |
| `GOOGLE_CALENDAR_ID` | Target calendar email for syncing appointments | `contact@handytech-solutions.com` |
| `TZ` | Timezone for appointment scheduling and calendar events | `America/Chicago` |

**Important Notes:**
- Replace `YOUR_DOMAIN` with your actual deployment domain
- The `GOOGLE_CALENDAR_ID` should remain `contact@handytech-solutions.com` unless specifically changed
- The `TZ` timezone should match your business location for accurate appointment times

## Google Cloud Console Setup

### Step 1: Create or Select Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with the account that will manage the integration
3. Either:
   - Create a new project by clicking "New Project"
   - Select an existing project from the dropdown

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" from the results
4. Click **Enable** button
5. Wait for the API to be enabled (usually takes a few seconds)

### Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have Google Workspace)
3. Click **Create**
4. Fill in the required information:
   - **App name**: `HandyTech Calendar Sync`
   - **User support email**: Choose your Google account email
   - **Developer contact information**: Enter your business email
5. Leave other fields as default or fill as appropriate
6. Click **Save and Continue**
7. On the Scopes page, click **Save and Continue** (no additional scopes needed)
8. On the Test users page, click **Save and Continue**
9. Review the summary and click **Back to Dashboard**

### Step 4: Create OAuth 2.0 Client ID

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Select **Web application** as the application type
4. Set the name: `HandyTech Calendar Integration`
5. Under **Authorized redirect URIs**, click **Add URI**
6. Enter your callback URL: `https://YOUR_DOMAIN/api/admin/google/callback`
   - Replace `YOUR_DOMAIN` with your actual deployment domain
   - Examples:
     - `https://handytech-solutions.replit.app/api/admin/google/callback`
     - `https://yourdomain.com/api/admin/google/callback`
7. Click **Create**
8. A popup will show your Client ID and Client Secret
9. **Copy both values immediately** - you'll need them for environment variables

### Step 5: Download Credentials (Optional)

1. On the Credentials page, click the download icon next to your OAuth 2.0 Client ID
2. Save the JSON file securely (for backup purposes)
3. **Never commit this file to version control**

## Replit Secrets Configuration

### Adding Secrets in Replit

1. Open your Replit project
2. Click on the **Secrets** tab in the left sidebar (lock icon)
3. Add each environment variable as a secret:

**Add these secrets one by one:**

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | Paste the Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Paste the Client Secret from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_REPLIT_DOMAIN/api/admin/google/callback` |
| `GOOGLE_CALENDAR_ID` | `contact@handytech-solutions.com` |
| `TZ` | `America/Chicago` |

### Finding Your Replit Domain

Your Replit domain will be in one of these formats:
- `https://PROJECT_NAME--USERNAME.repl.co/api/admin/google/callback`
- `https://PROJECT_NAME.USERNAME.replit.app/api/admin/google/callback`

**To find your exact domain:**
1. Run your Replit project
2. Look at the URL in the webview
3. Use that base URL + `/api/admin/google/callback`

### Updating Google Cloud Console with Replit Domain

After setting up your Replit project:
1. Return to Google Cloud Console > **APIs & Services** > **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, update the URI to your Replit domain
4. Click **Save**

## Testing the Integration

### Step 1: Initial OAuth Connection

1. Ensure your application is running
2. Navigate to: `https://YOUR_DOMAIN/api/admin/google/auth`
3. You should be redirected to Google's OAuth consent screen
4. **Sign in with the contact@handytech-solutions.com account**
5. Grant permissions to access Google Calendar
6. You should see: "Google Calendar connected for contact@handytech-solutions.com! You can close this tab."

### Step 2: Verify Token Storage

1. Check that the file `server/data/google_tokens.json` has been created
2. The file should contain access and refresh tokens
3. **Never commit this file to version control**

### Step 3: Test Appointment Sync

1. Create a test appointment through your application
2. Check the Google Calendar for contact@handytech-solutions.com
3. Verify the event appears with:
   - Correct date and time
   - Customer information in the description
   - Customer email as an attendee

### Step 4: Test Rescheduling

1. Reschedule the test appointment
2. Verify the calendar event updates to the new time
3. Check that the event ID remains the same

### Step 5: Test Cancellation

1. Cancel the test appointment
2. Verify the calendar event is deleted

## API Endpoints

### Admin OAuth Flow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/google/auth` | GET | Initiates OAuth flow - redirects to Google |
| `/api/admin/google/callback` | GET | OAuth callback - handles authorization code |

### Authentication Flow

1. Admin visits `/api/admin/google/auth`
2. Redirected to Google OAuth consent screen
3. User grants permissions
4. Google redirects to `/api/admin/google/callback` with authorization code
5. Server exchanges code for access/refresh tokens
6. Tokens stored in `server/data/google_tokens.json`

## File Structure

```
server/
├── data/
│   └── google_tokens.json         # OAuth tokens (auto-generated, never commit)
├── routes/
│   └── google-admin.js            # OAuth flow endpoints
├── utils/
│   └── google.js                  # Google Calendar API utilities
└── routes.ts                      # Main API routes with calendar sync
```

## Security Considerations

### OAuth Tokens
- Tokens are stored locally in `server/data/google_tokens.json`
- This file contains sensitive access credentials
- **Never commit this file to version control**
- Add to `.gitignore`: `server/data/google_tokens.json`

### Access Permissions
- Only requests events calendar access (`https://www.googleapis.com/auth/calendar.events`)
- Does not request read access to existing calendar data
- Permissions are scoped to event creation, modification, and deletion only

### Admin Protection
- OAuth endpoints should be protected with admin authentication middleware
- Consider implementing rate limiting on OAuth endpoints
- Monitor failed OAuth attempts

### Error Handling
- Google Calendar failures do not block appointment creation
- Errors are logged but do not interrupt user experience
- Implement retry mechanisms for temporary failures

## Troubleshooting

### Common Issues

#### 1. "Redirect URI Mismatch" Error
**Problem**: Google shows "redirect_uri_mismatch" error

**Solutions**:
- Verify the `GOOGLE_REDIRECT_URI` environment variable matches exactly what's configured in Google Cloud Console
- Check for trailing slashes, HTTP vs HTTPS, and case sensitivity
- Ensure the domain in Google Cloud Console matches your deployed application domain

#### 2. "Access Denied" Error
**Problem**: OAuth flow returns access denied

**Solutions**:
- Ensure you're signing in with the correct Google account (contact@handytech-solutions.com)
- Check that the OAuth consent screen is properly configured
- Verify the Google Calendar API is enabled

#### 3. "GOOGLE_NOT_CONNECTED" Error
**Problem**: Calendar sync fails with connection error

**Solutions**:
- Re-run the OAuth flow: visit `/api/admin/google/auth`
- Check if `server/data/google_tokens.json` exists and contains valid tokens
- Verify environment variables are set correctly

#### 4. Token Refresh Issues
**Problem**: Calendar sync works initially but fails later

**Solutions**:
- Delete `server/data/google_tokens.json` and re-authenticate
- Check Google Cloud Console for any API quota or billing issues
- Verify the refresh token is being saved properly

#### 5. Calendar Events Not Appearing
**Problem**: Appointments created but no calendar events

**Solutions**:
- Check server logs for Google API errors
- Verify the `GOOGLE_CALENDAR_ID` is set to the correct email
- Ensure the authenticated account has access to the target calendar
- Check that appointments include the `google_event_id` field

### Environment Variable Validation

Add this code to validate environment variables on startup:

```javascript
// Validate required Google Calendar environment variables
const requiredGoogleVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_CALENDAR_ID'
];

for (const varName of requiredGoogleVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}
```

### Testing Token Validity

Test if your OAuth tokens are working:

```bash
# Check if tokens file exists
ls -la server/data/google_tokens.json

# Test OAuth connection manually by visiting:
https://YOUR_DOMAIN/api/admin/google/auth
```

### Debugging Calendar Sync

Enable debug logging for calendar operations:

```javascript
// Add to your appointment creation/update code
console.log('Creating calendar event:', {
  summary: title,
  start: startTime,
  end: endTime,
  customer: customerEmail
});
```

## Support

### Google Cloud Console Support
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)

### Application Support
- Check server logs for detailed error messages
- Verify all environment variables are properly set
- Test OAuth flow in incognito/private browsing mode
- Ensure Google Account has proper calendar access

## Maintenance

### Regular Tasks
- Monitor OAuth token expiration and refresh
- Check Google Cloud Console for API usage and quotas
- Review calendar sync logs for any systematic failures
- Update OAuth consent screen information if business details change

### Token Rotation
- OAuth tokens automatically refresh when needed
- If manual rotation is required, delete `google_tokens.json` and re-authenticate
- Monitor for any Google API policy changes that might affect token validity

---

**Last Updated**: September 15, 2025
**Next Review**: December 15, 2025

For additional support, refer to the main project documentation or contact the development team.