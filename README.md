# Reporting API Analysis

A Next.js application that demonstrates and compares three different LinkedIn Analytics API strategies for campaign reporting. This tool helps analyze the differences between various API approaches and their data consistency.

## Overview

This dashboard implements three distinct API strategies to retrieve LinkedIn campaign analytics:

1. **Overall Summary** - Single API call with `timeGranularity=ALL` and no pivot (campaign totals)
2. **Geographic Breakdown** - Single API call with `timeGranularity=ALL` and geographic pivot
3. **Daily Breakdown** - Multiple API calls with `timeGranularity=DAILY` and geographic pivot (one call per day)

## Features

- **Three API Strategy Comparison**: Compare data consistency across different LinkedIn API approaches
- **Real-time Data Fetching**: Parallel API calls for efficient data retrieval
- **Geographic Mapping**: Automatic resolution of LinkedIn geo IDs to country names
- **Data Visualization**: Clean, responsive tables for each API strategy
- **Comprehensive Analysis**: Side-by-side comparison of all three approaches with difference analysis
- **Error Handling**: Robust error handling for individual API calls and data inconsistencies
- **Modern UI**: Built with Tailwind CSS for responsive design

## API Strategies Explained

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

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- Valid LinkedIn API access token

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure your LinkedIn API access token in the `.env` file:

```
ACCESS_TOKEN=your_linkedin_access_token_here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) (or the next available port) in your browser.

## Usage

1. **Enter Campaign Information**:

   - Input the LinkedIn campaign ID you want to analyze
   - Select the start and end dates for your analytics period

2. **Submit Analysis**:

   - Click "Get Analytics Data" to trigger all three API strategies simultaneously
   - The system will make parallel calls to optimize performance

3. **Review Results**:

   - **Overall Summary Table**: Campaign totals with key metrics (CTR, CPM, engagement)
   - **Geographic Breakdown Table**: Performance by country/region
   - **Daily Breakdown Table**: Day-by-day data with geographic breakdown
   - **Comparison Section**: Side-by-side analysis of all three approaches

4. **Analyze Differences**:
   - Review the comparison section to identify data discrepancies
   - Understand which approach provides the most accurate or complete data
   - Use insights to optimize your reporting strategy

## Data Metrics Displayed

- **Impressions**: Total ad impressions
- **Clicks**: Total clicks on ads
- **Cost**: Total spend in local currency
- **CTR**: Click-through rate (clicks/impressions)
- **CPM**: Cost per mille (cost per 1000 impressions)
- **Company Page Clicks**: Clicks to company page
- **Engagement**: Likes, comments, shares, and follows
- **Geographic Region**: Country/region breakdown (when applicable)
- **Date Range**: Coverage period for the data

## API Integration

The application integrates with multiple LinkedIn Analytics API endpoints:

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

### Geographic Resolution Endpoint

```
GET /rest/regions/{geoId}
```

Used to resolve LinkedIn geo IDs (e.g., `urn:li:geo:103644278`) to human-readable country names.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── analytics/
│   │   │   └── route.ts          # Geographic breakdown API strategy
│   │   ├── daily-analytics/
│   │   │   └── route.ts          # Daily breakdown API strategy
│   │   ├── geo/
│   │   │   └── route.ts          # Geographic ID resolution
│   │   └── overall-analytics/
│   │       └── route.ts          # Overall summary API strategy
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main dashboard with three-strategy comparison
├── .env                          # Environment variables (LinkedIn access token)
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

## Key Implementation Details

### Parallel API Execution

All three strategies execute simultaneously using `Promise.all()` for optimal performance.

### Geographic Data Caching

Country names are cached client-side to minimize repeated geo API calls.

### Error Handling Per Strategy

Each API strategy has independent error handling, allowing partial results if some strategies fail.

### Data Consistency Analysis

Built-in comparison logic identifies discrepancies between strategies and highlights potential data quality issues.

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **LinkedIn Analytics API** - For campaign data retrieval

## Environment Variables

Set up your `.env` file with your LinkedIn API credentials:

```env
ACCESS_TOKEN=your_linkedin_api_access_token
```

### Getting LinkedIn API Access

1. Create a LinkedIn application at [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Request access to the Marketing API
3. Generate an access token with appropriate scopes:
   - `r_ads_reporting`
   - `r_organization_social`
4. Add the token to your `.env` file

## Error Handling

Comprehensive error handling includes:

- **Individual Strategy Failures**: Each API strategy can fail independently
- **Partial Results**: Display available data even if some strategies fail
- **API Rate Limiting**: Proper handling of LinkedIn API rate limits
- **Network Issues**: Graceful degradation for connectivity problems
- **Invalid Tokens**: Clear error messaging for authentication issues
- **Data Validation**: Verification of API response structure
- **Geographic Resolution Errors**: Fallback to geo IDs when country names unavailable

## Performance Considerations

- **Parallel Execution**: All strategies run simultaneously
- **Caching**: Geographic names cached to reduce API calls
- **Optimized Daily Calls**: Daily strategy efficiently handles date ranges
- **Loading States**: Real-time feedback during data fetching
- **Error Boundaries**: Prevent single strategy failures from breaking the entire dashboard

## Use Cases

### Data Quality Analysis

Compare results across strategies to identify:

- Inconsistencies in LinkedIn's data processing
- Missing data in specific approaches
- Optimal strategy for different reporting needs

### Reporting Strategy Optimization

Determine which approach provides:

- Most complete data coverage
- Best performance characteristics
- Optimal balance of detail and efficiency

### API Behavior Understanding

Gain insights into:

- LinkedIn API response patterns
- Data aggregation differences
- Regional data availability

## Contributing

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
- Test all three API strategies thoroughly
- Ensure responsive design compatibility

## License

This project is for demonstration and analysis purposes. Please ensure compliance with:

- LinkedIn's API Terms of Service
- LinkedIn's Rate Limiting Guidelines
- Data Privacy Regulations (GDPR, CCPA, etc.)

## Troubleshooting

### Common Issues

**"Access token not configured"**

- Ensure `.env` file exists with valid `ACCESS_TOKEN`

**"LinkedIn API request failed: 401"**

- Verify your access token is valid and not expired
- Check that your LinkedIn app has required permissions

**"No analytics data found"**

- Verify campaign ID exists and you have access to it
- Check that the date range contains campaign activity
- Ensure campaign was active during the specified period

**Geo ID resolution failures**

- Geographic data may be limited for some regions
- The app will fallback to displaying geo IDs when names unavailable

### Performance Tips

- Use shorter date ranges for faster daily breakdown processing
- Monitor LinkedIn API rate limits in high-frequency usage
- Consider caching strategies for frequently accessed campaigns
