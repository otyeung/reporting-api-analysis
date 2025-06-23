import type { NextAuthOptions } from 'next-auth'
import LinkedInProvider from 'next-auth/providers/linkedin'
import {
  refreshLinkedInToken,
  shouldRefreshToken,
  isTokenExpired,
  isRefreshTokenValid,
} from '../../lib/linkedin-token-refresh'

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
      profile(profile: any, tokens: any) {
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
    async jwt({ token, account, profile, trigger }) {
      console.log('JWT callback triggered:', { trigger })

      // Initial sign in - save the account info
      if (account && profile) {
        console.log('JWT callback - Initial sign in, saving account info')
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.tokenType = account.token_type || 'Bearer'

        // Store additional LinkedIn info
        token.linkedinId = (profile as any).id
        token.name =
          `${
            (profile as any).localizedFirstName ||
            (profile as any).firstName?.localized?.en_US ||
            ''
          } ${
            (profile as any).localizedLastName ||
            (profile as any).lastName?.localized?.en_US ||
            ''
          }`.trim() || 'LinkedIn User'
        token.email = (profile as any).emailAddress || null

        return token
      }

      // Check if we need to refresh the token
      if (!token.accessToken || !token.expiresAt) {
        console.log(
          'JWT callback - No access token or expiry, returning token as is'
        )
        return token
      }

      const expiresAt = Number(token.expiresAt)

      // Check if token is expired
      if (isTokenExpired(expiresAt)) {
        console.log('JWT callback - Token is expired')
        if (!token.refreshToken) {
          console.log('JWT callback - No refresh token available')
          return { ...token, error: 'RefreshTokenMissing' }
        }

        if (!isRefreshTokenValid(expiresAt)) {
          console.log('JWT callback - Refresh token is beyond 365-day window')
          return { ...token, error: 'RefreshTokenExpired' }
        }

        console.log('JWT callback - Attempting token refresh')
        try {
          const refreshedTokens = await refreshLinkedInToken(
            token.refreshToken as string
          )

          console.log('JWT callback - Token refresh successful')
          return {
            ...token,
            accessToken: refreshedTokens.accessToken,
            expiresAt: refreshedTokens.expiresAt,
            error: undefined,
          }
        } catch (error) {
          console.error('JWT callback - Token refresh failed:', error)
          return { ...token, error: 'RefreshAccessTokenError' }
        }
      }

      // Check if we should refresh proactively (7 days before expiry)
      if (shouldRefreshToken(expiresAt)) {
        console.log('JWT callback - Token should be refreshed proactively')
        if (token.refreshToken && isRefreshTokenValid(expiresAt)) {
          try {
            const refreshedTokens = await refreshLinkedInToken(
              token.refreshToken as string
            )

            console.log('JWT callback - Proactive token refresh successful')
            return {
              ...token,
              accessToken: refreshedTokens.accessToken,
              expiresAt: refreshedTokens.expiresAt,
              error: undefined,
            }
          } catch (error) {
            console.error(
              'JWT callback - Proactive token refresh failed:',
              error
            )
            // Don't return error for proactive refresh failures
            // Token is still valid for a few more days
          }
        }
      }

      console.log('JWT callback - Token is valid, no refresh needed')
      return token
    },

    async session({ session, token }) {
      // Pass token info to the session
      ;(session as any).accessToken = token.accessToken as string
      ;(session as any).refreshToken = token.refreshToken as string
      ;(session as any).expiresAt = token.expiresAt as number
      ;(session as any).tokenType = token.tokenType as string
      ;(session as any).linkedinId = token.linkedinId as string
      ;(session as any).error = token.error as string | undefined

      // Add user info from token
      if (token.name) {
        session.user = session.user || {}
        session.user.name = token.name as string
      }
      if (token.email) {
        session.user = session.user || {}
        session.user.email = token.email as string
      }

      // Calculate days until expiry for display
      if ((session as any).expiresAt) {
        const now = Math.floor(Date.now() / 1000)
        const daysUntilExpiry = Math.ceil(
          ((session as any).expiresAt - now) / 86400
        )

        ;(session as any).tokenStatus = {
          expiresInDays: daysUntilExpiry,
          isNearExpiry: daysUntilExpiry <= 7,
          message:
            daysUntilExpiry <= 7
              ? `Your LinkedIn token expires in ${daysUntilExpiry} days. It will be automatically refreshed.`
              : `Your LinkedIn token is valid for ${daysUntilExpiry} more days.`,
        }
      }

      console.log('Session callback - Session created:', {
        accessToken: (session as any).accessToken ? 'present' : 'missing',
        expiresAt: (session as any).expiresAt,
        error: (session as any).error || 'none',
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
