import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import LinkedInProvider from 'next-auth/providers/linkedin'

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
      // Persist the OAuth access_token to the token right after signin
      if (user) {
        token.sub = user.id
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        console.log('JWT callback - Account:', {
          access_token: account.access_token ? 'present' : 'missing',
          expires_at: account.expires_at,
        })
      }
      console.log('JWT callback - Token:', {
        accessToken: token.accessToken ? 'present' : 'missing',
        expiresAt: token.expiresAt,
      })
      return token
    },
    async session({ session, token }) {
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
      console.log('Session callback - Session:', {
        accessToken: session.accessToken ? 'present' : 'missing',
        expiresAt: session.expiresAt,
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
