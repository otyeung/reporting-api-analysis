/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '../../app/api/overall-analytics/route'

// Mock getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock auth config
jest.mock('../../app/lib/auth-config', () => ({
  authOptions: {},
}))

// Mock fetch
global.fetch = jest.fn()

describe('/api/overall-analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2024-01-01&endDate=2024-01-31'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Access token not provided in Authorization header')
  })

  it('should return 400 for missing parameters', async () => {
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue({
      accessToken: 'test-token',
    })

    const request = new NextRequest(
      'http://localhost:3001/api/overall-analytics'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Missing required parameters: accountId, startDate'
    )
  })

  it('should successfully fetch analytics data', async () => {
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue({
      accessToken: 'test-token',
    })

    const mockAnalyticsResponse = {
      elements: [
        {
          dateRange: {
            start: { year: 2024, month: 1, day: 1 },
            end: { year: 2024, month: 1, day: 31 },
          },
          impressions: 1000,
          likes: 5,
          shares: 3,
          costInLocalCurrency: '100.00',
          clicks: 50,
          costInUsd: '125.00',
          comments: 2,
          pivotValues: [],
        },
      ],
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsResponse,
    })

    const request = new NextRequest(
      'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2024-01-01&endDate=2024-01-31',
      {
        headers: {
          authorization: 'Bearer valid-token',
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.elements).toHaveLength(1)
    expect(data.elements[0].impressions).toBe(1000)
    expect(data.elements[0].costInUsd).toBe('125.00')

    expect(fetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledOptions] = (fetch as jest.Mock).mock.calls[0]
    expect(calledUrl).toContain('rest/adAnalytics')
    expect(calledUrl).toContain('creatives=List(urn%3Ali%3AsponsoredCreative%3A456)')
    expect(calledUrl).toContain('accounts=List(urn%3Ali%3AsponsoredAccount%3A123)')
    expect(calledUrl).not.toContain('campaigns=')
    expect(calledUrl).not.toContain('pivot=')
    expect(calledOptions).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token',
          'LinkedIn-Version': expect.any(String),
        }),
      })
    )
  })

  it('should handle LinkedIn API errors', async () => {
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue({
      accessToken: 'test-token',
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Forbidden',
    })

    const request = new NextRequest(
      'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2024-01-01&endDate=2024-01-31',
      {
        headers: {
          authorization: 'Bearer test-token',
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('LinkedIn API request failed: 403')
  })

  it('should handle network errors', async () => {
    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue({
      accessToken: 'test-token',
    })
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const request = new NextRequest(
      'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2024-01-01&endDate=2024-01-31',
      {
        headers: {
          authorization: 'Bearer test-token',
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
