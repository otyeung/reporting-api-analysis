describe('Data Processing Functions', () => {
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
  })

  describe('calculateCTR', () => {
    const calculateCTR = (clicks: number, impressions: number): string => {
      if (impressions === 0) return '0.00%'
      return ((clicks / impressions) * 100).toFixed(2) + '%'
    }

    it('should calculate CTR correctly', () => {
      expect(calculateCTR(50, 1000)).toBe('5.00%')
      expect(calculateCTR(1, 100)).toBe('1.00%')
    })

    it('should handle zero impressions', () => {
      expect(calculateCTR(10, 0)).toBe('0.00%')
    })
  })
})
