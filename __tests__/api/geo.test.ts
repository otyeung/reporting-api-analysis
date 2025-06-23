import { NextRequest } from 'next/server'
import { GET } from '../../app/api/geo/route'

// Mock the fetch function
global.fetch = jest.fn()

describe('/api/geo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if geoId is missing', async () => {
    const request = new NextRequest('http://localhost:3001/api/geo')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Geo ID is required')
  })

  it('should return 401 if access token is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3001/api/geo?id=103644278'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Access token not provided in Authorization header')
  })

  it('should successfully fetch geo data', async () => {
    const mockGeoResponse = {
      id: 103644278,
      defaultLocalizedName: {
        locale: { country: 'US', language: 'en' },
        value: 'United States',
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeoResponse),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/geo?id=103644278',
      {
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockGeoResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/geo/103644278',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('should handle LinkedIn API errors with fallback', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('Region not found'),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/geo?id=invalid-id',
      {
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('id', NaN)
    expect(data).toHaveProperty('defaultLocalizedName')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Connection timeout')
    )

    const request = new NextRequest(
      'http://localhost:3001/api/geo?id=103644278',
      {
        headers: { authorization: 'Bearer test-token' },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should use correct LinkedIn API version from environment', async () => {
    const originalApiVersion = process.env.LINKEDIN_API_VERSION
    process.env.LINKEDIN_API_VERSION = '202307'

    const mockGeoResponse = {
      id: 103644278,
      defaultLocalizedName: {
        locale: { country: 'US', language: 'en' },
        value: 'United States',
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGeoResponse),
    })

    const request = new NextRequest(
      'http://localhost:3001/api/geo?id=103644278',
      {
        headers: { authorization: 'Bearer test-token' },
      }
    )

    await GET(request)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/geo/103644278',
      expect.objectContaining({
        headers: expect.objectContaining({
          'LinkedIn-Version': '202307',
        }),
      })
    )

    // Restore original environment
    if (originalApiVersion) {
      process.env.LINKEDIN_API_VERSION = originalApiVersion
    } else {
      delete process.env.LINKEDIN_API_VERSION
    }
  })
})
