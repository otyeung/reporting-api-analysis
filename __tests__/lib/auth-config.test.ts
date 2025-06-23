import * as tokenRefresh from '../../lib/linkedin-token-refresh'

// Mock the token refresh utilities
jest.mock('../../lib/linkedin-token-refresh')

// Mock LinkedIn provider to avoid network calls
jest.mock('next-auth/providers/linkedin', () => {
  return jest.fn(() => ({
    id: 'linkedin',
    name: 'LinkedIn',
    type: 'oauth',
    authorization: {
      url: 'https://www.linkedin.com/oauth/v2/authorization',
    },
    token: {
      url: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    userinfo: {
      url: 'https://api.linkedin.com/v2/me',
    },
    profile: jest.fn(),
    idToken: false,
    checks: ['state'],
  }))
})

describe('Auth Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have token refresh utility available', () => {
    expect(tokenRefresh.refreshLinkedInToken).toBeDefined()
    expect(typeof tokenRefresh.refreshLinkedInToken).toBe('function')
  })

  it('should be able to import auth configuration', async () => {
    // Just test that the module can be imported without errors
    const authConfig = await import('../../app/lib/auth-config')
    expect(authConfig.authOptions).toBeDefined()
    expect(authConfig.authOptions.providers).toBeDefined()
  })

  it('should have callbacks configured', async () => {
    const authConfig = await import('../../app/lib/auth-config')
    expect(authConfig.authOptions.callbacks).toBeDefined()
    if (authConfig.authOptions.callbacks) {
      expect(authConfig.authOptions.callbacks.jwt).toBeDefined()
      expect(authConfig.authOptions.callbacks.session).toBeDefined()
    }
  })

  it('should have pages configuration', async () => {
    const authConfig = await import('../../app/lib/auth-config')
    expect(authConfig.authOptions.pages).toBeDefined()
    if (authConfig.authOptions.pages) {
      expect(authConfig.authOptions.pages.signIn).toBe('/auth/signin')
      expect(authConfig.authOptions.pages.error).toBe('/auth/error')
    }
  })

  it('should have session configuration', async () => {
    const authConfig = await import('../../app/lib/auth-config')
    expect(authConfig.authOptions.session).toBeDefined()
    if (authConfig.authOptions.session) {
      expect(authConfig.authOptions.session.strategy).toBe('jwt')
      // maxAge is optional and may not be set, using default NextAuth settings
    }
  })
})
