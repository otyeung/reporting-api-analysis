import { GET } from '../../app/api/daily-analytics/route'
import { NextRequest } from 'next/server'

// Mock NextAuth to avoid provider issues
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

describe('/api/daily-analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if access token is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-05',
      {
        method: 'GET',
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Access token not provided in Authorization header')
  })

  it('should successfully fetch daily analytics data', async () => {
    const mockAnalyticsResponse = {
      elements: [
        {
          dateRange: {
            start: { year: 2023, month: 1, day: 1 },
            end: { year: 2023, month: 1, day: 1 },
          },
          actionClicks: 1,
          viralImpressions: 0,
          comments: 0,
          oneClickLeads: 0,
          landingPageClicks: 2,
          adUnitClicks: 0,
          follows: 0,
          oneClickLeadFormOpens: 0,
          companyPageClicks: 0,
          costInLocalCurrency: '10.00',
          impressions: 100,
          viralFollows: 0,
          sends: 0,
          shares: 0,
          clicks: 5,
          viralClicks: 0,
          pivotValues: ['urn:li:geo:103644278'],
          likes: 1,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockAnalyticsResponse),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-05',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('dailyData')
    expect(data).toHaveProperty('aggregated')
    expect(Array.isArray(data.dailyData)).toBe(true)
  })

  it('should handle LinkedIn API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('LinkedIn API error'),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-05',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('dailyData')
    expect(data.dailyData[0].apiStatus).toBe('error')
  })

  it('should handle network errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-05',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('dailyData')
    expect(data.dailyData[0].apiStatus).toBe('error')
  })

  it('should correctly generate date range for multiple days', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        elements: [],
      }),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-05',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    await GET(request)

    // Should make 5 API calls (one for each day)
    expect(global.fetch).toHaveBeenCalledTimes(5)

    // Verify each call has correct date format
    const calls = (global.fetch as jest.Mock).mock.calls
    expect(calls[0][0]).toContain(
      'dateRange=(start:(year:2023,month:1,day:1),end:(year:2023,month:1,day:1))'
    )
    expect(calls[4][0]).toContain(
      'dateRange=(start:(year:2023,month:1,day:5),end:(year:2023,month:1,day:5))'
    )
  })

  it('should handle missing required parameters', async () => {
    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Missing required parameters: campaignId, startDate, endDate'
    )
  })

  it('should handle invalid date format gracefully', async () => {
    // When an invalid date is provided, the new Date() will create an invalid date
    // which could cause issues in the date processing logic
    const request = new NextRequest(
      'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=invalid-date&endDate=2023-01-05',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    // The API might return 200 with error status in dailyData, or 500 for severe errors
    expect([200, 500]).toContain(response.status)
    if (response.status === 200) {
      expect(data).toHaveProperty('dailyData')
    } else {
      expect(data.error).toBe('Internal server error')
    }
  })
})
