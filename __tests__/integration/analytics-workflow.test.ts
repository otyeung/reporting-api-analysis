import { GET as OverallAnalytics } from '../../app/api/overall-analytics/route'
import { GET as DailyAnalytics } from '../../app/api/daily-analytics/route'
import { GET as AnalyticsGeo } from '../../app/api/geo/route'
import { NextRequest } from 'next/server'

// Mock NextAuth to avoid provider issues
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

describe('Analytics API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle complete analytics workflow', async () => {
    // Mock LinkedIn API responses
    const mockOverallResponse = {
      elements: [
        {
          impressions: 10000,
          clicks: 500,
          costInLocalCurrency: '1000.00',
          dateRange: {
            start: { year: 2023, month: 1, day: 1 },
            end: { year: 2023, month: 1, day: 31 },
          },
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

    // Test overall analytics strategy
    const overallRequest = new NextRequest(
      'http://localhost:3001/api/overall-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const overallResponse = await OverallAnalytics(overallRequest)
    expect(overallResponse.status).toBe(200)

    // Test geographic breakdown strategy
    const geoRequest = new NextRequest(
      'http://localhost:3001/api/geo?id=103644278',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const geoResponse = await AnalyticsGeo(geoRequest)
    expect(geoResponse.status).toBe(200)

    const overallData = await overallResponse.json()
    const geoData = await geoResponse.json()

    // Verify data structure consistency
    expect(overallData.elements[0]).toHaveProperty('impressions')
    expect(overallData.elements[0]).toHaveProperty('clicks')
    expect(overallData.elements[0]).toHaveProperty('costInLocalCurrency')
    expect(geoData).toHaveProperty('defaultLocalizedName')
    expect(geoData).toHaveProperty('id')
  })

  it('should handle authentication errors consistently across all APIs', async () => {
    const apis = [
      {
        name: 'overall-analytics',
        handler: OverallAnalytics,
        url: 'http://localhost:3001/api/overall-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-31',
      },
      {
        name: 'daily-analytics',
        handler: DailyAnalytics,
        url: 'http://localhost:3001/api/daily-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-05',
      },
      {
        name: 'geo',
        handler: AnalyticsGeo,
        url: 'http://localhost:3001/api/geo?id=103644278',
      },
    ]

    for (const api of apis) {
      const request = new NextRequest(api.url, {
        method: 'GET',
        // No authorization header
      })

      const response = await api.handler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
    }
  })

  it('should validate data consistency between strategies', async () => {
    // Mock consistent responses for comparison
    const mockOverallResponse = {
      elements: [
        {
          impressions: 5000,
          clicks: 250,
          costInLocalCurrency: '500.00',
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
      'http://localhost:3001/api/overall-analytics?campaignId=123&startDate=2023-01-01&endDate=2023-01-31',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const geoRequest = new NextRequest(
      'http://localhost:3001/api/geo?id=103644278',
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const overallResponse = await OverallAnalytics(overallRequest)
    const geoResponse = await AnalyticsGeo(geoRequest)

    const overallData = await overallResponse.json()
    const geoData = await geoResponse.json()

    // Verify both strategies return valid analytics structures
    expect(typeof overallData.elements[0].impressions).toBe('number')
    expect(typeof overallData.elements[0].clicks).toBe('number')
    expect(typeof geoData.id).toBe('number')
    expect(typeof geoData.defaultLocalizedName.value).toBe('string')

    // Verify no data loss or corruption
    expect(overallData.elements[0].impressions).toBeGreaterThan(0)
    expect(overallData.elements[0].clicks).toBeGreaterThan(0)
    expect(geoData.id).toBeGreaterThan(0)
  })
})
