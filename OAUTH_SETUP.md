# LinkedIn OAuth 2.0 Setup Guide

This project uses NextAuth.js for OAuth 2.0 authentication with LinkedIn, allowing dynamic access token generation instead of static tokens in environment variables.

## Setup Steps

### 1. LinkedIn Developer App Configuration

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create a new app or use an existing one
3. In your app settings, configure:
   - **Authorized redirect URLs**: Add `http://localhost:3001/api/auth/callback/linkedin` (for development)
   - **Scopes**: Enable the following permissions:
     - `openid` - For user identification
     - `profile` - For user profile information
     - `email` - For user email (optional)
     - `w_ads_reporting` - For accessing LinkedIn ads reporting data
   - Copy your **Client ID** and **Client Secret**

### 2. Environment Variables

Create a `.env.local` file in your project root:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-here

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_SCOPE=openid profile email w_ads_reporting
```

**Important Notes:**

- Replace `your-linkedin-client-id` and `your-linkedin-client-secret` with actual values from LinkedIn
- Generate a secure random string for `NEXTAUTH_SECRET` (you can use: `openssl rand -base64 32`)
- For production, update `NEXTAUTH_URL` to your production domain

### 3. How It Works

1. **Authentication Flow:**

   - User clicks "Sign in with LinkedIn" on `/auth/signin`
   - User is redirected to LinkedIn for authorization
   - LinkedIn redirects back with authorization code
   - NextAuth exchanges code for access token
   - Access token is stored in the user's session

2. **API Calls:**

   - Frontend gets access token from session: `session.accessToken`
   - Frontend sends token in Authorization header: `Bearer {token}`
   - Backend API routes use the token to make LinkedIn API calls

3. **Session Management:**
   - Tokens are automatically refreshed when possible
   - Sessions expire based on LinkedIn's token expiration
   - Users need to re-authenticate when tokens expire

### 4. Testing the Setup

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Test authentication:**

   - Visit `http://localhost:3001/auth/signin`
   - Sign in with your LinkedIn account
   - You should be redirected to the main page

3. **Debug session:**

   - Visit `http://localhost:3001/session-debug`
   - Check that access token is present in session
   - Test LinkedIn API calls

4. **Test analytics:**
   - Visit the main page at `http://localhost:3001`
   - Try fetching analytics data
   - The app should use your OAuth token instead of environment variables

### 5. Key Differences from Static Token Approach

**Before (Static Token):**

- Access token stored in `.env` file
- Token manually obtained and periodically updated
- Single token for all users

**After (OAuth 2.0):**

- Access tokens dynamically generated per user
- Automatic token refresh when possible
- Each user has their own token with their permissions
- More secure and scalable

### 6. Token Scopes and Permissions

The `w_ads_reporting` scope provides access to:

- Campaign analytics and performance data
- Ad account information
- Reporting data for campaigns you have access to

Make sure your LinkedIn account has appropriate permissions for the ad accounts you want to analyze.

### 7. Troubleshooting

**Common Issues:**

1. **"Invalid redirect_uri":**

   - Ensure redirect URL in LinkedIn app matches exactly: `http://localhost:3001/api/auth/callback/linkedin`

2. **"Invalid scope":**

   - Check that all required scopes are enabled in your LinkedIn app
   - Verify the `LINKEDIN_SCOPE` environment variable

3. **"Access token missing":**

   - Check browser console for authentication errors
   - Visit `/session-debug` to inspect session data
   - Ensure user has completed OAuth flow

4. **"Insufficient permissions":**
   - Verify your LinkedIn account has access to the ad accounts
   - Check that `w_ads_reporting` scope is approved for your app

### 8. Production Deployment

For production:

1. Update `NEXTAUTH_URL` to your production domain
2. Add production redirect URL to LinkedIn app: `https://yourdomain.com/api/auth/callback/linkedin`
3. Use secure, randomly generated `NEXTAUTH_SECRET`
4. Consider implementing token refresh logic for long-running sessions

## Files Modified

- `/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `/types/next-auth.d.ts` - TypeScript type definitions
- `/app/session-debug/page.tsx` - Debug page for testing authentication
- Environment variables updated from `CLIENT_ID`/`CLIENT_SECRET` to `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`

## Benefits

1. **Security**: No static tokens in code/environment
2. **User-specific**: Each user authenticates with their own permissions
3. **Automatic refresh**: Tokens refreshed automatically when possible
4. **Scalable**: Supports multiple users with different access levels
5. **Compliant**: Follows OAuth 2.0 standards and LinkedIn's best practices
