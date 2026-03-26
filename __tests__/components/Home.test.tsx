import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import Home from '../../app/page'
import * as csvExportUtils from '../../utils/csv-export'

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
  generateOverallCSV: jest.fn().mockReturnValue('overall,csv,content'),
  generateGeographicCSV: jest.fn().mockReturnValue('geographic,csv,content'),
  generateMonthlyCSV: jest.fn().mockReturnValue('monthly,csv,content'),
  generateDailyCSV: jest.fn().mockReturnValue('daily,csv,content'),
  downloadCSV: jest.fn(),
}))

const createElement = (overrides = {}) => ({
  dateRange: {
    start: { year: 2026, month: 2, day: 19 },
    end: { year: 2026, month: 3, day: 18 },
  },
  impressions: 500,
  likes: 15,
  shares: 12,
  costInLocalCurrency: '100.00',
  clicks: 30,
  costInUsd: '120.00',
  comments: 5,
  pivotValues: ['urn:li:geo:103644278'],
  ...overrides,
})

const createAnalyticsData = (overrides = {}) => ({
  paging: { start: 0, count: 1, links: [] },
  elements: [createElement()],
  ...overrides,
})

const createMonthlyElements = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    createElement({
      dateRange: {
        start: { year: 2026, month: 1, day: index + 1 },
      },
      impressions: index + 1,
      clicks: index + 1,
      likes: index + 1,
      comments: index + 1,
      shares: index + 1,
      costInLocalCurrency: `${index + 1}.00`,
      costInUsd: `${index + 2}.00`,
      pivotValues: [],
    })
  )

const createDailyElements = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    createElement({
      dateRange: {
        start: { year: 2026, month: 2, day: index + 1 },
      },
      impressions: index + 1,
      clicks: index + 1,
      likes: index + 1,
      comments: index + 1,
      shares: index + 1,
      costInLocalCurrency: `${index + 1}.00`,
      costInUsd: `${index + 2}.00`,
      pivotValues: [],
    })
  )

const authenticatedSession = {
  data: {
    user: { name: 'Test User', email: 'test@example.com' },
    accessToken: 'test-token',
    expires: '2026-12-31',
  },
  status: 'authenticated' as const,
  update: jest.fn(),
}

const mockJsonResponse = (data: unknown, ok = true) => ({
  ok,
  json: async () => data,
})

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockUseSession.mockReturnValue(authenticatedSession)
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
  })

  it('should render the main heading and description', () => {
    render(<Home />)

    expect(screen.getByText('🎯 API Strategy Analysis Overview')).toBeDefined()
    expect(
      screen.getByText(/This analysis compares four distinct LinkedIn Marketing API/)
    ).toBeDefined()
  })

  it('should render token status component', () => {
    render(<Home />)
    expect(screen.getByTestId('token-status')).toBeDefined()
  })

  it('should render analytics form with new default values', () => {
    render(<Home />)

    expect((screen.getByLabelText('Account ID') as HTMLInputElement).value).toBe(
      '518645095'
    )
    expect((screen.getByLabelText('Ad ID') as HTMLInputElement).value).toBe(
      '531508486'
    )
    expect((screen.getByLabelText('Ad Set ID') as HTMLInputElement).value).toBe(
      '1119860556'
    )
    expect((screen.getByLabelText('Start Date') as HTMLInputElement).value).toBe(
      '2026-02-19'
    )
    expect((screen.getByLabelText('End Date') as HTMLInputElement).value).toBe(
      ''
    )
  })

  it('should validate required form fields', () => {
    render(<Home />)

    expect(screen.getByLabelText('Account ID').hasAttribute('required')).toBe(true)
    expect(screen.getByLabelText('Ad ID').hasAttribute('required')).toBe(false)
    expect(screen.getByLabelText('Ad Set ID').hasAttribute('required')).toBe(false)
    expect(screen.getByLabelText('Start Date').hasAttribute('required')).toBe(true)
    expect(screen.getByLabelText('End Date').hasAttribute('required')).toBe(false)
  })

  it('should handle form submission with valid data', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)

    render(<Home />)

    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    const urls = mockFetch.mock.calls.map((call) => String(call[0]))
    expect(urls[0]).toContain('/api/overall-analytics?accountId=518645095&startDate=2026-02-19')
    expect(urls[0]).toContain('creativeId=1119860556')
    expect(urls[0]).toContain('campaignId=531508486')
    expect(urls[1]).toContain('/api/analytics?accountId=518645095&startDate=2026-02-19')
    expect(urls[1]).toContain('creativeId=1119860556')
    expect(urls[1]).toContain('campaignId=531508486')
    expect(urls[2]).toContain('/api/monthly-analytics?accountId=518645095&startDate=2026-02-19')
    expect(urls[2]).toContain('creativeId=1119860556')
    expect(urls[2]).toContain('campaignId=531508486')
    expect(urls[3]).toContain('/api/daily-analytics-single?accountId=518645095&startDate=2026-02-19')
    expect(urls[3]).toContain('creativeId=1119860556')
    expect(urls[3]).toContain('campaignId=531508486')
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

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
    render(<Home />)

    const accountInput = screen.getByLabelText('Account ID')
    const campaignInput = screen.getByLabelText('Ad ID')
    const creativeInput = screen.getByLabelText('Ad Set ID')

    fireEvent.change(accountInput, { target: { value: '123456789' } })
    fireEvent.change(campaignInput, { target: { value: '111222333' } })
    fireEvent.change(creativeInput, { target: { value: '987654321' } })

    expect((accountInput as HTMLInputElement).value).toBe('123456789')
    expect((campaignInput as HTMLInputElement).value).toBe('111222333')
    expect((creativeInput as HTMLInputElement).value).toBe('987654321')
  })

  it('should display analytics results with the reduced metric set', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })) as Response)
      .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData()) as Response)
      .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData()) as Response)
      .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData()) as Response)
      .mockResolvedValueOnce(
        mockJsonResponse({
          id: 103644278,
          defaultLocalizedName: { value: 'United States' },
        }) as Response
      )

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('Creative Summary - Overall Totals')).toBeDefined()
    })

    expect(screen.getByText('Geographic Breakdown - Pivoted by Country')).toBeDefined()
    expect(screen.getByText('Monthly Breakdown - Single API Call')).toBeDefined()
    expect(screen.getByText('Daily Breakdown - Single API Call')).toBeDefined()
    expect(screen.getAllByText('Cost (USD)').length).toBeGreaterThan(0)
    expect(screen.queryByText('Company Page Clicks')).toBeNull()

    await waitFor(() => {
      expect(screen.getAllByText('United States').length).toBeGreaterThan(0)
    })
  })

  describe('CSV Download Functionality', () => {
    beforeEach(async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })) as Response)
        .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData()) as Response)
        .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData()) as Response)
        .mockResolvedValueOnce(mockJsonResponse(createAnalyticsData()) as Response)
        .mockResolvedValueOnce(
          mockJsonResponse({
            id: 103644278,
            defaultLocalizedName: { value: 'United States' },
          }) as Response
        )

      render(<Home />)
      fireEvent.click(screen.getByText('Get Analytics Data'))

      await waitFor(() => {
        expect(
          screen.getByText('📊 LinkedIn Analytics API Strategy Comparison')
        ).toBeDefined()
      })
    })

    it('should render all CSV download buttons when data is loaded', () => {
      const overallButton = screen
        .getAllByText('📊 Download CSV')
        .find((button) => button.closest('.border-blue-500') !== null)

      expect(overallButton).toBeDefined()
      expect(screen.getByText('🌍 Download CSV')).toBeDefined()
      expect(screen.getByText('📅 Download CSV')).toBeDefined()
    })

    it('should call generateOverallCSV and downloadCSV when overall download button is clicked', () => {
      const overallButton = screen
        .getAllByText('📊 Download CSV')
        .find((button) => button.closest('.border-blue-500') !== null)

      if (overallButton) {
        fireEvent.click(overallButton)
      }

      expect(csvExportUtils.generateOverallCSV).toHaveBeenCalledWith(
        expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              impressions: 500,
              clicks: 30,
              costInLocalCurrency: '100.00',
              costInUsd: '120.00',
            }),
          ]),
        }),
        expect.any(Object)
      )
      expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
        'overall,csv,content',
        expect.stringContaining('overall')
      )
    })

    it('should call geographic, monthly, and daily CSV helpers', () => {
      fireEvent.click(screen.getByText('🌍 Download CSV'))
      fireEvent.click(screen.getByText('📅 Download CSV'))

      const dailyButton = screen
        .getAllByText('📊 Download CSV')
        .find((button) => button.closest('.border-red-500') !== null)
      if (dailyButton) {
        fireEvent.click(dailyButton)
      }

      expect(csvExportUtils.generateGeographicCSV).toHaveBeenCalled()
      expect(csvExportUtils.generateMonthlyCSV).toHaveBeenCalled()
      expect(csvExportUtils.generateDailyCSV).toHaveBeenCalled()
      expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
        'geographic,csv,content',
        expect.stringContaining('geographic')
      )
      expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
        'monthly,csv,content',
        expect.stringContaining('monthly')
      )
      expect(csvExportUtils.downloadCSV).toHaveBeenCalledWith(
        'daily,csv,content',
        expect.stringContaining('daily')
      )
    })
  })

  it('should display note about data display in Daily table', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('Daily Breakdown - Single API Call')).toBeDefined()
    })

    expect(
      screen.getByText(/All daily data points are displayed in this table for transparency/)
    ).toBeDefined()
  })

  it('should paginate monthly results and keep totals visible', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(createAnalyticsData({ elements: createMonthlyElements(12) })) as Response
      )
      .mockResolvedValueOnce(mockJsonResponse({ elements: [] }) as Response)

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 10 of 12 rows')).toBeDefined()
    })

    expect(screen.getAllByText('TOTALS').length).toBeGreaterThan(0)
    expect(screen.queryByText('2026-01-01')).toBeNull()

    const nextButton = screen
      .getAllByRole('button', { name: 'Next' })
      .find((button) => !button.hasAttribute('disabled'))

    expect(nextButton).toBeDefined()
    if (nextButton) {
      fireEvent.click(nextButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Showing 11 to 12 of 12 rows')).toBeDefined()
    })

    expect(screen.getByText('2026-01-01')).toBeDefined()
    expect(screen.getAllByText('TOTALS').length).toBeGreaterThan(0)
  })

  it('should paginate daily elements from single-call response', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(createAnalyticsData({ elements: createDailyElements(12) })) as Response
      )

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 10 of 12 rows')).toBeDefined()
    })

    expect(screen.queryAllByText('2026-02-01')).toHaveLength(0)

    const nextButton = screen
      .getAllByRole('button', { name: 'Next' })
      .find((button) => !button.hasAttribute('disabled'))

    expect(nextButton).toBeDefined()
    if (nextButton) {
      fireEvent.click(nextButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Showing 11 to 12 of 12 rows')).toBeDefined()
    })

    expect(screen.getAllByText('2026-02-01').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TOTALS').length).toBeGreaterThan(0)
  })

  it('should render debug sessions and copy curl commands', async () => {
    jest.useFakeTimers()

    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createAnalyticsData({ elements: [createElement({ pivotValues: [] })] })
        ) as Response
      )

    render(<Home />)
    fireEvent.click(screen.getByText('Get Analytics Data'))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /debug session/i })).toHaveLength(4)
    })

    const debugButtons = screen.getAllByRole('button', { name: /debug session/i })
    fireEvent.click(debugButtons[0])
    fireEvent.click(debugButtons[3])

    expect(
      screen.getByText((content) =>
        content.includes("curl -X GET 'https://api.linkedin.com/rest/adAnalytics?q=analytics&timeGranularity=ALL")
      )
    ).toBeDefined()
    expect(
      screen.getByText((content) =>
        content.includes('timeGranularity=DAILY&pivot=MEMBER_COUNTRY_V2')
      )
    ).toBeDefined()

    fireEvent.click(screen.getAllByTitle('Copy curl command')[0])

    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("Authorization: Bearer test-token")
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeDefined()
    })

    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.queryByText('Copied!')).toBeNull()
    jest.useRealTimers()
  })
})
