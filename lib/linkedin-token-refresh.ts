// Utility function to refresh LinkedIn access token
export async function refreshLinkedInToken(refreshToken: string) {
  try {
    console.log('Attempting to refresh LinkedIn token...')

    const response = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const tokens = await response.json()
    console.log('LinkedIn token refreshed successfully:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
    })

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken, // Keep old refresh token if new one not provided
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in, // Convert to Unix timestamp
    }
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error)
    throw error
  }
}

// Check if token needs refresh (refresh 7 days before expiry)
export function shouldRefreshToken(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const sevenDaysInSeconds = 7 * 24 * 60 * 60
  return expiresAt - now < sevenDaysInSeconds
}

// Check if token is completely expired
export function isTokenExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return now >= expiresAt
}

// Check if refresh token is still valid (LinkedIn allows refresh for up to 360 days)
export function isRefreshTokenValid(tokenIssuedAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const maxRefreshPeriod = 360 * 24 * 60 * 60 // 360 days in seconds
  return now - tokenIssuedAt < maxRefreshPeriod
}

// Introspect LinkedIn access token to get detailed information
export async function introspectLinkedInToken(accessToken: string) {
  try {
    console.log('Introspecting LinkedIn token...')

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
          token: accessToken,
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
      throw new Error(`Token introspection failed: ${response.status}`)
    }

    const result = await response.json()
    console.log('LinkedIn token introspection successful:', {
      active: result.active,
      status: result.status,
      expires_at: result.expires_at,
      scope: result.scope,
    })

    return result
  } catch (error) {
    console.error('Error introspecting LinkedIn token:', error)
    throw error
  }
}
