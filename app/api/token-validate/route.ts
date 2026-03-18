import { NextRequest, NextResponse } from 'next/server'
import { getLinkedInApiVersion } from '@/lib/linkedin-api-version'

async function testTokenWithApiCall(token: string, apiVersion: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.linkedin.com/rest/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
    console.log('Token API test response status:', response.status)
    return response.ok
  } catch (err) {
    console.error('Token API test error:', err)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token is required', active: false },
        { status: 400 }
      )
    }

    const trimmedToken = token.trim()

    const introspectResponse = await fetch(
      'https://www.linkedin.com/oauth/v2/introspectToken',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'LinkedIn-Version': getLinkedInApiVersion(),
        },
        body: new URLSearchParams({
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          token: trimmedToken,
        }),
      }
    )

    let introspectionResult = { active: false } as Record<string, unknown>
    if (introspectResponse.ok) {
      introspectionResult = await introspectResponse.json()
    }

    if (!introspectionResult.active) {
      const apiVersion = getLinkedInApiVersion()
      const apiCallValid = await testTokenWithApiCall(trimmedToken, apiVersion)

      if (apiCallValid) {
        return NextResponse.json({
          active: true,
          status: 'active',
          validatedVia: 'api_call',
          message: 'Token validated via API call (introspection unavailable — token may belong to a different OAuth app)',
        })
      }

      return NextResponse.json({
        ...introspectionResult,
        active: false,
        validatedVia: 'introspection',
      })
    }

    const expiresAt = introspectionResult.expires_at as number | undefined
    const createdAt = introspectionResult.created_at as number | undefined
    const now = Math.floor(Date.now() / 1000)

    return NextResponse.json({
      ...introspectionResult,
      validatedVia: 'introspection',
      computed: {
        isExpired: expiresAt ? now >= expiresAt : false,
        expiresInDays: expiresAt
          ? Math.round((expiresAt - now) / (24 * 60 * 60))
          : null,
        ageInDays: createdAt
          ? Math.round((now - createdAt) / (24 * 60 * 60))
          : null,
      },
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', active: false },
      { status: 500 }
    )
  }
}
