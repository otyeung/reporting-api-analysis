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

interface DailyAnalyticsResponse {
  dailyData: {
    date: string
    elements: AnalyticsElement[]
    apiStatus: 'success' | 'error' | 'no-data'
    errorMessage?: string
  }[]
  aggregated: AnalyticsElement[]
}

function getDaysBetween(startDate: string, endDate: string): string[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days: string[] = []

  const current = new Date(start)
  while (current <= end) {
    days.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return days
}

async function fetchDayAnalytics(
  accountId: string,
  creativeId: string | null,
  campaignId: string | null,
  date: string,
  accessToken: string,
  apiVersion: string
): Promise<{
  elements: AnalyticsElement[]
  apiStatus: 'success' | 'error' | 'no-data'
  errorMessage?: string
}> {
  const dateObj = new Date(date)
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()

  const accountUrn = `urn:li:sponsoredAccount:${accountId}`
  const dateRangeParam = `(start:(year:${year},month:${month},day:${day}))`
  const fieldsParam =
    'dateRange,impressions,likes,shares,costInLocalCurrency,clicks,costInUsd,comments,pivotValues'

  let urlString = 'https://api.linkedin.com/rest/adAnalytics'
  urlString += '?q=analytics'
  urlString += '&timeGranularity=DAILY'
  urlString += '&pivot=MEMBER_COUNTRY_V2'
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

  console.log(`Fetching data for ${date}:`, urlString)

  try {
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
      console.error(
        `LinkedIn API Error for ${date}:`,
        response.status,
        errorText
      )
      return {
        elements: [],
        apiStatus: 'error',
        errorMessage: `API Error ${response.status}: ${errorText}`,
      }
    }

    const data: LinkedInAnalyticsResponse = await response.json()
    console.log(`Data for ${date}:`, data.elements?.length || 0, 'elements')

    return {
      elements: data.elements || [],
      apiStatus:
        data.elements && data.elements.length > 0 ? 'success' : 'no-data',
    }
  } catch (error) {
    console.error(`Network error for ${date}:`, error)
    return {
      elements: [],
      apiStatus: 'error',
      errorMessage: `Network error: ${error}`,
    }
  }
}

function aggregateElements(
  allElements: AnalyticsElement[]
): AnalyticsElement[] {
  const aggregated = new Map<string, AnalyticsElement>()

  allElements.forEach((element) => {
    element.pivotValues.forEach((pivotValue) => {
      if (aggregated.has(pivotValue)) {
        const existing = aggregated.get(pivotValue)!
        existing.comments += element.comments
        existing.costInLocalCurrency = (
          parseFloat(existing.costInLocalCurrency) +
          parseFloat(element.costInLocalCurrency)
        ).toString()
        existing.costInUsd = (
          parseFloat(existing.costInUsd) + parseFloat(element.costInUsd)
        ).toString()
        existing.impressions += element.impressions
        existing.shares += element.shares
        existing.clicks += element.clicks
        existing.likes += element.likes
      } else {
        aggregated.set(pivotValue, {
          ...element,
          pivotValues: [pivotValue],
        })
      }
    })
  })

  return Array.from(aggregated.values())
}

export async function GET(request: NextRequest) {
  try {
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

    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')
    const apiVersion = getLinkedInApiVersion()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not provided in Authorization header' },
        { status: 401 }
      )
    }

    const days = endDate
      ? getDaysBetween(startDate, endDate)
      : [startDate]
    console.log(`Fetching daily data for ${days.length} days:`, days)

    const dailyPromises = days.map(async (date) => {
      const result = await fetchDayAnalytics(
        accountId,
        creativeId,
        campaignId,
        date,
        accessToken,
        apiVersion
      )
      return {
        date,
        elements: result.elements,
        apiStatus: result.apiStatus,
        errorMessage: result.errorMessage,
      }
    })

    const dailyResults = await Promise.all(dailyPromises)

    const allElements = dailyResults.flatMap((day) => day.elements)
    const aggregated = aggregateElements(allElements)

    const response: DailyAnalyticsResponse = {
      dailyData: dailyResults,
      aggregated,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Daily Analytics API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
