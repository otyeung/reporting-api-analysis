import { computeLinkedInApiVersion, getLinkedInApiVersion } from '@/lib/linkedin-api-version'

describe('linkedin-api-version', () => {
  describe('computeLinkedInApiVersion', () => {
    it('returns previous month for a normal month', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 2, 18))).toBe('202602')
    })

    it('returns previous month for February', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 1, 15))).toBe('202601')
    })

    it('skips December and returns November when previous month is December', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 0, 10))).toBe('202511')
    })

    it('skips December crossing year boundary correctly', () => {
      expect(computeLinkedInApiVersion(new Date(2025, 0, 1))).toBe('202411')
    })

    it('returns previous month for mid-year dates', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 6, 4))).toBe('202606')
    })

    it('handles November correctly (prev = October, no skip)', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 10, 1))).toBe('202610')
    })

    it('handles December correctly (prev = November, no skip)', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 11, 15))).toBe('202611')
    })

    it('pads single-digit months with leading zero', () => {
      expect(computeLinkedInApiVersion(new Date(2026, 3, 1))).toBe('202603')
    })
  })

  describe('getLinkedInApiVersion', () => {
    const originalEnv = process.env.LINKEDIN_API_VERSION

    afterEach(() => {
      if (originalEnv) {
        process.env.LINKEDIN_API_VERSION = originalEnv
      } else {
        delete process.env.LINKEDIN_API_VERSION
      }
    })

    it('returns env var value when LINKEDIN_API_VERSION is set', () => {
      process.env.LINKEDIN_API_VERSION = '202301'
      expect(getLinkedInApiVersion()).toBe('202301')
    })

    it('returns dynamic version when env var is not set', () => {
      delete process.env.LINKEDIN_API_VERSION
      const result = getLinkedInApiVersion()
      expect(result).toMatch(/^\d{6}$/)
    })
  })
})
