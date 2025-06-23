describe('Data Processing Utilities', () => {
  describe('formatCurrency', () => {
    const formatCurrency = (value: string | number): string => {
      const num = typeof value === 'string' ? parseFloat(value) : value
      return num.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      })
    }

    it('should format string numbers correctly', () => {
      expect(formatCurrency('100.50')).toBe('$100.50')
      expect(formatCurrency('1234.56')).toBe('$1,234.56')
      expect(formatCurrency('0')).toBe('$0.00')
    })

    it('should format numeric values correctly', () => {
      expect(formatCurrency(100.5)).toBe('$100.50')
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle edge cases', () => {
      expect(formatCurrency('0.00')).toBe('$0.00')
      expect(formatCurrency('999999.99')).toBe('$999,999.99')
    })
  })

  describe('formatNumber', () => {
    const formatNumber = (value: number): string => {
      return value.toLocaleString('en-US')
    }

    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1234567)).toBe('1,234,567')
      expect(formatNumber(100)).toBe('100')
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('calculateCTR', () => {
    const calculateCTR = (clicks: number, impressions: number): string => {
      if (impressions === 0) return '0.00%'
      return ((clicks / impressions) * 100).toFixed(2) + '%'
    }

    it('should calculate CTR correctly', () => {
      expect(calculateCTR(50, 1000)).toBe('5.00%')
      expect(calculateCTR(1, 100)).toBe('1.00%')
      expect(calculateCTR(123, 4567)).toBe('2.69%')
    })

    it('should handle zero impressions', () => {
      expect(calculateCTR(10, 0)).toBe('0.00%')
    })

    it('should handle zero clicks', () => {
      expect(calculateCTR(0, 1000)).toBe('0.00%')
    })
  })

  describe('calculateCPM', () => {
    const calculateCPM = (
      cost: string | number,
      impressions: number
    ): string => {
      const costNum = typeof cost === 'string' ? parseFloat(cost) : cost
      if (impressions === 0) return '$0.00'
      return ((costNum / impressions) * 1000).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      })
    }

    it('should calculate CPM correctly', () => {
      expect(calculateCPM('100.00', 1000)).toBe('$100.00')
      expect(calculateCPM('50.00', 2000)).toBe('$25.00')
      expect(calculateCPM(123.45, 4567)).toBe('$27.03') // Corrected expected value
    })

    it('should handle zero impressions', () => {
      expect(calculateCPM('100.00', 0)).toBe('$0.00')
    })

    it('should handle zero cost', () => {
      expect(calculateCPM('0.00', 1000)).toBe('$0.00')
    })
  })

  describe('formatDate', () => {
    const formatDate = (year: number, month: number, day: number): string => {
      return `${year}-${month.toString().padStart(2, '0')}-${day
        .toString()
        .padStart(2, '0')}`
    }

    it('should format dates correctly', () => {
      expect(formatDate(2023, 1, 15)).toBe('2023-01-15')
      expect(formatDate(2023, 12, 31)).toBe('2023-12-31')
      expect(formatDate(2023, 5, 3)).toBe('2023-05-03')
    })

    it('should pad single digits', () => {
      expect(formatDate(2023, 1, 1)).toBe('2023-01-01')
      expect(formatDate(2023, 9, 5)).toBe('2023-09-05')
    })
  })

  describe('getDateRange', () => {
    const getDateRange = (startDate: string, endDate: string): Date[] => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const dates: Date[] = []

      const currentDate = new Date(start)
      while (currentDate <= end) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return dates
    }

    it('should generate date range correctly', () => {
      const dates = getDateRange('2023-01-01', '2023-01-03')
      expect(dates).toHaveLength(3)
      expect(dates[0]).toEqual(new Date('2023-01-01'))
      expect(dates[1]).toEqual(new Date('2023-01-02'))
      expect(dates[2]).toEqual(new Date('2023-01-03'))
    })

    it('should handle single day range', () => {
      const dates = getDateRange('2023-01-01', '2023-01-01')
      expect(dates).toHaveLength(1)
      expect(dates[0]).toEqual(new Date('2023-01-01'))
    })

    it('should handle month boundaries', () => {
      const dates = getDateRange('2023-01-30', '2023-02-01')
      expect(dates).toHaveLength(3)
      expect(dates[0]).toEqual(new Date('2023-01-30'))
      expect(dates[1]).toEqual(new Date('2023-01-31'))
      expect(dates[2]).toEqual(new Date('2023-02-01'))
    })
  })

  describe('extractGeoId', () => {
    const extractGeoId = (geoUrn: string): string => {
      // Extract ID from URN like "urn:li:geo:103644278"
      const parts = geoUrn.split(':')
      return parts[parts.length - 1]
    }

    it('should extract geo ID from URN', () => {
      expect(extractGeoId('urn:li:geo:103644278')).toBe('103644278')
      expect(extractGeoId('urn:li:geo:12345')).toBe('12345')
    })

    it('should handle malformed URNs gracefully', () => {
      expect(extractGeoId('103644278')).toBe('103644278')
      expect(extractGeoId('invalid:format')).toBe('format')
    })
  })

  describe('aggregateMetrics', () => {
    interface Metrics {
      impressions: number
      clicks: number
      costInLocalCurrency: string
      likes: number
      comments: number
      shares: number
      follows: number
    }

    const aggregateMetrics = (elements: Metrics[]): Metrics => {
      return elements.reduce(
        (acc, element) => ({
          impressions: acc.impressions + element.impressions,
          clicks: acc.clicks + element.clicks,
          costInLocalCurrency: (
            parseFloat(acc.costInLocalCurrency) +
            parseFloat(element.costInLocalCurrency)
          ).toFixed(2),
          likes: acc.likes + element.likes,
          comments: acc.comments + element.comments,
          shares: acc.shares + element.shares,
          follows: acc.follows + element.follows,
        }),
        {
          impressions: 0,
          clicks: 0,
          costInLocalCurrency: '0.00',
          likes: 0,
          comments: 0,
          shares: 0,
          follows: 0,
        }
      )
    }

    it('should aggregate metrics correctly', () => {
      const elements = [
        {
          impressions: 1000,
          clicks: 50,
          costInLocalCurrency: '100.00',
          likes: 5,
          comments: 2,
          shares: 1,
          follows: 3,
        },
        {
          impressions: 2000,
          clicks: 75,
          costInLocalCurrency: '150.50',
          likes: 8,
          comments: 4,
          shares: 2,
          follows: 1,
        },
      ]

      const result = aggregateMetrics(elements)

      expect(result.impressions).toBe(3000)
      expect(result.clicks).toBe(125)
      expect(result.costInLocalCurrency).toBe('250.50')
      expect(result.likes).toBe(13)
      expect(result.comments).toBe(6)
      expect(result.shares).toBe(3)
      expect(result.follows).toBe(4)
    })

    it('should handle empty array', () => {
      const result = aggregateMetrics([])

      expect(result.impressions).toBe(0)
      expect(result.clicks).toBe(0)
      expect(result.costInLocalCurrency).toBe('0.00')
      expect(result.likes).toBe(0)
      expect(result.comments).toBe(0)
      expect(result.shares).toBe(0)
      expect(result.follows).toBe(0)
    })

    it('should handle single element', () => {
      const elements = [
        {
          impressions: 500,
          clicks: 25,
          costInLocalCurrency: '75.25',
          likes: 3,
          comments: 1,
          shares: 0,
          follows: 2,
        },
      ]

      const result = aggregateMetrics(elements)

      expect(result.impressions).toBe(500)
      expect(result.clicks).toBe(25)
      expect(result.costInLocalCurrency).toBe('75.25')
      expect(result.likes).toBe(3)
      expect(result.comments).toBe(1)
      expect(result.shares).toBe(0)
      expect(result.follows).toBe(2)
    })
  })
})
