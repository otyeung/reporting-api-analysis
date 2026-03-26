# LinkedIn Analytics API Strategy Analysis

> **Disclaimer:** This is a community-built demo application and is **not** an official LinkedIn product. It is not endorsed, certified, or supported by LinkedIn or Microsoft. This project is maintained by the community on a best-effort basis. If you find a bug, please [open an issue](../../issues). Feel free to fork the repo to make it your own.

A Next.js 15 application that demonstrates LinkedIn Analytics API integration with OAuth 2.0 authentication, token management, and multiple reporting strategies. This tool helps analyze campaign performance and compare different API approaches for data consistency and accuracy.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [LinkedIn App Setup](#linkedin-app-setup)
- [Quick Start](#quick-start)
- [Building & Deployment](#building--deployment)
- [Authentication & Token Management](#authentication--token-management)
- [API Strategy Analysis](#api-strategy-analysis)
- [How to Use the API Strategy Analyzer](#how-to-use-the-api-strategy-analyzer)
- [API Integration Details](#api-integration-details)
- [Testing Framework](#testing-framework)
- [Project Architecture](#project-architecture)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **OAuth 2.0 Authentication**: Secure LinkedIn OAuth integration with NextAuth.js
- **Automatic Token Management**: Dynamic token generation, refresh, and expiry handling
- **Bring Your Own Token**: Paste and validate a custom LinkedIn access token directly in the UI
- **Token Introspection**: Built-in tool to inspect token status, scopes, and validity
- **Four API Strategies**: Compare four distinct LinkedIn Analytics API approaches
- **Real-time Data Fetching**: Parallel API calls for efficient data retrieval
- **Geographic Mapping**: Automatic resolution of LinkedIn geo IDs to country names
- **CSV Export**: Download analytics data in CSV format for all four strategies
- **Debug Sessions**: Each strategy section shows the exact curl command used for the API call
- **Comprehensive Error Handling**: Robust error handling for API calls and authentication
- **Modern UI**: Built with Tailwind CSS for responsive, professional design

## Prerequisites

- Node.js 18.17 or later
- LinkedIn Developer Account with Marketing API access
- LinkedIn Application with proper OAuth 2.0 configuration

## LinkedIn App Setup

### 1. Create LinkedIn Application

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create a new app or use an existing one
3. Request access to the **Marketing API** if not already approved

### 2. Configure OAuth Settings

In your LinkedIn app settings:

- **Authorized Redirect URLs**:
  - Development: `http://localhost:3000/api/auth/callback/linkedin`
  - Production: `https://yourdomain.com/api/auth/callback/linkedin`
- **Required Scopes**:
  - `r_ads_reporting` - Ads reporting data
  - `r_basicprofile` - User profile information
  - `r_ads` - Ad account access
  - `rw_ads` - Managing ads (if needed)

### 3. Get Your Credentials

From your LinkedIn app dashboard:

- Copy your **Client ID**
- Copy your **Client Secret**
- Save these for environment configuration

## Quick Start

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd reporting-api-analysis
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file in your project root:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_SCOPE=r_ads_reporting,r_basicprofile,r_ads,rw_ads
LINKEDIN_API_VERSION=202603
```

- Replace placeholder values with your actual LinkedIn app credentials
- Generate a secure secret: `openssl rand -base64 32`
- For production, update `NEXTAUTH_URL` to your production domain

3. **Start the development server:**

```bash
npm run dev
```

4. **Open the application:**

Visit [http://localhost:3000](http://localhost:3000) and sign in with LinkedIn.

## Building & Deployment

### Development

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:3000
npm test          # Run test suite
npm run lint      # Run ESLint
```

### Production Build

```bash
npm run build     # Create optimized production build
npm start         # Start production server
```

### Deployment Options

**Vercel (Recommended):**

```bash
npm i -g vercel
vercel --prod
```

Set these environment variables in your Vercel project settings: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_SCOPE`, `LINKEDIN_API_VERSION`.

**Docker:**

```bash
docker build -t linkedin-analytics .
docker run -p 3000:3000 --env-file .env.production linkedin-analytics
```

### LinkedIn API Version Management

The API version is centralized via the `LINKEDIN_API_VERSION` environment variable. If not set, the app dynamically computes the version based on the current date (using the previous month, skipping December). This is handled by `lib/linkedin-api-version.ts`.

## Authentication & Token Management

### OAuth 2.0 Flow

1. User clicks "Sign in with LinkedIn"
2. NextAuth handles redirect to LinkedIn authorization server
3. LinkedIn redirects back with authorization code
4. NextAuth exchanges code for access token and creates a secure session

### Token Lifecycle

- Access tokens stored securely in encrypted sessions
- Automatic token refresh when tokens are near expiry (7 days before)
- 360-day refresh window enforcement per LinkedIn's policy
- Clear error messages when refresh is no longer possible

### Bring Your Own Token

The dashboard includes a "Bring Your Own Token" section where you can paste a LinkedIn OAuth access token directly. The token is validated via the `/api/token-validate` endpoint before use. This is useful for testing with tokens obtained outside the OAuth flow.

### Token Introspection

- Built-in token inspector at `/token-introspect`
- Real-time token status, expiry, and scope information
- Automatic prompts for re-authentication when needed

### Sign-In Locations

All authentication touchpoints use the standard NextAuth client pattern (`signIn('linkedin')`):

- **Sign-In Page** (`/auth/signin`) - Primary entry point
- **Navigation Component** - Header sign-in link
- **Session Debug Page** (`/session-debug`) - Quick auth for testing
- **Debug Tools** (`/debug`) - OAuth debugging

## API Strategy Analysis

This dashboard implements **four distinct API strategies** to retrieve LinkedIn campaign analytics and demonstrate the impact of different approaches on data accuracy. Each strategy reveals important insights about LinkedIn's Professional Demographic restrictions.

### Strategy 1: Overall Summary (Benchmark)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=ALL`
- **Configuration**: No pivot, single aggregated result
- **Purpose**: Campaign Manager alignment and data validation
- **Characteristics**:
  - Single row of data covering entire date range
  - Most accurate totals matching Campaign Manager
  - No demographic filtering applied
- **Recommendation**: Gold standard for financial reconciliation and data validation

### Strategy 2: Geographic Breakdown (Production)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=ALL&pivot=MEMBER_COUNTRY_V2`
- **Configuration**: Single API call with geographic pivot
- **Purpose**: Demographic insights with acceptable data variance
- **Characteristics**:
  - Multiple rows (one per geographic region)
  - Professional demographic filtering applied
  - Minor data loss due to privacy thresholds (~0-5%)
- **Recommendation**: Best for production implementations requiring geographic insights

### Strategy 3: Monthly Breakdown (Temporal Analysis)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=MONTHLY&pivot=MEMBER_COUNTRY_V2`
- **Configuration**: Monthly granularity with geographic pivot
- **Purpose**: Time-series analysis with demographic breakdown
- **Characteristics**:
  - Monthly data points with geographic segmentation
  - Moderate data loss (typically 5-20%)
- **Recommendation**: Use with caution; always validate against benchmark strategy

### Strategy 4: Daily Breakdown (Single Call)

- **Endpoint**: `/rest/adAnalytics?q=analytics&timeGranularity=DAILY&pivot=MEMBER_COUNTRY_V2`
- **Configuration**: Single API call with daily granularity and geographic pivot
- **Purpose**: Demonstrate compounding data loss at daily granularity
- **Characteristics**:
  - Daily data points with geographic segmentation
  - Significant underreporting (often 20-50%+)
  - Compounded demographic filtering effects
- **Recommendation**: Not recommended for business decisions; educational demonstration only

> **Note:** The codebase also contains a legacy multi-call daily route (`/api/daily-analytics`) that makes one API call per day and aggregates results. The dashboard uses the single-call approach (`/api/daily-analytics-single`) instead.

### Professional Demographic Impact

The differences between strategies are due to LinkedIn's Professional Demographic restrictions:

- **Minimum Threshold**: Pivots require a minimum of 3 events per value
- **Privacy Filtering**: Values not returned for ads with insufficient member engagement
- **Compounding Effect**: More granular queries (daily + geographic) lose more data

**Typical Data Loss Patterns:**

| Strategy | Data Loss |
|----------|-----------|
| Overall Summary | 0% (no filtering) |
| Geographic Breakdown | 0-5% |
| Monthly Breakdown | 5-20% |
| Daily Breakdown | 20-50%+ |

## How to Use the API Strategy Analyzer

### 1. Authentication

- Sign in with LinkedIn or paste a custom access token in the "Bring Your Own Token" section
- Use the Token Inspector (`/token-introspect`) to check token status

### 2. Configure Analysis Parameters

The form has five fields:

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| **Account ID** | LinkedIn ad account ID | Yes | `518645095` |
| **Ad ID** | Campaign ID for filtering (`campaigns` parameter). Set to `0` or leave empty to skip. | No | `531508486` |
| **Ad Set ID** | Creative ID for filtering (`creatives` parameter). Leave empty to skip. | No | `1119860556` |
| **Start Date** | Inclusive start of date range | Yes | `2026-02-19` |
| **End Date** | Inclusive end of date range | No | _(empty)_ |

### 3. Execute Analysis

Click **"Get Analytics Data"** to trigger all four API strategies in parallel. The system makes four concurrent API calls and displays results in separate sections.

### 4. Review Results

Each strategy section shows:

- **Data table** with metrics: Impressions, Clicks, Cost (Local), Cost (USD), Likes, Comments, Shares
- **Totals row** aggregating all rows
- **Debug Session** with the exact curl command sent to the LinkedIn API
- **API Response** collapsible section showing the raw JSON response
- **Download CSV** button to export the data

A comparison section at the bottom shows metric differences and data loss percentages between strategies.

### 5. CSV Export

Each strategy has a "Download CSV" button. CSV files are named with the account ID, creative ID, and date range. Exports include all visible metrics.

### 6. Debug Tools

- **Session Debug** (`/session-debug`): Inspect authentication session
- **Token Inspector** (`/token-introspect`): Token analysis
- **OAuth Debug** (`/debug`): Test OAuth flow

## API Integration Details

### Primary Endpoint

All strategies call the LinkedIn `adAnalytics` endpoint:

```
GET https://api.linkedin.com/rest/adAnalytics?q=analytics
```

### Query Parameters by Strategy

**Strategy 1: Overall Summary (Benchmark)**

```
q=analytics
timeGranularity=ALL
accounts=List(urn:li:sponsoredAccount:{accountId})
creatives=List(urn:li:sponsoredCreative:{creativeId})    # optional
campaigns=List(urn:li:sponsoredCampaign:{campaignId})    # optional, when non-zero
dateRange=(start:(year:YYYY,month:MM,day:DD),end:(year:YYYY,month:MM,day:DD))
fields=dateRange,impressions,likes,shares,costInLocalCurrency,clicks,costInUsd,comments,pivotValues
```

**Strategy 2: Geographic Breakdown** — same as above plus `pivot=MEMBER_COUNTRY_V2`

**Strategy 3: Monthly Breakdown** — same as Strategy 2 but with `timeGranularity=MONTHLY`

**Strategy 4: Daily Breakdown** — same as Strategy 2 but with `timeGranularity=DAILY`

### API Route Architecture

```
/api/overall-analytics        -> Strategy 1: Benchmark totals (no pivot)
/api/analytics                -> Strategy 2: Geographic breakdown (pivot=MEMBER_COUNTRY_V2)
/api/monthly-analytics        -> Strategy 3: Monthly time-series (MONTHLY + pivot)
/api/daily-analytics-single   -> Strategy 4: Daily breakdown single call (DAILY + pivot)
/api/daily-analytics          -> Legacy: Daily per-day multi-call aggregation
```

All analytics routes accept these query parameters:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `accountId` | Yes | LinkedIn ad account ID |
| `startDate` | Yes | Start date (YYYY-MM-DD) |
| `creativeId` | No | Creative ID for filtering |
| `campaignId` | No | Campaign ID for filtering (skipped when `0`) |
| `endDate` | No | End date (YYYY-MM-DD) |

### Supporting Endpoints

```
/api/auth/[...nextauth]    -> OAuth 2.0 (NextAuth.js)
/api/token-validate        -> Validate a custom access token
/api/geo                   -> Resolve urn:li:geo:{id} to country name
/api/linkedin-introspect   -> Token introspection proxy
/api/linkedin-profile      -> User profile proxy
```

### Response Data Structure

Each analytics strategy returns:

```json
{
  "paging": { "start": 0, "count": 10, "links": [] },
  "elements": [
    {
      "impressions": 1000,
      "clicks": 50,
      "costInLocalCurrency": "25.50",
      "costInUsd": "25.50",
      "likes": 5,
      "comments": 2,
      "shares": 3,
      "pivotValues": ["urn:li:geo:103644278"],
      "dateRange": {
        "start": { "year": 2026, "month": 2, "day": 19 },
        "end": { "year": 2026, "month": 3, "day": 26 }
      }
    }
  ]
}
```

### Data Metrics Displayed

The UI displays these metrics for each strategy:

- **Impressions** — Total ad impressions
- **Clicks** — Total clicks on ads
- **Cost (Local)** — Spend in local currency
- **Cost (USD)** — Spend in USD
- **Likes** — Post likes
- **Comments** — Post comments
- **Shares** — Post shares
- **Geographic Region** — Country/region (when pivot is applied)
- **Date Range** — Coverage period for the data

## Testing Framework

The project uses Jest with React Testing Library. Tests cover all API strategies, components, utilities, and integration workflows.

### Test Architecture

```
__tests__/
├── components/                        # Component unit tests (4 files)
│   ├── AuthProvider.test.tsx             # Session provider integration
│   ├── Home.test.tsx                    # Main dashboard & API strategy testing
│   ├── Navigation.test.tsx              # Navigation & authentication states
│   └── TokenStatusComponent.test.tsx    # Token management interface
├── api/                               # API route tests (4 files)
│   ├── analytics.test.ts                # Geographic breakdown strategy
│   ├── daily-analytics.test.ts          # Daily aggregation strategy
│   ├── geo.test.ts                     # Geographic data resolution
│   └── overall-analytics.test.ts        # Benchmark strategy testing
├── lib/                               # Library tests (3 files)
│   ├── auth-config.test.ts              # NextAuth configuration
│   ├── linkedin-api-version.test.ts     # API version computation
│   └── linkedin-token-refresh.test.ts   # Token refresh logic
├── utils/                             # Utility tests (2 files)
│   ├── csv-export.test.ts               # CSV generation & download
│   └── data-processing.test.ts          # Data transformation utilities
├── integration/                       # Integration tests (2 files)
│   ├── analytics-workflow.test.ts       # Multi-strategy API testing
│   └── full-workflow.test.tsx           # End-to-end form + fetch workflow
└── data-processing-simple.test.ts     # Simple data processing utilities
```

**Test Statistics:**

- **Test Suites**: 16
- **Total Tests**: 136
- **Coverage Threshold**: 70% minimum (branches, functions, lines, statements)

### Running Tests

```bash
npm test                              # Run all tests
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report
npm test -- __tests__/api/            # API tests only
npm test -- __tests__/components/     # Component tests only
npm test -- --verbose                 # Verbose output
```

### Test Configuration

**`jest.config.js`** uses `next/jest` with `createJestConfig`, `jsdom` test environment, `v8` coverage provider, and `moduleNameMapper` for the `@/*` path alias. Coverage collects from `app/**/*` and `lib/**/*` (excluding layout, loading, not-found, and CSS files).

**`jest.setup.js`** (174 lines) sets up:
- `@testing-library/jest-dom` matchers
- `TextEncoder`/`TextDecoder` polyfills
- Mocks for `next/navigation` (`useRouter`, `useSearchParams`, `usePathname`)
- Mocks for `next/server` (`NextRequest`, `NextResponse`)
- Mocks for `next-auth/react` and `next-auth/providers/linkedin`
- Global `fetch`, `Request`, and `Response` mocks
- Environment variables (`NEXTAUTH_SECRET`, `LINKEDIN_*`)
- Console mock suppression in `beforeEach`/`afterEach`

## Project Architecture

### Directory Structure

```
reporting-api-analysis/
├── app/                              # Next.js 15 App Router
│   ├── api/                          # API Routes
│   │   ├── auth/[...nextauth]/       # OAuth 2.0 (NextAuth.js)
│   │   ├── analytics/                # Strategy 2: Geographic breakdown
│   │   ├── overall-analytics/        # Strategy 1: Benchmark (no pivot)
│   │   ├── monthly-analytics/        # Strategy 3: Monthly time-series
│   │   ├── daily-analytics-single/   # Strategy 4: Daily single-call
│   │   ├── daily-analytics/          # Legacy: Daily per-day multi-call
│   │   ├── token-validate/           # Custom token validation
│   │   ├── geo/                      # Geographic ID resolution
│   │   ├── linkedin-introspect/      # Token introspection proxy
│   │   └── linkedin-profile/         # User profile proxy
│   ├── components/                   # React components
│   │   ├── AuthProvider.tsx          # NextAuth session provider
│   │   ├── Navigation.tsx            # App navigation bar
│   │   └── TokenStatusComponent.tsx  # Token status display
│   ├── lib/
│   │   └── auth-config.ts            # NextAuth config (JWT callbacks, LinkedIn provider)
│   ├── auth/                         # Auth pages
│   │   ├── signin/page.tsx           # Sign-in page
│   │   └── error/page.tsx            # OAuth error page
│   ├── debug/page.tsx                # OAuth debug page
│   ├── session-debug/page.tsx        # Session inspection
│   ├── token-introspect/page.tsx     # Token analysis page
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout (AuthProvider + Navigation)
│   └── page.tsx                      # Main dashboard (~2800 lines)
├── lib/                              # Shared utilities
│   ├── linkedin-token-refresh.ts     # Token refresh/expiry/introspect
│   └── linkedin-api-version.ts       # Dynamic API version computation
├── utils/                            # Data utilities
│   ├── csv-export.ts                 # CSV generation & download for all 4 strategies
│   └── data-processing.ts           # Metric calculations & data transformation
├── types/
│   └── next-auth.d.ts                # NextAuth session type extensions
├── __tests__/                        # Test suite (16 suites, 136 tests)
│   ├── components/                   # 4 component test files
│   ├── api/                          # 4 API route test files
│   ├── lib/                          # 3 library test files
│   ├── utils/                        # 2 utility test files
│   ├── integration/                  # 2 integration test files
│   └── data-processing-simple.test.ts
├── jest.config.js                    # Jest configuration
├── jest.setup.js                     # Test setup (174 lines)
├── next.config.js                    # Next.js config (strips console in production)
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript config (@ path alias)
└── .env.local.example                # Environment variables template
```

### Technologies

- **Next.js 15** — React framework with App Router
- **NextAuth.js** — OAuth 2.0 authentication
- **TypeScript** — Type-safe JavaScript
- **Tailwind CSS** — Utility-first CSS framework
- **Jest + React Testing Library** — Testing
- **LinkedIn Marketing API** — Campaign analytics
- **LinkedIn OAuth 2.0** — Authentication

## Troubleshooting

### Authentication Issues

- **"Invalid redirect_uri"**: Ensure redirect URL in LinkedIn app matches exactly: `http://localhost:3000/api/auth/callback/linkedin`
- **"Invalid scope"**: Check that all required scopes are enabled and `LINKEDIN_SCOPE` is set correctly
- **"Access token missing"**: Visit `/session-debug` to inspect session data

### Token Issues

- **"Token expired"**: Use Token Inspector to check status; re-authenticate when needed
- **"Insufficient permissions"**: Verify your LinkedIn account has access to the ad accounts

### API Issues

- **401 errors**: Token may be expired or invalid; re-authenticate
- **No data returned**: Verify the account/campaign/creative IDs exist and had activity in the date range
- **Geographic discrepancies**: Expected due to Professional Demographic privacy thresholds (minimum 3 events)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/improvement`
3. Run tests: `npm test`
4. Ensure build passes: `npm run build`
5. Submit a pull request

### Development Guidelines

- Maintain test coverage above 70%
- Follow TypeScript best practices
- Test all four API strategies when making API changes
- Update this README for new features

## Learning Resources

- [LinkedIn Marketing API Overview](https://learn.microsoft.com/en-us/linkedin/marketing/)
- [Analytics API Reference](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting)
- [Professional Demographic Restrictions](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2026-02&tabs=http#restrictions)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js App Router Guide](https://nextjs.org/docs/app)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built for LinkedIn Marketing API developers and data analysts**

_Last updated: March 2026 | LinkedIn API Version: 202603_
