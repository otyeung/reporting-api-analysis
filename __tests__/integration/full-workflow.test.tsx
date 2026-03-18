import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import Home from '../../app/page'

jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('../../app/components/TokenStatusComponent', () => {
  return function MockTokenStatusComponent() {
    return <div data-testid='token-status'>Token Status Component</div>
  }
})

jest.mock('../../utils/csv-export', () => ({
  generateOverallCSV: jest.fn().mockReturnValue('mock,csv,content'),
  generateGeographicCSV: jest.fn().mockReturnValue('mock,csv,content'),
  generateMonthlyCSV: jest.fn().mockReturnValue('mock,csv,content'),
  generateDailyCSV: jest.fn().mockReturnValue('mock,csv,content'),
  downloadCSV: jest.fn(),
}))

const baseElement = {
  dateRange: {
    start: { year: 2024, month: 1, day: 1 },
    end: { year: 2024, month: 1, day: 31 },
  },
  impressions: 1000,
  likes: 12,
  shares: 7,
  costInLocalCurrency: '150.75',
  clicks: 50,
  costInUsd: '180.25',
  comments: 5,
  pivotValues: ['urn:li:geo:103644278'],
}

const zeroElement = {
  dateRange: {
    start: { year: 2024, month: 1, day: 1 },
    end: { year: 2024, month: 1, day: 31 },
  },
  impressions: 0,
  likes: 0,
  shares: 0,
  costInLocalCurrency: '0.00',
  clicks: 0,
  costInUsd: '0.00',
  comments: 0,
  pivotValues: ['urn:li:geo:106155005'],
}

const mockAnalyticsData = {
  paging: { start: 0, count: 2, links: [] },
  elements: [baseElement, zeroElement],
}

const mockDailyData = {
  paging: { start: 0, count: 2, links: [] },
  elements: [
    {
      ...baseElement,
      dateRange: { start: { year: 2024, month: 1, day: 1 } },
    },
    {
      ...zeroElement,
      dateRange: { start: { year: 2024, month: 1, day: 2 } },
    },
  ],
}

describe('Integration Tests - Full Analytics Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    const mockFetch = jest.fn()
    global.fetch = mockFetch

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockAnalyticsData } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAnalyticsData } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAnalyticsData } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => mockDailyData } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 103644278,
          defaultLocalizedName: { value: 'United States' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 106155005,
          defaultLocalizedName: { value: 'Canada' },
        }),
      } as Response)
  })

  it('should complete full analytics workflow with all four API strategies', async () => {
    render(<Home />)

    expect(screen.getByLabelText('Account ID')).toBeDefined()
    expect(screen.getByLabelText('Creative ID')).toBeDefined()
    expect(screen.getByLabelText('Start Date')).toBeDefined()
    expect(screen.getByLabelText('End Date')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Account ID'), {
      target: { value: '518645095' },
    })
    fireEvent.change(screen.getByLabelText('Creative ID'), {
      target: { value: '1156418316' },
    })
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2024-01-01' },
    })
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2024-01-31' },
    })

    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('Creative Summary - Overall Totals')).toBeDefined()
    })

    expect(screen.getByText('Geographic Breakdown - Pivoted by Country')).toBeDefined()
    expect(screen.getByText('Monthly Breakdown - Single API Call')).toBeDefined()
    expect(screen.getByText('Daily Breakdown - Single API Call')).toBeDefined()

    await waitFor(() => {
      expect(
        screen.getByText('📊 LinkedIn Analytics API Strategy Comparison')
      ).toBeDefined()
    })

    expect(screen.getByText('📊 Benchmark')).toBeDefined()
    expect(screen.getByText('✅ Best Practice')).toBeDefined()
    expect(screen.getByText('⚠️ Use with Caution')).toBeDefined()
    expect(screen.getByText('⚠️ Not Recommended')).toBeDefined()

    expect(screen.getAllByText('1,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('50').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$180.25').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.queryByText('Company Page Clicks')).toBeNull()

    expect(
      screen.getByText(/All daily data points are displayed in this table for transparency/)
    ).toBeDefined()
  })

  it('should handle CSV downloads for all four strategies', async () => {
    const csvExportUtils = require('../../utils/csv-export')

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(
        screen.getByText('📊 LinkedIn Analytics API Strategy Comparison')
      ).toBeDefined()
    })

    const overallDownloadButton = screen
      .getAllByText('📊 Download CSV')
      .find((button) => button.closest('.border-blue-500') !== null)
    if (overallDownloadButton) {
      fireEvent.click(overallDownloadButton)
    }
    expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
      'mock,csv,content',
      expect.stringContaining('overall')
    )

    fireEvent.click(screen.getByText('🌍 Download CSV'))
    expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
      'mock,csv,content',
      expect.stringContaining('geographic')
    )

    fireEvent.click(screen.getByText('📅 Download CSV'))
    expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
      'mock,csv,content',
      expect.stringContaining('monthly')
    )

    const dailyDownloadButton = screen
      .getAllByText('📊 Download CSV')
      .find((button) => button.closest('.border-red-500') !== null)
    if (dailyDownloadButton) {
      fireEvent.click(dailyDownloadButton)
    }
    expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
      'mock,csv,content',
      expect.stringContaining('daily')
    )
  })

  it('should display accurate data differences analysis', async () => {
    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('🔍 Professional API Strategy Analysis')).toBeDefined()
    })

    expect(
      screen.getByText(/Perfect match! All four API strategies return identical totals/)
    ).toBeDefined()
  })

  it('should provide professional recommendations', async () => {
    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(
        screen.getByText('🎯 Professional Implementation Recommendations')
      ).toBeDefined()
    })

    expect(screen.getByText('📊 Benchmark Strategy')).toBeDefined()
    expect(screen.getByText('✅ Production Strategy')).toBeDefined()
    expect(screen.getByText('⚠️ Moderate Risk Strategy')).toBeDefined()
    expect(screen.getByText('❌ High Risk Strategy')).toBeDefined()
    expect(
      screen.getByText(/Data discrepancies between strategies are not implementation errors/)
    ).toBeDefined()
  })

  it('should handle error states gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeDefined()
    })
  })

  it('should show loading states during API calls', async () => {
    global.fetch = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ elements: [] }) } as Response), 1000))
    ) as jest.Mock

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    expect(screen.getByText('Loading...')).toBeDefined()
  })
})
