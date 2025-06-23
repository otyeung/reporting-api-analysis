# LinkedIn Analytics Dashboard

A comprehensive Next.js application that demonstrates LinkedIn Analytics API integration with OAuth 2.0 authentication, token management, and multiple reporting strategies. This tool helps analyze campaign performance and compare different API approaches for data consistency.

## 📚 Table of Contents

- [🚀 Features](#-features)
- [📋 Prerequisites](#-prerequisites)
- [🔧 LinkedIn App Setup](#-linkedin-app-setup)
- [⚡ Quick Start](#-quick-start)
- [🏗️ Building & Deployment](#️-building--deployment)
  - [Local Development](#local-development)
  - [Production Build](#production-build)
  - [🚀 Vercel Deployment](#-vercel-deployment)
  - [🎯 LinkedIn API Version Management](#-linkedin-api-version-management)
- [🔐 Authentication & Token Management](#-authentication--token-management)
- [📊 API Strategies](#-api-strategies)
- [🧪 Testing](#-testing)
  - [🚀 Running Tests](#-running-tests)
  - [📊 Test Coverage](#-test-coverage)
  - [🔧 Test Configuration](#-test-configuration)
- [📜 License](#-license)
- [🎯 Use Cases](#-use-cases)

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

## 🏗️ Building & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app runs on http://localhost:3001
```

### Production Build

```bash
# Create production build
npm run build

# Start production server (after build)
npm start

# Or use PM2 for production process management
npm install -g pm2
pm2 start npm --name "linkedin-analytics" -- start

# Check build output and bundle analysis
npm run build && ls -la .next/static

# Verify build succeeds without errors
npm run build > build.log 2>&1 && echo "Build successful" || echo "Build failed"
```

**Build Configuration:**

- **Output**: Optimized static files in `.next/` directory
- **Assets**: Minified CSS, JS, and images in `.next/static/`
- **API Routes**: Serverless functions ready for deployment
- **Environment**: Production-specific optimizations enabled

### Environment Configuration

The application uses environment variables for configuration. Create appropriate environment files:

**Development (`.env.local`):**

```env
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-here
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_SCOPE=r_ads_reporting,r_basicprofile,r_ads,rw_ads
LINKEDIN_API_VERSION=202506
```

**Production (`.env.production`):**

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-nextauth-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_SCOPE=r_ads_reporting,r_basicprofile,r_ads,rw_ads
LINKEDIN_API_VERSION=202506
```

### 🚀 Vercel Deployment

This application is optimized for deployment on Vercel. Follow these steps:

#### 1. Prepare Your Repository

```bash
# Ensure your code is in a Git repository
git init
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab/Bitbucket
git remote add origin <your-repo-url>
git push -u origin main
```

#### 2. Deploy to Vercel

**Option A: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project directory
vercel

# Follow the prompts to configure your project
```

**Option B: Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub/GitLab/Bitbucket repository
4. Configure the build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

#### 3. Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

```
NEXTAUTH_URL = https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET = [Generate a secure secret]
LINKEDIN_CLIENT_ID = [Your LinkedIn Client ID]
LINKEDIN_CLIENT_SECRET = [Your LinkedIn Client Secret]
LINKEDIN_SCOPE = r_ads_reporting,r_basicprofile,r_ads,rw_ads
LINKEDIN_API_VERSION = 202506
```

**Important:** Set the environment for each variable:

- **Production**: For your main deployment
- **Preview**: For pull request previews
- **Development**: For local development (optional)

#### 4. Update LinkedIn OAuth Settings

In your LinkedIn Developer Portal:

1. Go to your app's **Auth** settings
2. Add your Vercel URL to **Authorized Redirect URLs**:
   ```
   https://your-vercel-domain.vercel.app/api/auth/callback/linkedin
   ```

#### 5. Deploy and Verify

```bash
# Deploy latest changes
git push origin main

# Vercel will automatically deploy
# Check deployment status in Vercel dashboard
```

#### 6. Custom Domain (Optional)

To use a custom domain:

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain
5. Update LinkedIn OAuth redirect URL

### 🔧 Build Optimization

**Performance Optimizations:**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['media.licdn.com'], // LinkedIn profile images
  },
  // Enable compression
  compress: true,
  // Generate static pages where possible
  output: 'standalone',
}

module.exports = nextConfig
```

### 📊 Monitoring & Analytics

**Vercel Analytics Integration:**

```bash
npm install @vercel/analytics

# Add to your layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 🚨 Deployment Troubleshooting

**Common Issues:**

1. **Environment Variables Not Loading**

   - Verify variables are set in Vercel dashboard
   - Check variable names match exactly
   - Redeploy after adding variables

2. **LinkedIn OAuth Errors**

   - Ensure redirect URL includes your Vercel domain
   - Check `NEXTAUTH_URL` matches your deployment URL
   - Verify LinkedIn app has proper permissions

3. **Build Failures**

   - Check TypeScript errors: `npm run build` locally
   - Verify all dependencies are in package.json
   - Check Node.js version compatibility

4. **API Route Errors**
   - Verify environment variables are accessible
   - Check function timeout limits (Vercel default: 10s)
   - Monitor function logs in Vercel dashboard

### 🎯 LinkedIn API Version Management

The application uses dynamic API version management through environment variables. This allows easy updates without code changes.

#### Environment Configuration

Set the LinkedIn API version in your environment:

```bash
LINKEDIN_API_VERSION=202506
```

#### Centralized Version Control

All LinkedIn API routes automatically use this version:

- ✅ **Analytics API** (`/api/analytics`)
- ✅ **Overall Analytics API** (`/api/overall-analytics`)
- ✅ **Geo API** (`/api/geo`)
- ✅ **Daily Analytics API** (`/api/daily-analytics`)
- ✅ **LinkedIn Profile API** (`/api/linkedin-profile`)

#### Updating API Version

To update the LinkedIn API version:

1. **Environment Variable Method:**

   ```bash
   # Update in your .env file
   LINKEDIN_API_VERSION=202507
   ```

2. **Vercel Deployment:**

   - Update environment variable in Vercel dashboard
   - Redeploy or trigger new deployment

3. **Benefits:**
   - 🎯 **Centralized control** - Change version in one place
   - 🔄 **Environment-specific** - Different versions for dev/staging/prod
   - 🚀 **Zero downtime** - Update without code changes
   - 📋 **Consistent pattern** - All routes follow same approach

#### Default Fallback

If `LINKEDIN_API_VERSION` is not set, all routes default to `'202506'`.

#### Implementation Pattern

Each API route follows this consistent pattern:

```typescript
// Get API version from environment
const apiVersion = process.env.LINKEDIN_API_VERSION || '202506'

// Used in LinkedIn API headers
headers: {
  'LinkedIn-Version': apiVersion,
  // ... other headers
}
```

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

## 🧪 Testing

This project includes a comprehensive test suite covering components, utilities, API routes, and integration workflows. The testing setup uses Jest with React Testing Library for reliable, maintainable tests.

### 📁 Test Structure

```
__tests__/
├── components/           # Component unit tests
│   ├── AuthProvider.test.tsx
│   ├── Home.test.tsx
│   ├── Navigation.test.tsx
│   └── TokenStatusComponent.test.tsx
├── api/                 # API route tests
│   ├── analytics.test.ts
│   ├── daily-analytics.test.ts
│   ├── geo.test.ts
│   └── overall-analytics.test.ts
├── lib/                 # Utility function tests
│   ├── auth-config.test.ts
│   └── linkedin-token-refresh.test.ts
├── utils/               # Data processing utilities
│   └── data-processing.test.ts
└── integration/         # Integration tests
    └── analytics-workflow.test.ts
```

### 🚀 Running Tests

**Basic Test Commands:**

```bash
# Run all tests once
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- AuthProvider.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="token"

# Run tests for specific directory
npm test -- __tests__/components

# Run tests with verbose output
npm test -- --verbose

# Run tests in silent mode (less output)
npm test -- --silent
```

**Advanced Test Options:**

```bash
# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot

# Run tests on specific files that changed
npm test -- --onlyChanged

# Run tests related to files in Git staging area
npm test -- --onlyCommitted

# Run tests with maximum worker processes
npm test -- --maxWorkers=4

# Run tests with custom timeout
npm test -- --testTimeout=10000
```

**Test Categories:**

```bash
# Run only component tests
npm test -- __tests__/components/

# Run only API route tests
npm test -- __tests__/api/

# Run only utility tests
npm test -- __tests__/utils/ __tests__/lib/

# Run only integration tests
npm test -- __tests__/integration/

# Run specific test suites
npm test -- --testPathPattern="analytics"
```

**Debugging Tests:**

```bash
# Debug failing tests with detailed output
npm test -- --verbose --no-coverage

# Run single test file with debugging
npm test -- --testNamePattern="should render" AuthProvider.test.tsx

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 📊 Test Coverage

The project maintains high test coverage across:

- **Components**: React component rendering, user interactions, state management
- **API Routes**: Request/response handling, authentication, error scenarios
- **Utilities**: Token refresh logic, date processing, data formatting
- **Integration**: End-to-end API workflows, authentication flows

**Coverage Thresholds:**

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### 🔧 Test Configuration

**Jest Configuration (`jest.config.js`):**

- Uses Next.js Jest configuration
- JSDOM environment for React component testing
- Module path mapping for clean imports
- Coverage collection from app and lib directories

**Setup File (`jest.setup.js`):**

- Global mocks for Next.js navigation and authentication
- Environment variable setup for testing
- Polyfills for Node.js compatibility

### 🧩 Component Tests

**AuthProvider (`AuthProvider.test.tsx`)**

```typescript
// Tests session provider wrapper
// Verifies children rendering
// Ensures proper SessionProvider integration
```

**Navigation (`Navigation.test.tsx`)**

```typescript
// Tests navigation rendering based on auth state
// Verifies route highlighting
// Tests sign in/out functionality
// Handles loading states
```

**TokenStatusComponent (`TokenStatusComponent.test.tsx`)**

```typescript
// Tests token status display
// Verifies token expiry warnings
// Tests token introspection functionality
// Handles authentication states
```

**Home Page (`Home.test.tsx`)**

```typescript
// Tests dashboard rendering
// Verifies form submission
// Tests API error handling
// Validates user interaction flows
```

### 🔌 API Route Tests

**Analytics APIs**

```typescript
// Tests LinkedIn API integration
// Verifies authentication requirements
// Tests request/response handling
// Validates error scenarios
// Tests data transformation
```

**Geographic API**

```typescript
// Tests geo ID resolution
// Verifies fallback mechanisms
// Tests API version handling
```

**Authentication**

```typescript
// Tests NextAuth configuration
// Verifies token refresh logic
// Tests session management
// Validates OAuth flow callbacks
```

### 🔧 Utility Tests

**Token Refresh Utilities**

```typescript
// Tests token expiry calculation
// Verifies refresh timing logic
// Tests LinkedIn API token refresh
// Validates error handling
```

**Data Processing**

```typescript
// Tests currency formatting
// Verifies metric calculations
// Tests date range generation
// Validates data aggregation
```

### 🔄 Integration Tests

**Analytics Workflow**

```typescript
// Tests complete API strategy workflow
// Verifies error handling consistency
// Tests data validation between strategies
// Validates authentication flow
```

### 🎯 Test Best Practices

**Mocking Strategy:**

- Mock external dependencies (Next.js, NextAuth)
- Use jest.fn() for function mocks
- Mock environment variables for consistency
- Avoid mocking internal application logic

**Test Organization:**

- Group related tests in describe blocks
- Use descriptive test names
- Test both success and error scenarios
- Include edge cases and boundary conditions

**Assertions:**

- Use specific matchers (toBeInTheDocument, toHaveClass)
- Test user-visible behavior over implementation
- Verify error messages and user feedback
- Check component state changes

### 🐛 Testing Tips

**Common Issues & Solutions:**

1. **Next.js Module Errors:**

   ```bash
   # Ensure proper mocking in jest.setup.js
   # Use Next.js jest configuration
   ```

2. **Authentication Mocking:**

   ```typescript
   // Mock useSession hook properly
   mockUseSession.mockReturnValue({
     data: mockSessionData,
     status: 'authenticated',
   })
   ```

3. **API Route Testing:**

   ```typescript
   // Use proper Request/Response mocking
   // Mock fetch for external API calls
   // Test both success and error scenarios
   ```

4. **Component Rendering:**
   ```typescript
   // Use Testing Library queries appropriately
   // Test user interactions with fireEvent
   // Use waitFor for async operations
   ```

### 📈 Continuous Integration

Tests are designed to run in CI/CD environments:

- **Fast execution**: Optimized for quick feedback
- **Reliable**: Consistent results across environments
- **Comprehensive**: Cover critical user journeys
- **Maintainable**: Easy to update as features evolve

### 🔍 Test Debugging

**Debugging Failed Tests:**

1. **Use screen.debug()** to see rendered output
2. **Check console logs** for error messages
3. **Verify mock implementations** match expectations
4. **Use waitFor** for async operations
5. **Check test environment setup** for missing mocks

**Example Debugging:**

```typescript
import { screen } from '@testing-library/react'

it('should render correctly', () => {
  render(<MyComponent />)
  screen.debug() // Shows current DOM structure

  // Add assertions
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

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
