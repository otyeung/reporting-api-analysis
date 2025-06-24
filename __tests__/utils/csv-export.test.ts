import {
  generateOverallCSV,
  generateGeographicCSV,
  generateMonthlyCSV,
  generateDailyCSV,
  downloadCSV,
  formatDateRange,
  formatPivotValue,
  CSVExportData,
} from '../../utils/csv-export'

// Mock data for testing
const mockAnalyticsElement = {
  actionClicks: 10,
  viralImpressions: 500,
  comments: 5,
  oneClickLeads: 2,
  dateRange: {
    start: { year: 2024, month: 1, day: 1 },
    end: { year: 2024, month: 1, day: 31 },
  },
  landingPageClicks: 15,
  adUnitClicks: 25,
  follows: 3,
  oneClickLeadFormOpens: 1,
  companyPageClicks: 8,
  costInLocalCurrency: '100.50',
  impressions: 1000,
  viralFollows: 2,
  sends: 100,
  shares: 7,
  clicks: 50,
  viralClicks: 20,
  pivotValues: ['urn:li:geo:103644278'], // United States
  likes: 12,
}

const mockAnalyticsElementZeros = {
  actionClicks: 0,
  viralImpressions: 0,
  comments: 0,
  oneClickLeads: 0,
  dateRange: {
    start: { year: 2024, month: 1, day: 2 },
    end: { year: 2024, month: 1, day: 2 },
  },
  landingPageClicks: 0,
  adUnitClicks: 0,
  follows: 0,
  oneClickLeadFormOpens: 0,
  companyPageClicks: 0,
  costInLocalCurrency: '0.00',
  impressions: 0,
  viralFollows: 0,
  sends: 0,
  shares: 0,
  clicks: 0,
  viralClicks: 0,
  pivotValues: ['urn:li:geo:106155005'], // Canada
  likes: 0,
}

const mockGeoData = {
  '103644278': 'United States',
  '106155005': 'Canada',
}

describe('CSV Export Utilities', () => {
  describe('formatDateRange', () => {
    it('should format date range correctly', () => {
      const dateRange = {
        start: { year: 2024, month: 1, day: 1 },
        end: { year: 2024, month: 1, day: 31 },
      }
      expect(formatDateRange(dateRange)).toBe('2024-01-01 to 2024-01-31')
    })

    it('should pad single digit months and days with zeros', () => {
      const dateRange = {
        start: { year: 2024, month: 3, day: 5 },
        end: { year: 2024, month: 12, day: 25 },
      }
      expect(formatDateRange(dateRange)).toBe('2024-03-05 to 2024-12-25')
    })
  })

  describe('formatPivotValue', () => {
    it('should format geographic pivot values with geo data', () => {
      expect(formatPivotValue('urn:li:geo:103644278', mockGeoData)).toBe(
        'United States'
      )
      expect(formatPivotValue('urn:li:geo:106155005', mockGeoData)).toBe(
        'Canada'
      )
    })

    it('should fallback to geo ID when no geo data provided', () => {
      expect(formatPivotValue('urn:li:geo:103644278')).toBe('Geo: 103644278')
    })

    it('should return original value for non-geographic pivot values', () => {
      expect(formatPivotValue('some-other-value', mockGeoData)).toBe(
        'some-other-value'
      )
    })
  })

  describe('generateOverallCSV', () => {
    const mockOverallData = {
      elements: [mockAnalyticsElement, mockAnalyticsElementZeros],
    }

    it('should generate CSV with correct headers', () => {
      const csv = generateOverallCSV(mockOverallData, mockGeoData)
      const lines = csv.split('\n')
      const headers = lines[0]

      expect(headers).toContain('"Date Range"')
      expect(headers).toContain('"Geography"')
      expect(headers).toContain('"Impressions"')
      expect(headers).toContain('"Clicks"')
      expect(headers).toContain('"Cost (USD)"')
      expect(headers).toContain('"Company Page Clicks"')
    })

    it('should include all data elements including zero values', () => {
      const csv = generateOverallCSV(mockOverallData, mockGeoData)
      const lines = csv.split('\n')

      // Should have headers + 2 data rows + 1 totals row
      expect(lines.length).toBe(4)

      // Check that zero values are included
      expect(csv).toContain('"0"')
      expect(csv).toContain('"0.00"')
    })

    it('should include totals row', () => {
      const csv = generateOverallCSV(mockOverallData, mockGeoData)
      const lines = csv.split('\n')
      const totalsRow = lines[lines.length - 1]

      expect(totalsRow).toContain('"TOTALS"')
      expect(totalsRow).toContain('"All Regions Combined"')
    })

    it('should calculate totals correctly', () => {
      const csv = generateOverallCSV(mockOverallData, mockGeoData)
      const lines = csv.split('\n')
      const totalsRow = lines[lines.length - 1]

      // Total impressions should be 1000 + 0 = 1000
      expect(totalsRow).toContain('"1000"')
      // Total clicks should be 50 + 0 = 50
      expect(totalsRow).toContain('"50"')
      // Total cost should be 100.50 + 0.00 = 100.50
      expect(totalsRow).toContain('"100.50"')
    })

    it('should format geographic data correctly', () => {
      const csv = generateOverallCSV(mockOverallData, mockGeoData)

      expect(csv).toContain('"United States"')
      expect(csv).toContain('"Canada"')
    })
  })

  describe('generateGeographicCSV', () => {
    it('should generate CSV with same structure as overall', () => {
      const mockGeographicData = {
        elements: [mockAnalyticsElement],
      }

      const csv = generateGeographicCSV(mockGeographicData, mockGeoData)
      expect(csv).toContain('"Date Range"')
      expect(csv).toContain('"Geography"')
      expect(csv).toContain('"United States"')
    })
  })

  describe('generateMonthlyCSV', () => {
    it('should generate CSV with same structure as overall', () => {
      const mockMonthlyData = {
        elements: [mockAnalyticsElement],
      }

      const csv = generateMonthlyCSV(mockMonthlyData, mockGeoData)
      expect(csv).toContain('"Date Range"')
      expect(csv).toContain('"Geography"')
      expect(csv).toContain('"United States"')
    })
  })

  describe('generateDailyCSV', () => {
    const mockDailyData = {
      dailyData: [
        {
          date: '2024-01-01',
          elements: [mockAnalyticsElement],
        },
        {
          date: '2024-01-02',
          elements: [mockAnalyticsElementZeros],
        },
      ],
      aggregated: [mockAnalyticsElement, mockAnalyticsElementZeros],
    }

    it('should generate CSV with daily-specific headers', () => {
      const csv = generateDailyCSV(mockDailyData, mockGeoData)
      const lines = csv.split('\n')
      const headers = lines[0]

      expect(headers).toContain('"Date"')
      expect(headers).toContain('"Date Range"')
      expect(headers).toContain('"Geography"')
    })

    it('should include all daily data including zero values', () => {
      const csv = generateDailyCSV(mockDailyData, mockGeoData)

      expect(csv).toContain('"2024-01-01"')
      expect(csv).toContain('"2024-01-02"')
      expect(csv).toContain('"United States"')
      expect(csv).toContain('"Canada"')

      // Should include zero values
      expect(csv).toContain('"0"')
      expect(csv).toContain('"0.00"')
    })

    it('should include aggregated totals row', () => {
      const csv = generateDailyCSV(mockDailyData, mockGeoData)

      expect(csv).toContain('"AGGREGATED TOTALS"')
      expect(csv).toContain('"All Days Combined"')
      expect(csv).toContain('"All Regions Combined"')
    })

    it('should have correct number of rows', () => {
      const csv = generateDailyCSV(mockDailyData, mockGeoData)
      const lines = csv.split('\n')

      // Should have headers + 2 daily rows + 1 aggregated totals row
      expect(lines.length).toBe(4)
    })
  })

  describe('downloadCSV', () => {
    // Mock DOM methods for testing
    beforeEach(() => {
      // Mock document.createElement
      global.document.createElement = jest
        .fn()
        .mockImplementation((tagName) => {
          if (tagName === 'a') {
            return {
              setAttribute: jest.fn(),
              click: jest.fn(),
              style: {},
              download: true,
            }
          }
          return {}
        })

      // Mock document.body methods with spy functions instead of replacing body
      jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn())
      jest.spyOn(document.body, 'removeChild').mockImplementation(jest.fn())

      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue('mock-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock Blob
      global.Blob = jest.fn().mockImplementation((content, options) => ({
        content,
        options,
      })) as any
    })

    afterEach(() => {
      jest.clearAllMocks()
      jest.restoreAllMocks()
    })

    it('should create and trigger download', () => {
      const csvContent = 'test,csv,content'
      const filename = 'test.csv'

      downloadCSV(csvContent, filename)

      expect(global.document.createElement).toHaveBeenCalledWith('a')
      expect(global.Blob).toHaveBeenCalledWith([csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should handle case when download is not supported', () => {
      // Mock a link element without download support
      global.document.createElement = jest.fn().mockReturnValue({
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {},
        download: undefined,
      })

      const csvContent = 'test,csv,content'
      const filename = 'test.csv'

      expect(() => downloadCSV(csvContent, filename)).not.toThrow()
    })
  })
})
