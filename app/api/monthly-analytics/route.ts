import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token found' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const startDate = searchParams.get('startDate') // YYYY-MM-DD format
    const endDate = searchParams.get('endDate') // YYYY-MM-DD format

    if (!campaignId || !startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: campaignId, startDate, endDate',
        },
        { status: 400 }
      )
    }

    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Build the LinkedIn API URL for monthly analytics with geographic pivot
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`
    const dateRangeParam = `(start:(year:${start.getFullYear()},month:${
      start.getMonth() + 1
    },day:${start.getDate()}),end:(year:${end.getFullYear()},month:${
      end.getMonth() + 1
    },day:${end.getDate()}))`
    const fieldsParam =
      'dateRange,costInLocalCurrency,impressions,viralImpressions,likes,comments,shares,clicks,actionClicks,adUnitClicks,follows,companyPageClicks,landingPageClicks,oneClickLeadFormOpens,oneClickLeads,pivotValues,sends,approximateMemberReach,viralClicks,viralFollows'

    // Build the URL with MONTHLY granularity and geographic pivot
    let urlString = 'https://api.linkedin.com/rest/adAnalytics'
    urlString += '?q=analytics'
    urlString += '&timeGranularity=MONTHLY'
    urlString += '&pivot=MEMBER_COUNTRY_V2'
    urlString += `&campaigns=List(${encodeURIComponent(campaignUrn)})`
    urlString += `&dateRange=${dateRangeParam}`
    urlString += `&fields=${fieldsParam}`

    console.log('Monthly Analytics API URL:', urlString)

    const response = await fetch(urlString, {
      method: 'GET',
      headers: {
        'LinkedIn-Version': '202506',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn API Error:', response.status, errorText)
      return NextResponse.json(
        {
          error: `LinkedIn API Error: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Monthly Analytics API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
