import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header from the client request
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not provided in Authorization header' },
        { status: 401 }
      )
    }

    console.log(
      'LinkedIn Profile API - Making request with token:',
      accessToken.substring(0, 20) + '...'
    )

    // Get API version from environment
    const apiVersion = process.env.LINKEDIN_API_VERSION || '202506'

    // Make the request to LinkedIn API from the server (no CORS issues)
    const response = await fetch('https://api.linkedin.com/v2/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'LinkedIn-Version': apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    console.log('LinkedIn API Response status:', response.status)
    console.log(
      'LinkedIn API Response headers:',
      Object.fromEntries(response.headers.entries())
    )

    // Get the response text first
    const responseText = await response.text()
    console.log('LinkedIn API Raw response:', responseText)

    if (!response.ok) {
      console.error('LinkedIn API Error Details:')
      console.error('Status:', response.status)
      console.error('Status Text:', response.statusText)
      console.error('Response:', responseText)

      return NextResponse.json(
        {
          error: `LinkedIn API request failed: ${response.status}`,
          details: responseText,
          status: response.status,
        },
        { status: response.status }
      )
    }

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error(
        'Failed to parse LinkedIn API response as JSON:',
        parseError
      )
      return NextResponse.json(
        {
          error: 'Invalid JSON response from LinkedIn API',
          rawResponse: responseText,
          parseError:
            parseError instanceof Error
              ? parseError.message
              : 'Unknown parse error',
        },
        { status: 500 }
      )
    }

    // Return the successful response
    return NextResponse.json(data)
  } catch (error) {
    console.error('LinkedIn Profile API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
