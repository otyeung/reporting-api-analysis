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
  campaignId: string,
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

  const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`
  const dateRangeParam = `(start:(year:${year},month:${month},day:${day}),end:(year:${year},month:${month},day:${day}))`
  const fieldsParam =
    'dateRange,costInLocalCurrency,impressions,viralImpressions,likes,comments,shares,clicks,actionClicks,adUnitClicks,follows,companyPageClicks,landingPageClicks,oneClickLeadFormOpens,oneClickLeads,pivotValues,sends,approximateMemberReach,viralClicks,viralFollows'

  let urlString = 'https://api.linkedin.com/rest/adAnalytics'
  urlString += '?q=analytics'
  urlString += '&timeGranularity=DAILY'
  urlString += '&pivot=MEMBER_COUNTRY_V2'
  urlString += `&campaigns=List(${encodeURIComponent(campaignUrn)})`
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
        existing.actionClicks += element.actionClicks
        existing.viralImpressions += element.viralImpressions
        existing.comments += element.comments
        existing.oneClickLeads += element.oneClickLeads
        existing.landingPageClicks += element.landingPageClicks
        existing.adUnitClicks += element.adUnitClicks
        existing.follows += element.follows
        existing.oneClickLeadFormOpens += element.oneClickLeadFormOpens
        existing.companyPageClicks += element.companyPageClicks
        existing.costInLocalCurrency = (
          parseFloat(existing.costInLocalCurrency) +
          parseFloat(element.costInLocalCurrency)
        ).toString()
        existing.impressions += element.impressions
        existing.viralFollows += element.viralFollows
        existing.sends += element.sends
        existing.shares += element.shares
        existing.clicks += element.clicks
        existing.viralClicks += element.viralClicks
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, startDate, endDate }: LinkedInAnalyticsParams = body

    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')
    const apiVersion = process.env.LINKEDIN_API_VERSION || '202506'

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not provided in Authorization header' },
        { status: 401 }
      )
    }

    const days = getDaysBetween(startDate, endDate)
    console.log(`Fetching daily data for ${days.length} days:`, days)

    // Fetch data for each day
    const dailyPromises = days.map(async (date) => {
      const result = await fetchDayAnalytics(
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

    // Aggregate all elements for totals (only from successful calls)
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
