import { NextRequest, NextResponse } from 'next/server'

interface GeoResponse {
  defaultLocalizedName: {
    locale: {
      country: string
      language: string
    }
    value: string
  }
  id: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const geoId = searchParams.get('id')

    if (!geoId) {
      return NextResponse.json({ error: 'Geo ID is required' }, { status: 400 })
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

    // Make API request to LinkedIn Geo API
    const response = await fetch(`https://api.linkedin.com/v2/geo/${geoId}`, {
      method: 'GET',
      headers: {
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': apiVersion,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn Geo API Error:', response.status, errorText)

      // Return a fallback response instead of failing
      return NextResponse.json({
        defaultLocalizedName: {
          locale: { country: 'US', language: 'en' },
          value: `Geo: ${geoId}`,
        },
        id: parseInt(geoId),
      })
    }

    const data: GeoResponse = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Geo API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
