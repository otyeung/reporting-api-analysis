import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import Home from '../../app/page'
import * as csvExportUtils from '../../utils/csv-export'

// Mock next-auth/react
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock TokenStatusComponent
jest.mock('../../app/components/TokenStatusComponent', () => {
  return function MockTokenStatusComponent() {
    return <div data-testid='token-status'>Token Status Component</div>
  }
})

// Mock CSV export utilities
jest.mock('../../utils/csv-export', () => ({
  generateOverallCSV: jest.fn().mockReturnValue('overall,csv,content'),
  generateGeographicCSV: jest.fn().mockReturnValue('geographic,csv,content'),
  generateMonthlyCSV: jest.fn().mockReturnValue('monthly,csv,content'),
  generateDailyCSV: jest.fn().mockReturnValue('daily,csv,content'),
  downloadCSV: jest.fn(),
}))

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('should render the main heading and description', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    expect(screen.getByText('🎯 API Strategy Analysis Overview')).toBeDefined()
    expect(
      screen.getByText(
        /This analysis compares four distinct LinkedIn Marketing API/
      )
    ).toBeDefined()
  })

  it('should render token status component', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    expect(screen.getByTestId('token-status')).toBeDefined()
  })

  it('should render analytics form with default values', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    expect(
      (screen.getByLabelText('Campaign ID') as HTMLInputElement).value
    ).toBe('362567084')

    // Check that start date is approximately 90 days before today
    const startDateValue = (
      screen.getByLabelText('Start Date') as HTMLInputElement
    ).value
    const endDateValue = (screen.getByLabelText('End Date') as HTMLInputElement)
      .value

    const startDate = new Date(startDateValue)
    const endDate = new Date(endDateValue)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Allow for some tolerance in date comparison (within 1 day)
    const daysDiff = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    expect(daysDiff).toBeGreaterThanOrEqual(88)
    expect(daysDiff).toBeLessThanOrEqual(92)
  })

  it('should validate required form fields', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    expect(screen.getByLabelText('Campaign ID').hasAttribute('required')).toBe(
      true
    )
    expect(screen.getByLabelText('Start Date').hasAttribute('required')).toBe(
      true
    )
    expect(screen.getByLabelText('End Date').hasAttribute('required')).toBe(
      true
    )
  })

  it('should handle form submission with valid data', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    } as Response)

    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    const submitButton = screen.getByText('Get Analytics Data')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics'),
        expect.any(Object)
      )
    })
  })

  it('should handle API errors gracefully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    const submitButton = screen.getByText('Get Analytics Data')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeDefined()
    })
  })

  it('should redirect if not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<Home />)

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('should show loading state during authentication check', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    render(<Home />)

    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('should update form values when changed', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    const campaignInput = screen.getByLabelText('Campaign ID')
    fireEvent.change(campaignInput, { target: { value: '123456789' } })

    expect((campaignInput as HTMLInputElement).value).toBe('123456789')
  })

  it('should display analytics results when data is loaded', async () => {
    const mockAnalyticsData = {
      paging: {
        start: 0,
        count: 1,
        links: [],
      },
      elements: [
        {
          actionClicks: 10,
          viralImpressions: 100,
          comments: 5,
          oneClickLeads: 2,
          dateRange: {
            start: { year: 2025, month: 5, day: 24 },
            end: { year: 2025, month: 6, day: 22 },
          },
          landingPageClicks: 15,
          adUnitClicks: 20,
          follows: 8,
          oneClickLeadFormOpens: 3,
          companyPageClicks: 12,
          costInLocalCurrency: '100.00',
          impressions: 500,
          viralFollows: 3,
          sends: 25,
          shares: 12,
          clicks: 30,
          viralClicks: 8,
          pivotValues: ['urn:li:geo:103644278'],
          likes: 15,
        },
      ],
    }

    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dailyData: [], aggregated: [] }),
      } as Response)

    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    const submitButton = screen.getByText('Get Analytics Data')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Campaign Summary - Overall Totals')
      ).toBeDefined()
    })
  })

  describe('CSV Download Functionality', () => {
    const mockAnalyticsData = {
      paging: { start: 0, count: 1, links: [] },
      elements: [
        {
          actionClicks: 10,
          viralImpressions: 100,
          comments: 5,
          oneClickLeads: 2,
          dateRange: {
            start: { year: 2025, month: 5, day: 24 },
            end: { year: 2025, month: 6, day: 22 },
          },
          landingPageClicks: 15,
          adUnitClicks: 20,
          follows: 8,
          oneClickLeadFormOpens: 3,
          companyPageClicks: 12,
          costInLocalCurrency: '100.00',
          impressions: 500,
          viralFollows: 3,
          sends: 25,
          shares: 12,
          clicks: 30,
          viralClicks: 8,
          pivotValues: ['urn:li:geo:103644278'],
          likes: 15,
        },
      ],
    }

    beforeEach(async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalyticsData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalyticsData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalyticsData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ dailyData: [], aggregated: [] }),
        } as Response)

      mockUseSession.mockReturnValue({
        data: {
          user: { name: 'Test User', email: 'test@example.com' },
          accessToken: 'test-token',
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      })

      render(<Home />)

      const submitButton = screen.getByText('Get Analytics Data')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('📊 LinkedIn Analytics API Strategy Comparison')
        ).toBeDefined()
      })
    })

    it('should render all CSV download buttons when data is loaded', () => {
      // Overall CSV button (blue border)
      const overallButton = screen
        .getAllByText('📊 Download CSV')
        .find((button) => button.closest('.border-blue-500') !== null)
      expect(overallButton).toBeDefined()

      // Geographic CSV button
      expect(screen.getByText('🌍 Download CSV')).toBeDefined()

      // Monthly CSV button
      expect(screen.getByText('📅 Download CSV')).toBeDefined()
    })

    it('should call generateOverallCSV and downloadCSV when overall download button is clicked', () => {
      const overallButton = screen
        .getAllByText('📊 Download CSV')
        .find((button) => button.closest('.border-blue-500') !== null)
      if (overallButton) {
        fireEvent.click(overallButton)

        expect(csvExportUtils.generateOverallCSV).toHaveBeenCalledWith(
          expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                impressions: 500,
                clicks: 30,
                costInLocalCurrency: '100.00',
              }),
            ]),
          }),
          expect.any(Object)
        )
        expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
          'overall,csv,content',
          expect.stringContaining('overall')
        )
      }
    })

    it('should call generateGeographicCSV when geographic download button is clicked', () => {
      const geographicButton = screen.getByText('🌍 Download CSV')
      fireEvent.click(geographicButton)

      expect(csvExportUtils.generateGeographicCSV).toHaveBeenCalled()
      expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
        'geographic,csv,content',
        expect.stringContaining('geographic')
      )
    })

    it('should call generateMonthlyCSV when monthly download button is clicked', () => {
      const monthlyButton = screen.getByText('📅 Download CSV')
      fireEvent.click(monthlyButton)

      expect(csvExportUtils.generateMonthlyCSV).toHaveBeenCalled()
      expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
        'monthly,csv,content',
        expect.stringContaining('monthly')
      )
    })
  })

  it('should display note about data display in Daily table', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          dailyData: [{ date: '2024-01-01', elements: [] }],
          aggregated: [],
        }),
      } as Response)

    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Home />)

    const submitButton = screen.getByText('Get Analytics Data')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Daily Breakdown - Multiple API Calls')
      ).toBeDefined()
    })

    // Check for the note about data display
    expect(
      screen.getByText(
        /All data points are displayed in this table, excluding rows with all zero values/
      )
    ).toBeDefined()
  })
})
