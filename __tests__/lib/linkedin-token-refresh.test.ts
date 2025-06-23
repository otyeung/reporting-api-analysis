import {
  refreshLinkedInToken,
  shouldRefreshToken,
  isTokenExpired,
  isRefreshTokenValid,
} from '../../lib/linkedin-token-refresh'

// Mock fetch globally
global.fetch = jest.fn()

describe('LinkedIn Token Refresh Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      expect(isTokenExpired(expiredTime)).toBe(true)
    })

    it('should return false for valid tokens', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      expect(isTokenExpired(futureTime)).toBe(false)
    })

    it('should return true for tokens expiring now', () => {
      const nowTime = Math.floor(Date.now() / 1000)
      expect(isTokenExpired(nowTime)).toBe(true)
    })
  })

  describe('shouldRefreshToken', () => {
    it('should return true for tokens expiring within 7 days', () => {
      const soonToExpire = Math.floor(Date.now() / 1000) + 6 * 24 * 60 * 60 // 6 days
      expect(shouldRefreshToken(soonToExpire)).toBe(true)
    })

    it('should return false for tokens expiring after 7 days', () => {
      const notSoonToExpire = Math.floor(Date.now() / 1000) + 8 * 24 * 60 * 60 // 8 days
      expect(shouldRefreshToken(notSoonToExpire)).toBe(false)
    })

    it('should return true for tokens expiring exactly in 7 days', () => {
      const exactlySevenDays =
        Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 - 1 // 1 second less than 7 days
      expect(shouldRefreshToken(exactlySevenDays)).toBe(true)
    })
  })

  describe('isRefreshTokenValid', () => {
    it('should return true for tokens within 360-day window', () => {
      const within360Days = Math.floor(Date.now() / 1000) + 300 * 24 * 60 * 60 // 300 days
      expect(isRefreshTokenValid(within360Days)).toBe(true)
    })

    it('should return false for tokens beyond 360-day window', () => {
      const beyond360Days = Math.floor(Date.now() / 1000) - 361 * 24 * 60 * 60 // 361 days ago (in the past)
      expect(isRefreshTokenValid(beyond360Days)).toBe(false)
    })

    it('should return true for tokens at exactly 360 days', () => {
      const exactly360Days = Math.floor(Date.now() / 1000) + 360 * 24 * 60 * 60
      expect(isRefreshTokenValid(exactly360Days)).toBe(true)
    })
  })

  describe('refreshLinkedInToken', () => {
    const mockRefreshToken = 'mock-refresh-token'

    it('should successfully refresh a token', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        expires_in: 5184000, // 60 days
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await refreshLinkedInToken(mockRefreshToken)

      expect(fetch).toHaveBeenCalledWith(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams),
        }
      )

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: mockRefreshToken,
        expiresAt: expect.any(Number),
      })

      // Check that expiresAt is calculated correctly
      const expectedExpiresAt = Math.floor(Date.now() / 1000) + 5184000
      expect(result.expiresAt).toBeCloseTo(expectedExpiresAt, -2) // Allow 100s variance
    })

    it('should throw error for failed refresh request', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValueOnce('Invalid refresh token'),
      })

      await expect(refreshLinkedInToken(mockRefreshToken)).rejects.toThrow(
        'Token refresh failed: 400'
      )
    })

    it('should throw error for network failure', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(refreshLinkedInToken(mockRefreshToken)).rejects.toThrow(
        'Network error'
      )
    })

    it('should handle missing access_token in response', async () => {
      const mockResponse = {
        expires_in: 5184000,
        // Missing access_token
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await refreshLinkedInToken(mockRefreshToken)

      // Should not throw, but access_token should be undefined
      expect(result.accessToken).toBeUndefined()
      expect(result.refreshToken).toBe(mockRefreshToken)
    })

    it('should handle missing expires_in in response', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        // Missing expires_in
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await refreshLinkedInToken(mockRefreshToken)

      // Should handle missing expires_in (NaN + current time = NaN)
      expect(result.expiresAt).toBeDefined()
      expect(typeof result.expiresAt).toBe('number')
    })
  })
})
