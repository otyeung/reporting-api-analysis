import { NextRequest, NextResponse } from 'next/server'

interface LinkedInAnalyticsParams {
  campaignId: string
  startDate: string
  endDate: string
}

interface DateRange {
  start: {
    year: number
    month: number
    day: number
  }
  end: {
    year: number
    month: number
    day: number
  }
}

interface AnalyticsElement {
  actionClicks: number
  viralImpressions: number
  comments: number
  oneClickLeads: number
  dateRange: DateRange
  landingPageClicks: number
  adUnitClicks: number
  follows: number
  oneClickLeadFormOpens: number
  companyPageClicks: number
  costInLocalCurrency: string
  impressions: number
  viralFollows: number
  sends: number
  shares: number
  clicks: number
  viralClicks: number
  pivotValues: string[]
  likes: number
}

interface LinkedInAnalyticsResponse {
  paging: {
    start: number
    count: number
    links: any[]
  }
  elements: AnalyticsElement[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, startDate, endDate }: LinkedInAnalyticsParams = body

    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Format dates for LinkedIn API
    const startFormatted = {
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      day: start.getDate(),
    }

    const endFormatted = {
      year: end.getFullYear(),
      month: end.getMonth() + 1,
      day: end.getDate(),
    }

    // Get access token and API version from environment
    const accessToken = process.env.ACCESS_TOKEN
    const apiVersion = process.env.API_VERSION || '202506'

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not configured' },
        { status: 500 }
      )
    }

    // Construct LinkedIn API URL exactly matching the working curl command
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`
    const dateRangeParam = `(start:(year:${startFormatted.year},month:${startFormatted.month},day:${startFormatted.day}),end:(year:${endFormatted.year},month:${endFormatted.month},day:${endFormatted.day}))`
    const fieldsParam =
      'dateRange,costInLocalCurrency,impressions,viralImpressions,likes,comments,shares,clicks,actionClicks,adUnitClicks,follows,companyPageClicks,landingPageClicks,oneClickLeadFormOpens,oneClickLeads,pivotValues,sends,approximateMemberReach,viralClicks,viralFollows'

    // Build the URL exactly as in the working curl command
    let urlString = 'https://api.linkedin.com/rest/adAnalytics'
    urlString += '?q=analytics'
    urlString += '&timeGranularity=ALL'
    urlString += '&pivot=MEMBER_COUNTRY_V2'
    urlString += `&campaigns=List(${encodeURIComponent(campaignUrn)})`
    urlString += `&dateRange=${dateRangeParam}`
    urlString += `&fields=${fieldsParam}`

    console.log('LinkedIn API URL:', urlString)
    console.log('Campaign URN:', campaignUrn)
    console.log('Date Range:', dateRangeParam)

    // Make API request to LinkedIn
    const response = await fetch(urlString, {
      method: 'GET',
      headers: {
        'LinkedIn-Version': apiVersion,
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn API Error Details:')
      console.error('Status:', response.status)
      console.error('Status Text:', response.statusText)
      console.error('Response:', errorText)
      console.error('Request URL:', urlString)

      // Try to parse error as JSON for more details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = JSON.stringify(errorJson, null, 2)
      } catch (e) {
        // errorText is not JSON, use as is
      }

      return NextResponse.json(
        {
          error: `LinkedIn API request failed: ${response.status}`,
          details: errorDetails,
          url: urlString,
        },
        { status: response.status }
      )
    }

    const data: LinkedInAnalyticsResponse = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
