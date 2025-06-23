import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch globally
global.fetch = jest.fn()

// Mock LinkedIn provider to avoid profile() calls that expect network responses
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
    profile: jest.fn().mockResolvedValue({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
    }),
    idToken: false,
    checks: ['state'],
  }))
})

// Mock Request and Response for API tests
global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new Headers(init?.headers),
  body: init?.body,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
}))

global.Response = jest.fn().mockImplementation((body, init) => ({
  ok: init?.status ? init.status < 400 : true,
  status: init?.status || 200,
  statusText: init?.statusText || 'OK',
  headers: new Headers(init?.headers),
  json: jest.fn().mockResolvedValue(JSON.parse(body || '{}')),
  text: jest.fn().mockResolvedValue(body || ''),
}))

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, init) {
      this.url = url || 'http://localhost:3000'
      this.method = init?.method || 'GET'
      this._body = init?.body

      // Create headers object with get method
      this.headers = {
        get: (name) => {
          const headers = init?.headers || {}
          return headers[name.toLowerCase()] || null
        },
      }

      // Set up nextUrl
      this.nextUrl = {
        searchParams: new URLSearchParams((this.url || '').split('?')[1] || ''),
      }
    }

    async json() {
      if (this.method === 'GET') {
        // For GET requests, we don't have a body, so simulate empty object
        return {}
      }
      return this._body ? JSON.parse(this._body) : {}
    }
  },
  NextResponse: class NextResponse {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Map(Object.entries(init?.headers || {}))
    }

    static json(data, init) {
      const response = new NextResponse(JSON.stringify(data), {
        status: init?.status || 200,
        statusText: init?.statusText || 'OK',
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
        },
      })
      response._jsonData = data
      return response
    }

    async json() {
      return this._jsonData || JSON.parse(this.body || '{}')
    }

    async text() {
      return this.body || ''
    }
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: jest.fn(() => '/'),
}))

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: jest.fn(),
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3001'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.LINKEDIN_CLIENT_ID = 'test-client-id'
process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret'
process.env.LINKEDIN_SCOPE = 'r_ads_reporting,r_basicprofile,r_ads,rw_ads'
process.env.LINKEDIN_API_VERSION = '202506'

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleLog = console.log

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.log = originalConsoleLog
  jest.clearAllMocks()
})
