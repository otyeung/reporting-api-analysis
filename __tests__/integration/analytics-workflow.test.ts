import { GET as OverallAnalytics } from '../../app/api/overall-analytics/route'
import { GET as DailyAnalytics } from '../../app/api/daily-analytics/route'
import { GET as AnalyticsGeo } from '../../app/api/geo/route'
import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

describe('Analytics API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('should handle complete analytics workflow', async () => {
    const mockOverallResponse = {
      elements: [
        {
          dateRange: {
            start: { year: 2023, month: 1, day: 1 },
            end: { year: 2023, month: 1, day: 31 },
          },
          impressions: 10000,
          likes: 100,
          shares: 50,
          costInLocalCurrency: '1000.00',
          clicks: 500,
          costInUsd: '1200.00',
          comments: 25,
          pivotValues: [],
        },
      ],
    }

    const mockGeoResponse = {
      id: 103644278,
      defaultLocalizedName: {
        locale: { country: 'US', language: 'en' },
        value: 'United States',
      },
    }

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockOverallResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeoResponse),
      })

    const overallRequest = new NextRequest(
      'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const overallResponse = await OverallAnalytics(overallRequest)
    expect(overallResponse.status).toBe(200)

    const geoRequest = new NextRequest('http://localhost:3001/api/geo?id=103644278', {
      method: 'GET',
      headers: { authorization: 'Bearer test-token' },
    })

    const geoResponse = await AnalyticsGeo(geoRequest)
    expect(geoResponse.status).toBe(200)

    const overallData = await overallResponse.json()
    const geoData = await geoResponse.json()

    expect(overallData.elements[0]).toHaveProperty('impressions')
    expect(overallData.elements[0]).toHaveProperty('clicks')
    expect(overallData.elements[0]).toHaveProperty('costInLocalCurrency')
    expect(overallData.elements[0]).toHaveProperty('costInUsd')
    expect(geoData).toHaveProperty('defaultLocalizedName')
    expect(geoData).toHaveProperty('id')
  })

  it('should handle authentication errors consistently across all APIs', async () => {
    const apis = [
      {
        handler: OverallAnalytics,
        url: 'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      },
      {
        handler: DailyAnalytics,
        url: 'http://localhost:3001/api/daily-analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-05',
      },
      {
        handler: AnalyticsGeo,
        url: 'http://localhost:3001/api/geo?id=103644278',
      },
    ]

    for (const api of apis) {
      const request = new NextRequest(api.url, { method: 'GET' })
      const response = await api.handler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
    }
  })

  it('should validate data consistency between strategies', async () => {
    const mockOverallResponse = {
      elements: [
        {
          dateRange: {
            start: { year: 2023, month: 1, day: 1 },
            end: { year: 2023, month: 1, day: 31 },
          },
          impressions: 5000,
          likes: 20,
          shares: 12,
          costInLocalCurrency: '500.00',
          clicks: 250,
          costInUsd: '600.00',
          comments: 8,
          pivotValues: [],
        },
      ],
    }

    const mockGeoResponse = {
      id: 103644278,
      defaultLocalizedName: {
        locale: { country: 'US', language: 'en' },
        value: 'United States',
      },
    }

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockOverallResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeoResponse),
      })

    const overallRequest = new NextRequest(
      'http://localhost:3001/api/overall-analytics?accountId=123&creativeId=456&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const geoRequest = new NextRequest('http://localhost:3001/api/geo?id=103644278', {
      method: 'GET',
      headers: { authorization: 'Bearer test-token' },
    })

    const overallResponse = await OverallAnalytics(overallRequest)
    const geoResponse = await AnalyticsGeo(geoRequest)

    const overallData = await overallResponse.json()
    const geoData = await geoResponse.json()

    expect(typeof overallData.elements[0].impressions).toBe('number')
    expect(typeof overallData.elements[0].clicks).toBe('number')
    expect(typeof overallData.elements[0].costInUsd).toBe('string')
    expect(typeof geoData.id).toBe('number')
    expect(typeof geoData.defaultLocalizedName.value).toBe('string')
    expect(overallData.elements[0].impressions).toBeGreaterThan(0)
    expect(overallData.elements[0].clicks).toBeGreaterThan(0)
    expect(geoData.id).toBeGreaterThan(0)
  })
})
