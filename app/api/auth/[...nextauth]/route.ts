import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import LinkedInProvider from 'next-auth/providers/linkedin'
import {
  refreshLinkedInToken,
  shouldRefreshToken,
  isTokenExpired,
  isRefreshTokenValid,
} from '../../../../lib/linkedin-token-refresh'

export const authOptions: NextAuthOptions = {
  providers: [
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        url: 'https://www.linkedin.com/oauth/v2/authorization',
        params: {
          scope:
            process.env.LINKEDIN_SCOPE ||
            'r_ads_reporting,r_basicprofile,r_ads,rw_ads',
        },
      },
      token: {
        url: 'https://www.linkedin.com/oauth/v2/accessToken',
      },
      userinfo: {
        url: 'https://api.linkedin.com/v2/me',
      },
      // Disable ID token validation for LinkedIn
      idToken: false,
      checks: ['state'],
      profile(profile, tokens) {
        console.log('LinkedIn profile:', profile)
        console.log('LinkedIn tokens:', tokens)
        return {
          id: profile.id,
          name: `${
            profile.localizedFirstName ||
            profile.firstName?.localized?.en_US ||
            ''
          } ${
            profile.localizedLastName ||
            profile.lastName?.localized?.en_US ||
            ''
          }`,
          email: profile.emailAddress || null,
          image:
            profile.profilePicture?.['displayImage~']?.elements?.[0]
              ?.identifiers?.[0]?.identifier || null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Handle initial sign-in
      if (user) {
        token.sub = user.id
      }

      if (account) {
        // Initial token from LinkedIn OAuth
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.tokenIssuedAt = Math.floor(Date.now() / 1000) // Track when token was first issued

        console.log('JWT callback - Initial tokens from account:', {
          access_token: account.access_token ? 'present' : 'missing',
          refresh_token: account.refresh_token ? 'present' : 'missing',
          expires_at: account.expires_at,
        })

        return token
      }

      // Check if we have the necessary token data
      if (!token.accessToken || !token.expiresAt || !token.refreshToken) {
        console.log(
          'JWT callback - Missing token data, user needs to re-authenticate'
        )
        return token
      }

      // Check if refresh token is still valid (within 360 days)
      if (!isRefreshTokenValid(token.tokenIssuedAt as number)) {
        console.log(
          'JWT callback - Refresh token expired (>360 days), user needs to re-authenticate'
        )
        // Clear token data to force re-authentication
        token.accessToken = undefined
        token.refreshToken = undefined
        token.expiresAt = undefined
        token.error = 'RefreshTokenExpired'
        return token
      }

      // Check if token is completely expired
      if (isTokenExpired(token.expiresAt as number)) {
        console.log(
          'JWT callback - Access token expired, attempting refresh...'
        )
        try {
          const refreshedTokens = await refreshLinkedInToken(
            token.refreshToken as string
          )

          token.accessToken = refreshedTokens.accessToken
          token.refreshToken = refreshedTokens.refreshToken
          token.expiresAt = refreshedTokens.expiresAt
          token.error = undefined // Clear any previous errors

          console.log('JWT callback - Token refreshed successfully')
          return token
        } catch (error) {
          console.error('JWT callback - Token refresh failed:', error)
          token.error = 'RefreshAccessTokenError'
          return token
        }
      }

      // Check if token should be proactively refreshed (7 days before expiry)
      if (shouldRefreshToken(token.expiresAt as number)) {
        console.log(
          'JWT callback - Token expires soon, proactively refreshing...'
        )
        try {
          const refreshedTokens = await refreshLinkedInToken(
            token.refreshToken as string
          )

          token.accessToken = refreshedTokens.accessToken
          token.refreshToken = refreshedTokens.refreshToken
          token.expiresAt = refreshedTokens.expiresAt
          token.error = undefined // Clear any previous errors

          console.log('JWT callback - Token proactively refreshed')
          return token
        } catch (error) {
          console.error('JWT callback - Proactive token refresh failed:', error)
          // Don't set error since current token is still valid
          console.log('JWT callback - Continuing with current token')
        }
      }

      console.log('JWT callback - Token still valid:', {
        accessToken: token.accessToken ? 'present' : 'missing',
        expiresAt: token.expiresAt,
        daysUntilExpiry: token.expiresAt
          ? Math.round(
              ((token.expiresAt as number) - Math.floor(Date.now() / 1000)) /
                (24 * 60 * 60)
            )
          : 'unknown',
      })

      return token
    },
    async session({ session, token }) {
      // Handle token errors
      if (token.error) {
        console.log('Session callback - Token error detected:', token.error)

        if (token.error === 'RefreshTokenExpired') {
          session.error = 'RefreshTokenExpired'
          session.errorMessage =
            'Your LinkedIn session has expired (360 days). Please sign in again.'
        } else if (token.error === 'RefreshAccessTokenError') {
          session.error = 'RefreshAccessTokenError'
          session.errorMessage =
            'Unable to refresh your LinkedIn token. Please sign in again.'
        }

        // Don't include expired tokens in session
        return session
      }

      // Send properties to the client
      if (token?.sub) {
        session.user = session.user || {}
        session.user.id = token.sub
      }
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string
      }
      if (token?.refreshToken) {
        session.refreshToken = token.refreshToken as string
      }
      if (token?.expiresAt) {
        session.expiresAt = token.expiresAt as number
      }

      // Add token status information
      if (token.expiresAt) {
        const now = Math.floor(Date.now() / 1000)
        const daysUntilExpiry = Math.round(
          ((token.expiresAt as number) - now) / (24 * 60 * 60)
        )
        session.tokenStatus = {
          expiresInDays: daysUntilExpiry,
          isNearExpiry: daysUntilExpiry <= 7,
          message:
            daysUntilExpiry <= 7
              ? `Your LinkedIn token expires in ${daysUntilExpiry} days. It will be automatically refreshed.`
              : `Your LinkedIn token is valid for ${daysUntilExpiry} more days.`,
        }
      }

      console.log('Session callback - Session created:', {
        accessToken: session.accessToken ? 'present' : 'missing',
        expiresAt: session.expiresAt,
        error: session.error || 'none',
      })

      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
