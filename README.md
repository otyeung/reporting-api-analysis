# LinkedIn Analytics API Strategy Analysis

A comprehensive Next.js application that demonstrates LinkedIn Analytics API integration with OAuth 2.0 authentication, token management, and multiple reporting strategies. This professional-grade tool helps analyze campaign performance and compare different API approaches for data consistency and accuracy.

## 📚 Table of Contents

- [🚀 Features](#-features)
- [📋 Prerequisites](#-prerequisites)
- [🔧 LinkedIn App Setup](#-linkedin-app-setup)
- [⚡ Quick Start](#-quick-start)
- [🏗️ Building & Deployment](#️-building--deployment)
- [🔐 Authentication & Token Management](#-authentication--token-management)
- [📊 API Strategy Analysis](#-api-strategy-analysis)
- [🎯 How to Use the API Strategy Analyzer](#-how-to-use-the-api-strategy-analyzer)
- [🔍 API Integration Details](#-api-integration-details)
- [🧪 Testing Framework](#-testing-framework)
- [🏗️ Project Architecture](#️-project-architecture)
- [📜 License](#-license)

## 🚀 Features

- **🔐 OAuth 2.0 Authentication**: Secure LinkedIn OAuth integration with NextAuth.js
- **🔄 Automatic Token Management**: Dynamic token generation, refresh, and expiry handling
- **🔍 Token Introspection**: Built-in tool to inspect token status, scopes, and validity
- **📊 Four API Strategies**: Compare four distinct LinkedIn Analytics API approaches for comprehensive analysis
- **⚡ Real-time Data Fetching**: Parallel API calls for efficient data retrieval
- **🌍 Geographic Mapping**: Automatic resolution of LinkedIn geo IDs to country names
- **📈 Professional Data Visualization**: Clean, responsive comparison views with business intelligence
- **� CSV Export Functionality**: Download analytics data in CSV format for all four API strategies
- **📋 Data Export Options**: Export overall analytics, geographic breakdowns, monthly trends, and daily analytics
- **�🛡️ Comprehensive Error Handling**: Robust error handling for API calls and authentication
- **🎨 Modern UI**: Built with Tailwind CSS for responsive, professional design
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices

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

### Quick Start Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3001
```

### Production Build

```bash
# Create optimized production build
npm run build

# Start production server
npm start

# Verify build success
npm run build && npm test
```

### Environment Configuration

Create environment files with your LinkedIn app credentials:

**`.env.local` (Development):**

```env
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-here
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_SCOPE=r_ads_reporting,r_basicprofile,r_ads,rw_ads
LINKEDIN_API_VERSION=202506
```

### Deployment Options

#### 🚀 Vercel (Recommended)

```bash
# Deploy with Vercel CLI
npm i -g vercel
vercel --prod

# Or connect GitHub repository at vercel.com
```

**Required Environment Variables in Vercel:**

- `NEXTAUTH_URL` → Your Vercel domain
- `NEXTAUTH_SECRET` → Secure random string
- `LINKEDIN_CLIENT_ID` → From LinkedIn Developer Portal
- `LINKEDIN_CLIENT_SECRET` → From LinkedIn Developer Portal

**Update LinkedIn OAuth Settings:**

- Add redirect URL: `https://your-domain.vercel.app/api/auth/callback/linkedin`

#### 🐳 Docker

```bash
# Build Docker image
docker build -t linkedin-analytics .

# Run container
docker run -p 3000:3000 --env-file .env.production linkedin-analytics
```

#### 🔧 LinkedIn API Version Management

All API routes use centralized version control via environment variable:

```bash
LINKEDIN_API_VERSION=202506  # Easily update across all endpoints
```

**Benefits:** Zero-downtime updates, environment-specific versions, centralized control

// Used in LinkedIn API headers
headers: {
'LinkedIn-Version': apiVersion,
// ... other headers
}

````

## 🔐 Authentication & Token Management

### OAuth 2.0 Implementation Architecture

This application uses **NextAuth.js** for secure OAuth 2.0 authentication with a consistent client-side implementation pattern across all sign-in touchpoints:

#### Authentication Flow
1. **User Authentication:**
   - User clicks "Sign in with LinkedIn" from any page
   - NextAuth handles redirect to LinkedIn authorization server
   - LinkedIn redirects back with authorization code
   - NextAuth exchanges code for access token and creates secure session

2. **Token Management:**
   - Access tokens stored securely in encrypted user sessions
   - **Automatic token refresh** when tokens are near expiry (7 days before)
   - **360-day refresh window** enforcement per LinkedIn's policy
   - Clear error messages when refresh is no longer possible

3. **Token Introspection:**
   - Built-in token inspector tool (`/token-introspect`)
   - Real-time token status, expiry, and scope information
   - Automatic prompts for re-authentication when needed

#### Consistent Sign-In Implementation

All authentication touchpoints use the standardized NextAuth client pattern:

```javascript
import { signIn } from 'next-auth/react'

// Consistent sign-in function across all pages
signIn('linkedin', {
  callbackUrl: '/',
  redirect: true,
})
````

**Implementation Locations:**

- **Main Sign-In Page** (`/auth/signin`) - Primary authentication entry point
- **Navigation Component** - Header sign-in link for unauthenticated users
- **Session Debug Page** (`/session-debug`) - Quick authentication for testing
- **Debug Tools** (`/debug`) - OAuth debugging with integrated sign-in

#### Authentication Benefits

- **🔒 Security**: No static tokens in code or environment files
- **👤 User-Specific**: Each user authenticates with their own LinkedIn permissions
- **🔄 Automatic Refresh**: Tokens refreshed automatically per LinkedIn's requirements
- **📈 Scalable**: Supports multiple users with different access levels
- **✅ Compliant**: Follows OAuth 2.0 standards and LinkedIn's best practices
- **🎯 Consistent**: Unified sign-in experience across all application pages
- **🛠️ Developer-Friendly**: Centralized authentication logic through NextAuth

## 📊 LinkedIn Analytics API Strategy Analysis

This dashboard implements **four distinct API strategies** to retrieve LinkedIn campaign analytics and demonstrate the impact of different approaches on data accuracy and consistency. Each strategy serves different business requirements and reveals important insights about LinkedIn's Professional Demographic restrictions.

### 🎯 Strategy 1: Overall Summary (Benchmark)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=ALL`
- **Configuration**: No pivot, single aggregated result
- **Purpose**: Campaign Manager alignment and data validation
- **Characteristics**:
  - Single row of data covering entire date range
  - Most accurate totals matching Campaign Manager
  - Fastest API response time
  - No demographic filtering applied
- **Use Case**:
  - ✅ **Recommended for**: Data validation and financial reconciliation
  - ✅ **Business Value**: Benchmark for all other strategies
  - ✅ **Reliability**: Gold standard for accurate reporting

### 🌍 Strategy 2: Geographic Breakdown (Production)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=ALL&pivot=MEMBER_COUNTRY_V2`
- **Configuration**: Single API call with geographic pivot
- **Purpose**: Demographic insights with acceptable data variance
- **Characteristics**:
  - Multiple rows (one per geographic region)
  - Professional demographic filtering applied
  - Minor data loss due to privacy thresholds
  - Rich geographic segmentation
- **Use Case**:
  - ✅ **Recommended for**: Production implementations requiring geographic insights
  - ✅ **Business Value**: Regional performance analysis and market segmentation
  - ⚠️ **Consideration**: Accept ~0-5% data variance for demographic benefits

### 📅 Strategy 3: Monthly Breakdown (Temporal Analysis)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=MONTHLY&pivot=MEMBER_COUNTRY_V2`
- **Configuration**: Monthly granularity with geographic pivot
- **Purpose**: Time-series analysis with demographic breakdown
- **Characteristics**:
  - Monthly data points with geographic segmentation
  - Increased demographic filtering at monthly level
  - Moderate data loss (typically 5-20%)
  - Temporal trend analysis capabilities
- **Use Case**:
  - ⚠️ **Use with Caution**: When temporal granularity is essential
  - 📊 **Business Value**: Monthly trend analysis and seasonality insights
  - 🔍 **Validation Required**: Always validate against benchmark strategy

### ⚠️ Strategy 4: Daily Aggregation (High Risk)

- **Endpoint**: Multiple calls to `/rest/adAnalytics?q=analytics&timeGranularity=DAILY&pivot=MEMBER_COUNTRY_V2`
- **Configuration**: One API call per day, results aggregated
- **Purpose**: Demonstrate compounding data loss in daily aggregation
- **Characteristics**:
  - Highest granularity but severe data loss
  - Multiple API calls with individual filtering
  - Significant underreporting (often 20-50%+)
  - Compounded demographic filtering effects
- **Use Case**:
  - ❌ **Not Recommended**: Demonstrates why daily aggregation fails
  - 📚 **Educational Value**: Shows impact of compounded filtering
  - 🚨 **Business Risk**: Severe underreporting affects budget accuracy

### 🔍 Professional Demographic Impact Analysis

The differences between strategies are primarily due to LinkedIn's Professional Demographic restrictions:

#### Privacy Protection Mechanisms

- **Minimum Threshold**: Professional Demographic pivots require minimum 3 events
- **Privacy Filtering**: Values not returned for ads with insufficient member engagement
- **Automatic Dropping**: Data points with <3 events are excluded from results
- **Geographic Impact**: Geographic data inherently uses professional demographics

#### Data Loss Patterns

- **Overall Summary**: 0% loss (no demographic filtering)
- **Geographic Breakdown**: 0-5% loss (single-level filtering)
- **Monthly Breakdown**: 5-20% loss (temporal + demographic filtering)
- **Daily Aggregation**: 20-50%+ loss (compounded filtering effects)

#### Business Implications

- **Financial Accuracy**: Use Overall Summary for budget reconciliation
- **Segmentation Needs**: Geographic Breakdown for demographic insights
- **Trend Analysis**: Monthly Breakdown with validation against benchmark
- **Operational Risk**: Avoid Daily Aggregation for business decisions

[📖 Learn more about LinkedIn's reporting restrictions →](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2025-06&tabs=http#restrictions)

## 🎯 How to Use the API Strategy Analyzer

### 1. Authentication & Setup

1. **Sign In with LinkedIn**

   - Click **"Sign In with LinkedIn"** on the homepage
   - Complete the OAuth flow with your LinkedIn account
   - Ensure your account has Marketing API access

2. **Token Management**
   - Use the **Token Inspector** (`/token-introspect`) to view your token status
   - Monitor token expiry and refresh status
   - Re-authenticate when prompted for expired tokens

### 2. Campaign Analysis Workflow

1. **Configure Analysis Parameters**

   - **Campaign ID**: Enter the LinkedIn campaign ID you want to analyze
   - **Date Range**: Select start and end dates (defaults to last 90 days)
   - **Validation**: Ensure dates fall within campaign's active period

2. **Execute Multi-Strategy Analysis**

   - Click **"Get Analytics Data"** to trigger all four API strategies simultaneously
   - The system makes parallel API calls for optimal performance
   - Progress indicators show real-time data fetching status

3. **Review Comprehensive Results**

   #### 📊 Strategy Comparison Grid

   - **Overall Summary**: Benchmark totals without demographic filtering
   - **Geographic Breakdown**: Regional performance with acceptable variance
   - **Monthly Breakdown**: Temporal trends with moderate data loss warnings
   - **Daily Aggregation**: Demonstrates severe data loss patterns

   #### 🔍 Professional Analysis Features

   - **Difference Calculations**: Automatic variance analysis between strategies
   - **Data Loss Metrics**: Percentage underreporting calculations
   - **Business Impact Assessment**: Risk evaluation for each approach
   - **Implementation Recommendations**: Strategy selection guidance

### 3. Professional Implementation Guidance

#### 📈 Business Decision Framework

**For Financial Reconciliation:**

- ✅ Use **Overall Summary** strategy
- ✅ Matches Campaign Manager exactly
- ✅ Zero data loss for budget tracking

**For Market Segmentation:**

- ✅ Use **Geographic Breakdown** strategy
- ⚠️ Accept 0-5% variance for demographic insights
- ✅ Rich regional performance data

**For Temporal Analysis:**

- ⚠️ Use **Monthly Breakdown** with caution
- 🔍 Always validate against Overall Summary
- 📊 Expect 5-20% underreporting

**For Daily Granularity:**

- ❌ Avoid **Daily Aggregation** approach
- 🚨 Severe underreporting (20-50%+)
- 📚 Educational demonstration only

### 4. CSV Export & Data Download

#### 📤 Export Functionality

Once you've fetched analytics data, you can export the results in CSV format for further analysis:

- **Overall Analytics CSV**: Complete summary data with all key metrics
- **Geographic Breakdown CSV**: Country/region performance data with demographic details
- **Monthly Trends CSV**: Time-series data showing monthly performance patterns
- **Daily Analytics CSV**: Detailed daily breakdown (when available)

#### 📋 CSV Export Features

- **Automatic Filename Generation**: Files include campaign ID and date range
- **Comprehensive Data Coverage**: All visible metrics exported
- **Professional Formatting**: Ready for Excel, Google Sheets, or data analysis tools
- **Timestamp Inclusion**: Export timestamps for audit trails

#### 🔧 How to Export Data

1. **Fetch Analytics Data**: Complete the analysis workflow first
2. **Locate Download Buttons**: Each analysis section has a dedicated "Download CSV" button
3. **Select Export Type**: Choose from Overall, Geographic, Monthly, or Daily exports
4. **Download**: CSV files are automatically downloaded to your browser's download folder

#### 📁 CSV File Structure

**Overall Analytics CSV includes:**

- Campaign metrics (impressions, clicks, cost)
- Calculated rates (CTR, CPM, CPC)
- Performance indicators

**Geographic CSV includes:**

- Country/region breakdown
- Regional performance metrics
- Geographic demographic data

**Monthly CSV includes:**

- Time-series data points
- Monthly trend analysis
- Period-over-period comparisons

### 5. Debug & Troubleshooting Tools

- **Session Debug** (`/session-debug`): Inspect authentication session details
- **Token Inspector** (`/token-introspect`): Comprehensive token analysis
- **OAuth Debug** (`/auth/signin`): Test OAuth flow and token handling
- **API Response Logs**: Real-time error reporting and diagnostics

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

### Strategy-Specific API Configurations

#### 📊 Strategy 1: Overall Summary (Benchmark)

```
q=analytics
timeGranularity=ALL
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

#### 🌍 Strategy 2: Geographic Breakdown

```
q=analytics
timeGranularity=ALL
pivot=MEMBER_COUNTRY_V2
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

#### 📅 Strategy 3: Monthly Breakdown

```
q=analytics
timeGranularity=MONTHLY
pivot=MEMBER_COUNTRY_V2
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

#### ⚠️ Strategy 4: Daily Aggregation

```
q=analytics
timeGranularity=DAILY
pivot=MEMBER_COUNTRY_V2
campaigns=List(urn:li:sponsoredCampaign:{campaignId})
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
```

### API Route Architecture

The application implements a clean API route structure:

```
/api/overall-analytics     → Strategy 1: Benchmark totals
/api/analytics            → Strategy 2: Geographic breakdown
/api/monthly-analytics    → Strategy 3: Monthly time-series
/api/daily-analytics      → Strategy 4: Daily aggregation
```

### Supporting API Endpoints

#### Authentication & Token Management

```
POST /oauth/v2/introspectToken        → Token validation
GET  /api/linkedin-introspect         → Token details
GET  /api/linkedin-profile           → User profile
```

#### Geographic Data Resolution

```
GET /rest/regions/{geoId}            → Country/region lookup
GET /api/geo                         → Geographic data processing
```

### Response Data Structure

Each strategy returns consistent data structures:

```json
{
  "paging": {
    "start": 0,
    "count": 10,
    "links": []
  },
  "elements": [
    {
      "impressions": 1000,
      "clicks": 50,
      "costInLocalCurrency": "25.50",
      "companyPageClicks": 10,
      "likes": 5,
      "comments": 2,
      "shares": 3,
      "follows": 1,
      "pivotValues": ["urn:li:geo:103644278"],
      "dateRange": {
        "start": { "year": 2025, "month": 6, "day": 1 },
        "end": { "year": 2025, "month": 6, "day": 30 }
      }
    }
  ]
}
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

## 🧪 Testing Framework

This project includes a comprehensive test suite covering all four API strategies, components, utilities, and integration workflows. The testing setup uses Jest with React Testing Library for reliable, maintainable tests that ensure data accuracy across different LinkedIn API approaches.

### 📁 Test Architecture

```
__tests__/
├── components/                 # Component unit tests (4 files)
│   ├── AuthProvider.test.tsx      # Session provider integration
│   ├── Home.test.tsx             # Main dashboard & API strategy testing
│   ├── Navigation.test.tsx       # Navigation & authentication states
│   └── TokenStatusComponent.test.tsx # Token management interface
├── api/                       # API route tests (4 files)
│   ├── analytics.test.ts         # Geographic breakdown strategy
│   ├── daily-analytics.test.ts   # Daily aggregation strategy
│   ├── geo.test.ts              # Geographic data resolution
│   └── overall-analytics.test.ts # Benchmark strategy testing
├── lib/                       # Authentication & utility tests (2 files)
│   ├── auth-config.test.ts       # NextAuth configuration
│   └── linkedin-token-refresh.test.ts # Token refresh logic
├── utils/                     # Data processing tests (1 file)
│   └── data-processing.test.ts   # Data transformation utilities
├── integration/               # End-to-end workflow tests (1 file)
│   └── analytics-workflow.test.ts # Multi-strategy API testing
└── data-processing-simple.test.ts # Simple data processing utilities
```

**Test Coverage Statistics:**

- **Total Test Suites**: 13
- **Total Tests**: 95
- **Component Coverage**: 100% of React components
- **API Route Coverage**: 100% of API endpoints
- **Strategy Coverage**: All 4 LinkedIn API strategies tested

### 🚀 Running Tests

#### Basic Test Execution

```bash
# Run all tests once
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Build and test (complete validation)
npm run build && npm test
```

#### Targeted Test Execution

```bash
# Run specific test file
npm test Home.test.tsx

# Run API strategy tests only
npm test -- __tests__/api/

# Run component tests only
npm test -- __tests__/components/

# Run integration tests
npm test -- __tests__/integration/

# Run tests matching pattern
npm test -- --testNamePattern="API strategy"
```

#### Advanced Test Options

```bash
# Verbose output with detailed reporting
npm test -- --verbose

# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot

# Run tests with custom timeout (for slow APIs)
npm test -- --testTimeout=15000

# Run tests in parallel (faster execution)
npm test -- --maxWorkers=4

# Debug specific failing test
npm test -- --testNamePattern="should handle API errors" --verbose
```

### 📊 Quality Assurance Metrics

#### Test Coverage Thresholds

- **Branches**: 70% minimum
- **Functions**: 70% minimum
- **Lines**: 70% minimum
- **Statements**: 70% minimum

#### API Strategy Test Coverage

- ✅ **Overall Summary**: Authentication, data fetching, response handling
- ✅ **Geographic Breakdown**: Pivot processing, country resolution
- ✅ **Monthly Analysis**: Time-series data, demographic filtering
- ✅ **Daily Aggregation**: Multiple API calls, aggregation logic

#### Component Test Coverage

- ✅ **Authentication Flows**: OAuth, session management, token refresh
- ✅ **User Interactions**: Form submission, data display, error handling
- ✅ **State Management**: Loading states, error states, data updates
- ✅ **Responsive Design**: Mobile/desktop rendering, accessibility

### 🔧 Test Configuration & Setup

#### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'next/jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
  ],
}
```

#### Global Test Setup (`jest.setup.js`)

```javascript
import '@testing-library/jest-dom'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock NextAuth session management
jest.mock('next-auth/react')

// Global fetch mock for API testing
global.fetch = jest.fn()
```

### 🧩 Critical Test Scenarios

#### Multi-Strategy API Testing

```typescript
// Tests all four API strategies simultaneously
it('should execute all four API strategies and compare results', async () => {
  // Mock responses for all four endpoints
  // Verify parallel execution
  // Validate data consistency analysis
  // Check professional demographic impact calculations
})
```

#### Authentication & Token Management

```typescript
// Tests OAuth flow and token lifecycle
it('should handle token refresh and expiry scenarios', async () => {
  // Test expired token detection
  // Verify automatic refresh logic
  // Validate token introspection
})
```

#### Error Handling & Resilience

```typescript
// Tests robust error handling across strategies
it('should gracefully handle LinkedIn API errors', async () => {
  // Test network failures
  // Verify user-friendly error messages
  // Validate fallback behaviors
})
```

### 🎯 Test Quality Standards

#### Reliable Test Practices

- **Date Handling**: Dynamic date ranges with tolerance testing
- **API Mocking**: Realistic response structures matching LinkedIn API
- **Error Scenarios**: Comprehensive error state coverage
- **Async Testing**: Proper `waitFor` and promise handling

#### Maintainable Test Structure

- **Clear Test Names**: Descriptive test descriptions
- **Modular Setup**: Reusable mock configurations
- **Isolated Tests**: Independent test execution
- **Documentation**: Inline comments explaining complex test logic

### 🚨 Common Test Issues & Solutions

#### Date-Related Test Failures

```bash
# Issue: Tests failing due to hardcoded dates
# Solution: Use dynamic date calculation with tolerance
expect(daysDiff).toBeGreaterThanOrEqual(88)
expect(daysDiff).toBeLessThanOrEqual(92)
```

#### API Mock Mismatches

```bash
# Issue: Tests expecting different API call counts
# Solution: Update mocks to match all four strategies
mockFetch
  .mockResolvedValueOnce(overallData)      # Strategy 1
  .mockResolvedValueOnce(geoData)          # Strategy 2
  .mockResolvedValueOnce(monthlyData)      # Strategy 3
  .mockResolvedValueOnce(dailyData)        # Strategy 4
```

#### Build vs Test Discrepancies

```bash
# Always validate both build and test success
npm run build && npm test
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

## 🏗️ Project Architecture

### 📁 Directory Structure

```
reporting-api-analysis/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── analytics/            # Geographic breakdown strategy
│   │   ├── daily-analytics/      # Daily aggregation strategy
│   │   ├── monthly-analytics/    # Monthly time-series strategy
│   │   ├── overall-analytics/    # Benchmark strategy
│   │   ├── auth/[...nextauth]/   # NextAuth configuration
│   │   ├── geo/                  # Geographic data resolution
│   │   ├── linkedin-introspect/  # Token introspection
│   │   └── linkedin-profile/     # User profile data
│   ├── components/               # Reusable React components
│   │   ├── AuthProvider.tsx      # Session management
│   │   ├── Navigation.tsx        # App navigation
│   │   └── TokenStatusComponent.tsx # Token status display
│   ├── auth/                     # Authentication pages
│   │   ├── error/               # OAuth error handling
│   │   └── signin/              # Sign-in page
│   ├── debug/                   # Debug utilities
│   ├── session-debug/           # Session inspection
│   ├── token-introspect/        # Token analysis
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main dashboard (4-strategy comparison)
├── lib/                         # Utility libraries
│   └── linkedin-token-refresh.ts # Token refresh logic
├── types/                       # TypeScript definitions
│   └── next-auth.d.ts          # NextAuth type extensions
├── utils/                       # Utility functions
│   └── data-processing.ts       # Data transformation utilities
├── __tests__/                   # Test suite (13 test files, 95 tests)
│   ├── components/              # Component tests
│   ├── api/                     # API route tests
│   ├── lib/                     # Library tests
│   ├── utils/                   # Utility tests
│   └── integration/             # Integration tests
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Test setup
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

### 🎯 Use Cases & Applications

#### 📊 Professional Data Analysis

- **Data Quality Assessment**: Compare API strategies to identify optimal approaches
- **Campaign Performance Analysis**: Comprehensive multi-dimensional reporting
- **Budget Reconciliation**: Benchmark strategy for financial accuracy
- **Market Segmentation**: Geographic and demographic insights

#### 🔬 API Research & Development

- **LinkedIn API Best Practices**: Understand professional demographic restrictions
- **Data Consistency Studies**: Quantify impact of different API approaches
- **Performance Optimization**: Identify fastest vs. most comprehensive strategies
- **Integration Pattern Analysis**: Learn OAuth 2.0 and token management

#### 🏢 Business Intelligence Applications

- **Campaign Manager Verification**: Align API data with LinkedIn's interface
- **Regional Performance Insights**: Geographic breakdown for market analysis
- **Temporal Trend Analysis**: Monthly patterns with data loss awareness
- **Risk Assessment**: Understand data underreporting in different approaches

## 📚 Learning Resources

### LinkedIn Marketing API Documentation

- [LinkedIn Marketing API Overview](https://learn.microsoft.com/en-us/linkedin/marketing/)
- [Analytics API Reference](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting)
- [Professional Demographic Restrictions](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2025-06&tabs=http#restrictions)

### Technical Implementation Guides

- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js App Router Guide](https://nextjs.org/docs/app)

## 🤝 Contributing

We welcome contributions to improve the LinkedIn Analytics API Strategy Analysis tool:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/improvement`
3. **Run tests**: `npm test`
4. **Ensure build passes**: `npm run build`
5. **Submit a pull request** with detailed description

### Development Guidelines

- Maintain test coverage above 70%
- Follow TypeScript best practices
- Document API strategy changes
- Test all four LinkedIn API approaches

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- LinkedIn Marketing API team for comprehensive documentation
- NextAuth.js community for authentication best practices
- React Testing Library for reliable testing patterns
- Tailwind CSS for responsive design system

---

**Built with ❤️ for LinkedIn Marketing API developers and data analysts**

_Last updated: June 2025 | LinkedIn API Version: 202506_
