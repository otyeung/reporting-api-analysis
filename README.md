# LinkedIn Analytics Dashboard

A comprehensive Next.js application that demonstrates LinkedIn Analytics API integration with OAuth 2.0 authentication, token management, and multiple reporting strategies. This tool helps analyze campaign performance and compare different API approaches for data consistency.

## 🚀 Features

- **OAuth 2.0 Authentication**: Secure LinkedIn OAuth integration with NextAuth.js
- **Automatic Token Management**: Dynamic token generation, refresh, and expiry handling
- **Token Introspection**: Built-in tool to inspect token status, scopes, and validity
- **Multiple API Strategies**: Compare three different LinkedIn Analytics API approaches
- **Real-time Data Fetching**: Parallel API calls for efficient data retrieval
- **Geographic Mapping**: Automatic resolution of LinkedIn geo IDs to country names
- **Data Visualization**: Clean, responsive tables and comparison views
- **Comprehensive Error Handling**: Robust error handling for API calls and authentication
- **Modern UI**: Built with Tailwind CSS for responsive design

## 📋 Prerequisites

- Node.js 18.17 or later
- LinkedIn Developer Account with Marketing API access
- LinkedIn Application with proper OAuth 2.0 configuration

## 🔧 LinkedIn App Setup

### 1. Create LinkedIn Application

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create a new app or use an existing one
3. Request access to the **Marketing API** if not already approved

### 2. Configure OAuth Settings

In your LinkedIn app settings:

- **App Name**: Your application name
- **Authorized Redirect URLs**:
  - Development: `http://localhost:3001/api/auth/callback/linkedin`
  - Production: `https://yourdomain.com/api/auth/callback/linkedin`
- **Required Scopes**: Enable the following permissions:
  - `r_ads_reporting` - For accessing LinkedIn ads reporting data
  - `r_basicprofile` - For user profile information
  - `r_ads` - For ad account access
  - `rw_ads` - For managing ads (if needed)

### 3. Get Your Credentials

From your LinkedIn app dashboard:

- Copy your **Client ID**
- Copy your **Client Secret**
- Save these for environment configuration

## ⚡ Quick Start

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd datorama-api-simulation
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file in your project root:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-here

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_SCOPE=r_ads_reporting,r_basicprofile,r_ads,rw_ads
LINKEDIN_API_VERSION=202506
```

**Important Notes:**

- Replace `your-linkedin-client-id` and `your-linkedin-client-secret` with actual values from LinkedIn
- Generate a secure random string for `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- For production, update `NEXTAUTH_URL` to your production domain

3. **Start the development server:**

```bash
npm run dev
```

4. **Open the application:**

Visit [http://localhost:3001](http://localhost:3001) and sign in with LinkedIn.

## 🔐 Authentication & Token Management

### OAuth 2.0 Flow

This application uses **NextAuth.js** for secure OAuth 2.0 authentication:

1. **User Authentication:**

   - User clicks "Sign in with LinkedIn"
   - Redirected to LinkedIn for authorization
   - LinkedIn redirects back with authorization code
   - NextAuth exchanges code for access token

2. **Token Management:**

   - Access tokens stored securely in user sessions
   - **Automatic token refresh** when tokens are near expiry (7 days before)
   - **360-day refresh window** enforcement per LinkedIn's policy
   - Clear error messages when refresh is no longer possible

3. **Token Introspection:**
   - Built-in token inspector tool
   - Real-time token status, expiry, and scope information
   - Automatic prompts for re-authentication when needed

### Key Benefits Over Static Tokens

- **Security**: No static tokens in code or environment files
- **User-specific**: Each user authenticates with their own permissions
- **Automatic refresh**: Tokens refreshed automatically per LinkedIn's requirements
- **Scalable**: Supports multiple users with different access levels
- **Compliant**: Follows OAuth 2.0 standards and LinkedIn's best practices

## 📊 LinkedIn Analytics API Strategies

This dashboard implements **three distinct API strategies** to retrieve LinkedIn campaign analytics and compare their data consistency:

### 1. Overall Summary Strategy

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=ALL`
- **Purpose**: Get campaign totals for the entire date range
- **Characteristics**: Single row of data, no breakdown, fastest approach
- **Use Case**: Quick campaign overview and totals verification

### 2. Geographic Breakdown Strategy

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=ALL&pivot=MEMBER_COUNTRY_V2`
- **Purpose**: Get campaign data broken down by geographic regions
- **Characteristics**: Multiple rows (one per region), single API call
- **Use Case**: Regional performance analysis

### 3. Daily Breakdown Strategy

- **Endpoint**: Multiple calls to `/rest/adAnalytics?q=analytics&timeGranularity=DAILY&pivot=MEMBER_COUNTRY_V2`
- **Purpose**: Get daily data with geographic breakdown
- **Characteristics**: One API call per day, most granular data
- **Use Case**: Daily trend analysis and data validation

### Professional Demographic Restrictions

The differences between strategies are primarily due to LinkedIn's Professional Demographic restrictions:

- **Minimum Threshold**: Professional Demographic pivots require minimum 3 events
- **Privacy Protection**: Values not returned for ads with too few member engagements
- **Geographic Impact**: Geographic data uses professional demographics, causing discrepancies
- **Data Filtering**: Values with less than 3 events are automatically dropped

[Learn more about LinkedIn's reporting restrictions →](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2025-06&tabs=http#restrictions)

## 🎯 How to Use

### 1. Authentication

- Visit the application and click **"Sign In with LinkedIn"**
- Complete the OAuth flow with your LinkedIn account
- Ensure your account has Marketing API access

### 2. Token Management

- Use the **Token Inspector** to view your token status and details
- Monitor token expiry and refresh status
- Re-authenticate when prompted for expired tokens

### 3. Campaign Analysis

- **Enter Campaign Information:**

  - Input the LinkedIn campaign ID you want to analyze
  - Select the start and end dates for your analytics period

- **Run Analysis:**

  - Click "Get Analytics Data" to trigger all three API strategies
  - The system makes parallel calls for optimal performance

- **Review Results:**
  - **Overall Summary Table**: Campaign totals with key metrics
  - **Geographic Breakdown Table**: Performance by country/region
  - **Daily Breakdown Table**: Day-by-day geographic breakdown
  - **Comparison Section**: Side-by-side analysis with difference calculations

### 4. Debug and Troubleshoot

- **Session Debug Page**: Inspect your authentication session
- **OAuth Debug Page**: Test OAuth flow and token handling
- **Token Inspector**: Detailed token introspection and management

## 📈 Data Metrics Displayed

- **Impressions**: Total ad impressions
- **Clicks**: Total clicks on ads
- **Cost**: Total spend in local currency
- **CTR**: Click-through rate (clicks/impressions)
- **CPM**: Cost per mille (cost per 1000 impressions)
- **Company Page Clicks**: Clicks to company page
- **Engagement**: Likes, comments, shares, and follows
- **Geographic Region**: Country/region breakdown (when applicable)
- **Date Range**: Coverage period for the data

## 🔍 API Integration Details

### Primary Analytics Endpoint

```
GET /rest/adAnalytics
```

### Strategy-Specific Parameters

**Overall Summary:**

```
q=analytics
timeGranularity=ALL
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

**Geographic Breakdown:**

```
q=analytics
timeGranularity=ALL
pivot=MEMBER_COUNTRY_V2
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

**Daily Breakdown:**

```
q=analytics
timeGranularity=DAILY
pivot=MEMBER_COUNTRY_V2
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

### Additional Endpoints

**Token Introspection:**

```
POST /oauth/v2/introspectToken
```

**Geographic Resolution:**

```
GET /rest/regions/{geoId}
```

**Profile Information:**

```
GET /v2/me
```

## 🐛 Troubleshooting

### Authentication Issues

**"Invalid redirect_uri":**

- Ensure redirect URL in LinkedIn app matches exactly: `http://localhost:3001/api/auth/callback/linkedin`

**"Invalid scope":**

- Check that all required scopes are enabled in your LinkedIn app
- Verify the `LINKEDIN_SCOPE` environment variable

**"Access token missing":**

- Check browser console for authentication errors
- Visit `/session-debug` to inspect session data
- Ensure user has completed OAuth flow

### Token Issues

**"Token expired" or "Token inactive":**

- Use the Token Inspector to check token status
- Click "Sign Out & Sign In Again" when prompted
- Tokens automatically refresh when near expiry

**"Insufficient permissions":**

- Verify your LinkedIn account has access to the ad accounts
- Check that Marketing API access is approved for your LinkedIn app

### API Issues

**"LinkedIn API request failed: 401":**

- Token may be expired or invalid
- Use Token Inspector to verify token status
- Re-authenticate if necessary

**"No analytics data found":**

- Verify campaign ID exists and you have access to it
- Check that the date range contains campaign activity
- Ensure campaign was active during the specified period

**Geographic data discrepancies:**

- This is expected due to LinkedIn's Professional Demographic restrictions
- Professional demographic pivots have minimum thresholds
- Some data may be filtered for privacy protection

## 🚀 Production Deployment

### Environment Setup

For production deployment:

1. **Update environment variables:**

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secure-production-secret
LINKEDIN_CLIENT_ID=your-production-client-id
LINKEDIN_CLIENT_SECRET=your-production-client-secret
```

2. **LinkedIn App Configuration:**

- Add production redirect URL: `https://yourdomain.com/api/auth/callback/linkedin`
- Ensure Marketing API access is approved for production use

3. **Security Considerations:**

- Use a secure, randomly generated `NEXTAUTH_SECRET`
- Enable HTTPS for all production traffic
- Implement proper session management and security headers

## 📄 Environment Variables

Create a `.env.local` file with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001                    # Your app URL
NEXTAUTH_SECRET=your-nextauth-secret-here             # Random secret string

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id            # From LinkedIn Developer Portal
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret    # From LinkedIn Developer Portal
LINKEDIN_SCOPE=r_ads_reporting,r_basicprofile,r_ads,rw_ads  # Required scopes
LINKEDIN_API_VERSION=202506                           # LinkedIn API version
```

**Security Notes:**

- Never commit `.env.local` to version control
- Use different credentials for development and production
- Generate secure secrets: `openssl rand -base64 32`

## 🏗️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts              # NextAuth OAuth configuration
│   │   ├── analytics/
│   │   │   └── route.ts              # Geographic breakdown API strategy
│   │   ├── daily-analytics/
│   │   │   └── route.ts              # Daily breakdown API strategy
│   │   ├── geo/
│   │   │   └── route.ts              # Geographic ID resolution
│   │   ├── linkedin-profile/
│   │   │   └── route.ts              # LinkedIn profile API proxy
│   │   ├── linkedin-introspect/
│   │   │   └── route.ts              # Token introspection API
│   │   └── overall-analytics/
│   │       └── route.ts              # Overall summary API strategy
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx              # Custom sign-in page
│   │   └── error/
│   │       └── page.tsx              # OAuth error handling
│   ├── components/
│   │   ├── AuthProvider.tsx          # NextAuth session provider
│   │   ├── Navigation.tsx            # Main navigation component
│   │   └── TokenStatusComponent.tsx  # Token status display & introspection
│   ├── debug/
│   │   └── page.tsx                  # OAuth debug page
│   ├── session-debug/
│   │   └── page.tsx                  # Session debugging tools
│   ├── token-introspect/
│   │   └── page.tsx                  # Token introspection interface
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout with auth
│   └── page.tsx                      # Main dashboard
├── lib/
│   └── linkedin-token-refresh.ts     # Token refresh utilities
├── types/
│   └── next-auth.d.ts                # NextAuth TypeScript definitions
├── .env.local.example                # Environment variables template
├── package.json                      # Dependencies and scripts
├── tailwind.config.js                # Tailwind CSS configuration
└── tsconfig.json                     # TypeScript configuration
```

## 🛠️ Technologies Used

- **Next.js 14** - React framework with App Router
- **NextAuth.js** - OAuth 2.0 authentication
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **LinkedIn Marketing API** - Campaign data and analytics
- **LinkedIn OAuth 2.0** - Secure authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add proper error handling for new API integrations
- Update this README for any new features
- Test all authentication flows thoroughly
- Ensure responsive design compatibility
- Include proper token management for new features

## 📜 License

This project is for demonstration and analysis purposes. Please ensure compliance with:

- [LinkedIn API Terms of Service](https://legal.linkedin.com/api-terms-of-use)
- [LinkedIn Marketing API Policies](https://www.linkedin.com/help/lms/answer/a418880)
- Data Privacy Regulations (GDPR, CCPA, etc.)
- OAuth 2.0 Security Best Practices

## 🎯 Use Cases

### Data Quality Analysis

Compare results across strategies to identify:

- Inconsistencies in LinkedIn's data processing
- Missing data in specific approaches
- Optimal strategy for different reporting needs

### API Strategy Optimization

Determine which approach provides:

- Most complete data coverage
- Best performance characteristics
- Optimal balance of detail and efficiency

### Authentication Testing

Test and understand:

- OAuth 2.0 flow implementation
- Token refresh mechanisms
- Session management best practices
