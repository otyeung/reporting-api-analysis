import { GET } from '../../app/api/analytics/route'
import { NextRequest } from 'next/server'

// Mock NextAuth to avoid provider issues
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

describe('/api/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('should return 401 if access token is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3001/api/analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Access token not provided in Authorization header')
  })

  it('should successfully fetch analytics data', async () => {
    const mockAnalyticsResponse = {
      elements: [
        {
          dateRange: {
            start: { year: 2023, month: 1, day: 1 },
            end: { year: 2023, month: 1, day: 31 },
          },
          impressions: 1000,
          likes: 10,
          shares: 4,
          costInLocalCurrency: '100.50',
          clicks: 50,
          costInUsd: '120.25',
          comments: 3,
          pivotValues: ['urn:li:geo:103644278'],
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockAnalyticsResponse),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('elements')
    expect(data.elements).toHaveLength(1)
    expect(data.elements[0]).toHaveProperty('impressions', 1000)
    expect(data.elements[0]).toHaveProperty('clicks', 50)
    expect(data.elements[0]).toHaveProperty('costInLocalCurrency', '100.50')
    expect(data.elements[0]).toHaveProperty('costInUsd', '120.25')

    const [calledUrl] = (global.fetch as jest.Mock).mock.calls[0]
    expect(calledUrl).toContain('pivot=MEMBER_COUNTRY_V2')
    expect(calledUrl).toContain('creatives=List(urn%3Ali%3AsponsoredCreative%3A456)')
    expect(calledUrl).toContain('accounts=List(urn%3Ali%3AsponsoredAccount%3A123)')
    expect(calledUrl).not.toContain('campaigns=')
  })

  it('should handle LinkedIn API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: jest.fn().mockResolvedValue('Unauthorized'),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('LinkedIn API request failed: 401')
  })

  it('should handle network errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const request = new NextRequest(
      'http://localhost:3001/api/analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle missing required parameters', async () => {
    const request = new NextRequest('http://localhost:3001/api/analytics', {
      method: 'GET',
      headers: { authorization: 'Bearer test-token' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Missing required parameters: accountId, creativeId, startDate'
    )
  })

  it('should validate date format', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('Invalid date')
    })

    const request = new NextRequest(
      'http://localhost:3001/api/analytics?accountId=123&creativeId=456&startDate=invalid-date&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
