import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      )
    }

    const response = await fetch(
      'https://www.linkedin.com/oauth/v2/introspectToken',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202409',
        },
        body: new URLSearchParams({
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          token: session.accessToken,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn token introspection failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      return NextResponse.json(
        { error: `Token introspection failed: ${response.status}` },
        { status: response.status }
      )
    }

    const introspectionResult = await response.json()

    // Add some helpful computed fields
    const now = Math.floor(Date.now() / 1000)
    const result = {
      ...introspectionResult,
      computed: {
        isExpired: introspectionResult.expires_at
          ? now >= introspectionResult.expires_at
          : false,
        expiresInDays: introspectionResult.expires_at
          ? Math.round((introspectionResult.expires_at - now) / (24 * 60 * 60))
          : null,
        ageInDays: introspectionResult.created_at
          ? Math.round((now - introspectionResult.created_at) / (24 * 60 * 60))
          : null,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error introspecting LinkedIn token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
