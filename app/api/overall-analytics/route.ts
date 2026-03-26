import { NextRequest, NextResponse } from 'next/server'
import { getLinkedInApiVersion } from '@/lib/linkedin-api-version'

interface DateRange {
  start: {
    year: number
    month: number
    day: number
  }
  end?: {
    year: number
    month: number
    day: number
  }
}

interface AnalyticsElement {
  dateRange: DateRange
  impressions: number
  likes: number
  shares: number
  costInLocalCurrency: string
  clicks: number
  costInUsd: string
  comments: number
  pivotValues: string[]
}

interface LinkedInAnalyticsResponse {
  paging: {
    start: number
    count: number
    links: Record<string, unknown>[]
  }
  elements: AnalyticsElement[]
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for GET request
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const creativeId = searchParams.get('creativeId')
    const campaignId = searchParams.get('campaignId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!accountId || !startDate) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters: accountId, startDate',
        },
        { status: 400 }
      )
    }

    // Parse dates
    const start = new Date(startDate)

    // Format start date for LinkedIn API
    const startFormatted = {
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      day: start.getDate(),
    }

    // Get access token from Authorization header and API version from environment
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')
    const apiVersion = getLinkedInApiVersion()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not provided in Authorization header' },
        { status: 401 }
      )
    }

    // Construct LinkedIn API URL with accounts (NO PIVOT)
    const accountUrn = `urn:li:sponsoredAccount:${accountId}`
    let dateRangeParam = `(start:(year:${startFormatted.year},month:${startFormatted.month},day:${startFormatted.day})`
    if (endDate) {
      const end = new Date(endDate)
      dateRangeParam += `,end:(year:${end.getFullYear()},month:${end.getMonth() + 1},day:${end.getDate()})`
    }
    dateRangeParam += ')'
    const fieldsParam =
      'dateRange,impressions,likes,shares,costInLocalCurrency,clicks,costInUsd,comments,pivotValues'

    // Build the URL with accounts (NO PIVOT)
    let urlString = 'https://api.linkedin.com/rest/adAnalytics'
    urlString += '?q=analytics'
    urlString += '&timeGranularity=ALL'
    if (creativeId) {
      const creativeUrn = `urn:li:sponsoredCreative:${creativeId}`
      urlString += `&creatives=List(${encodeURIComponent(creativeUrn)})`
    }
    urlString += `&accounts=List(${encodeURIComponent(accountUrn)})`
    if (campaignId && campaignId !== '0') {
      const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`
      urlString += `&campaigns=List(${encodeURIComponent(campaignUrn)})`
    }
    urlString += `&dateRange=${dateRangeParam}`
    urlString += `&fields=${fieldsParam}`

    console.log('LinkedIn Overall Analytics API URL:', urlString)

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
      console.error('LinkedIn Overall Analytics API Error Details:')
      console.error('Status:', response.status)
      console.error('Status Text:', response.statusText)
      console.error('Response:', errorText)
      console.error('Request URL:', urlString)

      return NextResponse.json(
        {
          error: `LinkedIn API request failed: ${response.status}`,
          details: errorText,
          url: urlString,
        },
        { status: response.status }
      )
    }

    const data: LinkedInAnalyticsResponse = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Overall Analytics API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
