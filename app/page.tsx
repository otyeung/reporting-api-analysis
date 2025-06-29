'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import TokenStatusComponent from './components/TokenStatusComponent'
import {
  generateOverallCSV,
  generateGeographicCSV,
  generateMonthlyCSV,
  generateDailyCSV,
  downloadCSV,
} from '../utils/csv-export'

interface DateRange {
  start: {
    year: number
    month: number
    day: number
  }
  end: {
    year: number
    month: number
    day: number
  }
}

interface AnalyticsElement {
  actionClicks: number
  viralImpressions: number
  comments: number
  oneClickLeads: number
  dateRange: DateRange
  landingPageClicks: number
  adUnitClicks: number
  follows: number
  oneClickLeadFormOpens: number
  companyPageClicks: number
  costInLocalCurrency: string
  impressions: number
  viralFollows: number
  sends: number
  shares: number
  clicks: number
  viralClicks: number
  pivotValues: string[]
  likes: number
}

interface LinkedInAnalyticsResponse {
  paging: {
    start: number
    count: number
    links: Record<string, unknown>[]
  }
  elements: AnalyticsElement[]
}

interface DailyAnalyticsResponse {
  dailyData: {
    date: string
    elements: AnalyticsElement[]
    apiStatus: 'success' | 'error' | 'no-data'
    errorMessage?: string
  }[]
  aggregated: AnalyticsElement[]
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaignId, setCampaignId] = useState('362567084')

  // Calculate default date range: 90 days before today to today
  const getDefaultDates = () => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - 89) // Use 89 to get exactly 90 days inclusive

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }
  }

  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState(defaultDates.startDate)
  const [endDate, setEndDate] = useState(defaultDates.endDate)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LinkedInAnalyticsResponse | null>(null)
  const [overallData, setOverallData] =
    useState<LinkedInAnalyticsResponse | null>(null)
  const [monthlyData, setMonthlyData] =
    useState<LinkedInAnalyticsResponse | null>(null)
  const [dailyData, setDailyData] = useState<DailyAnalyticsResponse | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [geoData, setGeoData] = useState<{ [key: string]: string }>({})
  const [geoLoading, setGeoLoading] = useState<Set<string>>(new Set())

  // Check authentication
  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
  }, [status, router])

  // Force re-render when geo data updates
  useEffect(() => {
    // This effect will trigger a re-render when geoData changes
  }, [geoData])

  // Show loading spinner while session is loading
  if (status === 'loading') {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, return null (will redirect in useEffect)
  if (status === 'unauthenticated') {
    return null
  }

  const fetchGeoName = async (geoId: string): Promise<string> => {
    if (geoData[geoId]) {
      return geoData[geoId]
    }

    setGeoLoading((prev) => new Set(Array.from(prev).concat(geoId)))

    try {
      const response = await fetch(`/api/geo?id=${geoId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      const data = await response.json()
      const countryName = data.defaultLocalizedName?.value || `Geo: ${geoId}`

      setGeoData((prev) => ({ ...prev, [geoId]: countryName }))
      setGeoLoading((prev) => {
        const newSet = new Set(prev)
        newSet.delete(geoId)
        return newSet
      })
      return countryName
    } catch (error) {
      console.error('Error fetching geo data:', error)
      setGeoLoading((prev) => {
        const newSet = new Set(prev)
        newSet.delete(geoId)
        return newSet
      })
      return `Geo: ${geoId}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    setOverallData(null)
    setMonthlyData(null)
    setDailyData(null)

    try {
      // Check if we have a valid session with access token
      if (!session?.accessToken) {
        throw new Error(
          'No valid LinkedIn access token found. Please sign in again.'
        )
      }

      // Fetch all four analytics types in parallel
      const [
        overallResponse,
        aggregateResponse,
        monthlyResponse,
        dailyResponse,
      ] = await Promise.all([
        fetch(
          `/api/overall-analytics?campaignId=${campaignId}&startDate=${startDate}&endDate=${endDate}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        ),
        fetch(
          `/api/analytics?campaignId=${campaignId}&startDate=${startDate}&endDate=${endDate}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        ),
        fetch(
          `/api/monthly-analytics?campaignId=${campaignId}&startDate=${startDate}&endDate=${endDate}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        ),
        fetch(
          `/api/daily-analytics?campaignId=${campaignId}&startDate=${startDate}&endDate=${endDate}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        ),
      ])

      if (!overallResponse.ok) {
        const errorData = await overallResponse.json()
        throw new Error(
          errorData.error || 'Failed to fetch overall analytics data'
        )
      }

      if (!aggregateResponse.ok) {
        const errorData = await aggregateResponse.json()
        throw new Error(errorData.error || 'Failed to fetch analytics data')
      }

      if (!monthlyResponse.ok) {
        const errorData = await monthlyResponse.json()
        throw new Error(
          errorData.error || 'Failed to fetch monthly analytics data'
        )
      }

      if (!dailyResponse.ok) {
        const errorData = await dailyResponse.json()
        throw new Error(
          errorData.error || 'Failed to fetch daily analytics data'
        )
      }

      const overallResult = await overallResponse.json()
      const aggregateResult = await aggregateResponse.json()
      const monthlyResult = await monthlyResponse.json()
      const dailyResult = await dailyResponse.json()

      setOverallData(overallResult)
      setData(aggregateResult)
      setMonthlyData(monthlyResult)
      setDailyData(dailyResult)

      // Fetch geo data for all pivot values from all datasets
      const allElements = [
        ...(aggregateResult.elements || []),
        ...(monthlyResult.elements || []),
        ...(dailyResult.aggregated || []),
        ...dailyResult.dailyData.flatMap(
          (day: { elements?: AnalyticsElement[] }) => day.elements || []
        ),
      ]

      if (allElements.length > 0) {
        const geoIds = new Set<string>()
        allElements.forEach((element: AnalyticsElement) => {
          element.pivotValues.forEach((pivotValue) => {
            const match = pivotValue.match(/urn:li:geo:(\d+)/)
            if (match) {
              geoIds.add(match[1])
            }
          })
        })

        // Fetch geo names for all unique geo IDs
        Promise.all(Array.from(geoIds).map((geoId) => fetchGeoName(geoId)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cost: string) => {
    const num = parseFloat(cost)
    return num > 0 ? `$${num.toFixed(2)}` : '$0.00'
  }

  const formatPivotValue = (pivotValue: string) => {
    // Extract the geo ID from the URN format: urn:li:geo:103644278
    const match = pivotValue.match(/urn:li:geo:(\d+)/)
    if (match) {
      const geoId = match[1]
      return geoData[geoId] || `Geo: ${geoId}`
    }
    return pivotValue
  }

  const formatDateRange = (dateRange: DateRange) => {
    const start = `${dateRange.start.year}-${String(
      dateRange.start.month
    ).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
    const end = `${dateRange.end.year}-${String(dateRange.end.month).padStart(
      2,
      '0'
    )}-${String(dateRange.end.day).padStart(2, '0')}`
    return start === end ? start : `${start} to ${end}`
  }

  // CSV Download Handlers
  const handleDownloadOverall = () => {
    if (!overallData) return
    const csvContent = generateOverallCSV(overallData, geoData)
    const filename = `linkedin-analytics-overall-${campaignId}-${startDate}-to-${endDate}.csv`
    downloadCSV(csvContent, filename)
  }

  const handleDownloadGeographic = () => {
    if (!data) return
    const csvContent = generateGeographicCSV(data, geoData)
    const filename = `linkedin-analytics-geographic-${campaignId}-${startDate}-to-${endDate}.csv`
    downloadCSV(csvContent, filename)
  }

  const handleDownloadMonthly = () => {
    if (!monthlyData) return
    const csvContent = generateMonthlyCSV(monthlyData, geoData)
    const filename = `linkedin-analytics-monthly-${campaignId}-${startDate}-to-${endDate}.csv`
    downloadCSV(csvContent, filename)
  }

  const handleDownloadDaily = () => {
    if (!dailyData) return
    const csvContent = generateDailyCSV(dailyData, geoData)
    const filename = `linkedin-analytics-daily-${campaignId}-${startDate}-to-${endDate}.csv`
    downloadCSV(csvContent, filename)
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='bg-white shadow rounded-lg'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h1 className='text-2xl font-bold text-gray-900'>
              LinkedIn Analytics API Strategy Analysis
            </h1>
            <p className='mt-1 text-sm text-gray-600'>
              Professional comparison of three LinkedIn Marketing API
              approaches: Benchmark validation, Production implementation, and
              Data accuracy analysis
            </p>
          </div>

          <div className='p-6'>
            {/* Token Status Component */}
            <TokenStatusComponent />

            {/* Professional Analysis Description */}
            <div className='mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200'>
              <h3 className='text-lg font-semibold text-blue-900 mb-2'>
                🎯 API Strategy Analysis Overview
              </h3>
              <p className='text-sm text-blue-800 leading-relaxed mb-3'>
                This analysis compares four distinct LinkedIn Marketing API
                approaches to help you choose the optimal strategy for your
                reporting requirements:
              </p>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-3 text-xs auto-rows-fr'>
                <div className='bg-white p-3 rounded border-l-2 border-blue-500 flex items-center justify-center'>
                  <div>
                    <strong className='text-blue-800'>
                      📊 Benchmark Strategy:
                    </strong>
                    <span className='text-blue-600'>
                      {' '}
                      Campaign Manager alignment
                    </span>
                  </div>
                </div>
                <div className='bg-white p-3 rounded border-l-2 border-green-500 flex items-center justify-center'>
                  <div>
                    <strong className='text-green-800'>
                      ✅ Production Strategy:
                    </strong>
                    <span className='text-green-600'>
                      {' '}
                      Demographic insights with acceptable variance
                    </span>
                  </div>
                </div>
                <div className='bg-white p-3 rounded border-l-2 border-purple-500 flex items-center justify-center'>
                  <div>
                    <strong className='text-purple-800'>
                      📅 Time-Series Strategy:
                    </strong>
                    <span className='text-purple-600'>
                      {' '}
                      Monthly trends with demographic insights
                    </span>
                  </div>
                </div>
                <div className='bg-white p-3 rounded border-l-2 border-red-500 flex items-center justify-center'>
                  <div>
                    <strong className='text-red-800'>⚠️ Accuracy Risk:</strong>
                    <span className='text-red-600'>
                      {' '}
                      Data loss through daily aggregation
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4 mb-8'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <label
                    htmlFor='campaignId'
                    className='block text-sm font-medium text-gray-700'
                  >
                    Campaign ID
                  </label>
                  <input
                    type='text'
                    id='campaignId'
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className='mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='Enter campaign ID'
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor='startDate'
                    className='block text-sm font-medium text-gray-700'
                  >
                    Start Date
                  </label>
                  <input
                    type='date'
                    id='startDate'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className='mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor='endDate'
                    className='block text-sm font-medium text-gray-700'
                  >
                    End Date
                  </label>
                  <input
                    type='date'
                    id='endDate'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className='mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    required
                  />
                </div>
              </div>

              <button
                type='submit'
                disabled={loading}
                className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? (
                  <>
                    <svg
                      className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Get Analytics Data'
                )}
              </button>
            </form>

            {error && (
              <div className='mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md'>
                <div className='flex'>
                  <div className='flex-shrink-0'>
                    <svg
                      className='h-5 w-5 text-red-400'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div className='ml-3'>
                    <h3 className='text-sm font-medium text-red-800'>Error</h3>
                    <div className='mt-2 text-sm text-red-700'>
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {overallData && (
              <div className='mb-8 bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Campaign Summary - Overall Totals
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Total campaign performance for ID: {campaignId} (no
                    geographic breakdown)
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Single API call with timeGranularity=ALL and no
                    pivot
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Date Range
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Total Impressions
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Total Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Total Cost
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          CTR
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          CPM
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Total Engagement
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {overallData.elements.map((element, index) => {
                        const ctr =
                          element.impressions > 0
                            ? (
                                (element.clicks / element.impressions) *
                                100
                              ).toFixed(2)
                            : '0.00'
                        const cost = parseFloat(element.costInLocalCurrency)
                        const cpm =
                          element.impressions > 0
                            ? ((cost / element.impressions) * 1000).toFixed(2)
                            : '0.00'
                        const totalEngagement =
                          element.likes +
                          element.comments +
                          element.shares +
                          element.follows

                        return (
                          <tr key={index} className='hover:bg-gray-50'>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {formatDateRange(element.dateRange)}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900'>
                              {element.impressions.toLocaleString()}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900'>
                              {element.clicks.toLocaleString()}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900'>
                              {formatCurrency(element.costInLocalCurrency)}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {ctr}%
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              ${cpm}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              <div className='text-xs space-y-1'>
                                <div className='font-medium text-gray-900'>
                                  Total: {totalEngagement}
                                </div>
                                <div>👍 {element.likes} likes</div>
                                <div>💬 {element.comments} comments</div>
                                <div>🔄 {element.shares} shares</div>
                                <div>➕ {element.follows} follows</div>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {overallData.elements.length === 0 && (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>
                      No overall analytics data found for the specified date
                      range.
                    </p>
                  </div>
                )}
              </div>
            )}

            {data && (
              <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Geographic Breakdown - Pivoted by Country
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Campaign analytics data for ID: {campaignId} broken down by
                    geographic regions (timeGranularity=ALL with pivot)
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Single API call with pivot | Total regions:{' '}
                    {data.elements.length} | Total impressions:{' '}
                    {data.elements
                      .reduce((sum, el) => sum + el.impressions, 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Geographic Region
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Date Range
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Impressions
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Cost
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Company Page Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Engagement
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {data.elements.map((element, index) => (
                        <tr key={index} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                            <div className='space-y-1'>
                              {element.pivotValues.map((pv, pvIndex) => {
                                const match = pv.match(/urn:li:geo:(\d+)/)
                                const geoId = match ? match[1] : ''
                                const geoName = formatPivotValue(pv)
                                const isLoading = geoId && geoLoading.has(geoId)
                                const isGeoId = geoName.startsWith('Geo: ')

                                return (
                                  <div
                                    key={pvIndex}
                                    className='flex items-center space-x-2'
                                  >
                                    {isLoading && (
                                      <div className='animate-spin h-3 w-3 border border-gray-300 border-t-blue-500 rounded-full'></div>
                                    )}
                                    <span
                                      className={
                                        isLoading || isGeoId
                                          ? 'text-gray-400'
                                          : 'text-gray-900 font-medium'
                                      }
                                    >
                                      {geoName}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatDateRange(element.dateRange)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.impressions.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.clicks}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInLocalCurrency)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.companyPageClicks}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            <div className='text-xs space-y-1'>
                              <div>👍 {element.likes} likes</div>
                              <div>💬 {element.comments} comments</div>
                              <div>🔄 {element.shares} shares</div>
                              <div>➕ {element.follows} follows</div>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Totals Row */}
                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          All Regions Combined
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {data.elements
                            .reduce((sum, el) => sum + el.impressions, 0)
                            .toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {data.elements.reduce(
                            (sum, el) => sum + el.clicks,
                            0
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(
                            data.elements
                              .reduce(
                                (sum, el) =>
                                  sum + parseFloat(el.costInLocalCurrency),
                                0
                              )
                              .toString()
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {data.elements.reduce(
                            (sum, el) => sum + el.companyPageClicks,
                            0
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          <div className='text-xs space-y-1'>
                            <div>
                              👍{' '}
                              {data.elements.reduce(
                                (sum, el) => sum + el.likes,
                                0
                              )}{' '}
                              likes
                            </div>
                            <div>
                              💬{' '}
                              {data.elements.reduce(
                                (sum, el) => sum + el.comments,
                                0
                              )}{' '}
                              comments
                            </div>
                            <div>
                              🔄{' '}
                              {data.elements.reduce(
                                (sum, el) => sum + el.shares,
                                0
                              )}{' '}
                              shares
                            </div>
                            <div>
                              ➕{' '}
                              {data.elements.reduce(
                                (sum, el) => sum + el.follows,
                                0
                              )}{' '}
                              follows
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {data.elements.length === 0 && (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>
                      No analytics data found for the specified date range.
                    </p>
                  </div>
                )}
              </div>
            )}

            {monthlyData && (
              <div className='mt-8 bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Monthly Breakdown - Single API Call
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Campaign analytics data for ID: {campaignId} broken down by
                    month and geographic regions (timeGranularity=MONTHLY with
                    pivot)
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Single API call with monthly granularity and
                    geographic pivot | Total elements:{' '}
                    {monthlyData.elements.length} | Total impressions:{' '}
                    {monthlyData.elements
                      .reduce((sum, el) => sum + el.impressions, 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Date Range
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Geographic Region
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Impressions
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Cost
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Company Page Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Engagement
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {monthlyData.elements.map((element, index) => (
                        <tr key={index} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatDateRange(element.dateRange)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                            <div className='space-y-1'>
                              {element.pivotValues.map((pv, pvIndex) => {
                                const match = pv.match(/urn:li:geo:(\d+)/)
                                const geoId = match ? match[1] : ''
                                const geoName = formatPivotValue(pv)
                                const isLoading = geoId && geoLoading.has(geoId)
                                const isGeoId = geoName.startsWith('Geo: ')

                                return (
                                  <div
                                    key={pvIndex}
                                    className='flex items-center space-x-2'
                                  >
                                    {isLoading && (
                                      <div className='animate-spin h-3 w-3 border border-gray-300 border-t-blue-500 rounded-full'></div>
                                    )}
                                    <span
                                      className={
                                        isLoading || isGeoId
                                          ? 'text-gray-400'
                                          : 'text-gray-900 font-medium'
                                      }
                                    >
                                      {geoName}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.impressions.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.clicks}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInLocalCurrency)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.companyPageClicks}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            <div className='text-xs space-y-1'>
                              <div>👍 {element.likes} likes</div>
                              <div>💬 {element.comments} comments</div>
                              <div>🔄 {element.shares} shares</div>
                              <div>➕ {element.follows} follows</div>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Totals Row */}
                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          All Months & Regions Combined
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyData.elements
                            .reduce((sum, el) => sum + el.impressions, 0)
                            .toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyData.elements.reduce(
                            (sum, el) => sum + el.clicks,
                            0
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(
                            monthlyData.elements
                              .reduce(
                                (sum, el) =>
                                  sum + parseFloat(el.costInLocalCurrency),
                                0
                              )
                              .toString()
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyData.elements.reduce(
                            (sum, el) => sum + el.companyPageClicks,
                            0
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          <div className='text-xs space-y-1'>
                            <div>
                              👍{' '}
                              {monthlyData.elements.reduce(
                                (sum, el) => sum + el.likes,
                                0
                              )}{' '}
                              likes
                            </div>
                            <div>
                              💬{' '}
                              {monthlyData.elements.reduce(
                                (sum, el) => sum + el.comments,
                                0
                              )}{' '}
                              comments
                            </div>
                            <div>
                              🔄{' '}
                              {monthlyData.elements.reduce(
                                (sum, el) => sum + el.shares,
                                0
                              )}{' '}
                              shares
                            </div>
                            <div>
                              ➕{' '}
                              {monthlyData.elements.reduce(
                                (sum, el) => sum + el.follows,
                                0
                              )}{' '}
                              follows
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {monthlyData.elements.length === 0 && (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>
                      No monthly analytics data found for the specified date
                      range.
                    </p>
                  </div>
                )}
              </div>
            )}

            {dailyData && (
              <div className='mt-8 bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Daily Breakdown - Multiple API Calls
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Campaign analytics data for ID: {campaignId} with individual
                    daily API calls (timeGranularity=DAILY with pivot, one call
                    per day)
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Multiple API calls (one per day) | Total days:{' '}
                    {dailyData.dailyData.length} | Total aggregated regions:{' '}
                    {dailyData.aggregated.length}
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Date
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Geographic Region
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Impressions
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Cost
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Company Page Clicks
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Engagement
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {dailyData.dailyData
                        .filter((day) => day.elements.length > 0) // Only show days with data
                        .map((day, dayIndex) => {
                          // Show ALL elements, including those with zero values
                          return day.elements.map((element, elementIndex) => (
                            <tr
                              key={`${dayIndex}-${elementIndex}`}
                              className='hover:bg-gray-50'
                            >
                              <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                                {elementIndex === 0 ? day.date : ''}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                                <div className='space-y-1'>
                                  {element.pivotValues.map((pv, pvIndex) => {
                                    const match = pv.match(/urn:li:geo:(\d+)/)
                                    const geoId = match ? match[1] : ''
                                    const geoName = formatPivotValue(pv)
                                    const isLoading =
                                      geoId && geoLoading.has(geoId)
                                    const isGeoId = geoName.startsWith('Geo: ')

                                    return (
                                      <div
                                        key={pvIndex}
                                        className='flex items-center space-x-2'
                                      >
                                        {isLoading && (
                                          <div className='animate-spin h-3 w-3 border border-gray-300 border-t-blue-500 rounded-full'></div>
                                        )}
                                        <span
                                          className={
                                            isLoading || isGeoId
                                              ? 'text-gray-400'
                                              : 'text-gray-900 font-medium'
                                          }
                                        >
                                          {geoName}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {element.impressions.toLocaleString()}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {element.clicks}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {formatCurrency(element.costInLocalCurrency)}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {element.companyPageClicks}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                <div className='text-xs space-y-1'>
                                  <div>👍 {element.likes} likes</div>
                                  <div>💬 {element.comments} comments</div>
                                  <div>🔄 {element.shares} shares</div>
                                  <div>➕ {element.follows} follows</div>
                                </div>
                              </td>
                            </tr>
                          ))
                        })
                        .flat()
                        .filter(Boolean)}

                      {/* Totals Row */}
                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          All Regions Combined
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyData.aggregated
                            .reduce((sum, el) => sum + el.impressions, 0)
                            .toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyData.aggregated.reduce(
                            (sum, el) => sum + el.clicks,
                            0
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(
                            dailyData.aggregated
                              .reduce(
                                (sum, el) =>
                                  sum + parseFloat(el.costInLocalCurrency),
                                0
                              )
                              .toString()
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyData.aggregated.reduce(
                            (sum, el) => sum + el.companyPageClicks,
                            0
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          <div className='text-xs space-y-1'>
                            <div>
                              👍{' '}
                              {dailyData.aggregated.reduce(
                                (sum, el) => sum + el.likes,
                                0
                              )}{' '}
                              likes
                            </div>
                            <div>
                              💬{' '}
                              {dailyData.aggregated.reduce(
                                (sum, el) => sum + el.comments,
                                0
                              )}{' '}
                              comments
                            </div>
                            <div>
                              🔄{' '}
                              {dailyData.aggregated.reduce(
                                (sum, el) => sum + el.shares,
                                0
                              )}{' '}
                              shares
                            </div>
                            <div>
                              ➕{' '}
                              {dailyData.aggregated.reduce(
                                (sum, el) => sum + el.follows,
                                0
                              )}{' '}
                              follows
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {dailyData.dailyData.length === 0 && (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>
                      No daily analytics data found for the specified date
                      range.
                    </p>
                  </div>
                )}

                {/* Note about data display */}
                <div className='px-4 py-3 bg-gray-50 border-t border-gray-200'>
                  <p className='text-xs text-gray-600'>
                    <strong>Note:</strong> All data points are displayed in this
                    table, excluding rows with all zero values.
                  </p>
                </div>
              </div>
            )}

            {overallData && data && monthlyData && dailyData && (
              <div className='mt-8 bg-gradient-to-r from-blue-50 to-green-50 shadow overflow-hidden sm:rounded-lg border-2 border-blue-200'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    📊 LinkedIn Analytics API Strategy Comparison
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-600'>
                    Compare data accuracy and implementation approaches across
                    four distinct LinkedIn Analytics API methodologies
                  </p>
                </div>

                <div className='px-4 pb-5'>
                  <div
                    className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
                    style={{ gridTemplateRows: '1fr', minHeight: '400px' }}
                  >
                    {/* Overall Summary */}
                    <div
                      className='bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex flex-col'
                      style={{ minHeight: '400px' }}
                    >
                      <div className='mb-3'>
                        <h4 className='font-semibold text-gray-900 mb-2'>
                          Overall Summary (timeGranularity=ALL, no pivot)
                        </h4>
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                          📊 Benchmark
                        </span>
                      </div>
                      <p className='text-xs text-gray-600 mb-3 leading-relaxed'>
                        <strong>Recommended for:</strong> Data validation and
                        Campaign Manager report verification. This approach
                        provides the most accurate totals that align with
                        LinkedIn&apos;s Campaign Manager interface, making it
                        the gold standard for data reconciliation.
                      </p>
                      <div className='space-y-2 text-sm mt-auto'>
                        <div className='flex justify-between'>
                          <span>Total Impressions:</span>
                          <span className='font-medium'>
                            {overallData.elements
                              .reduce((sum, el) => sum + el.impressions, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Clicks:</span>
                          <span className='font-medium'>
                            {overallData.elements.reduce(
                              (sum, el) => sum + el.clicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Cost:</span>
                          <span className='font-medium'>
                            {formatCurrency(
                              overallData.elements
                                .reduce(
                                  (sum, el) =>
                                    sum + parseFloat(el.costInLocalCurrency),
                                  0
                                )
                                .toString()
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Company Page Clicks:</span>
                          <span className='font-medium'>
                            {overallData.elements.reduce(
                              (sum, el) => sum + el.companyPageClicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Engagement:</span>
                          <span className='font-medium'>
                            {overallData.elements.reduce(
                              (sum, el) =>
                                sum +
                                el.likes +
                                el.comments +
                                el.shares +
                                el.follows,
                              0
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadOverall}
                          className='w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          📊 Download CSV
                        </button>
                      </div>
                    </div>

                    {/* Geographic Breakdown */}
                    <div
                      className='bg-white p-4 rounded-lg shadow border-l-4 border-green-500 flex flex-col'
                      style={{ minHeight: '400px' }}
                    >
                      <div className='mb-3'>
                        <h4 className='font-semibold text-gray-900 mb-2'>
                          Geographic Breakdown (timeGranularity=ALL, with pivot)
                        </h4>
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                          ✅ Best Practice
                        </span>
                      </div>
                      <p className='text-xs text-gray-600 mb-3 leading-relaxed'>
                        <strong>Recommended for:</strong> Production
                        implementations requiring demographic insights. When
                        demographic pivots are essential for business
                        requirements, this approach balances data accuracy with
                        granular breakdowns while maintaining LinkedIn&apos;s
                        professional demographic compliance standards.
                      </p>
                      <div className='space-y-2 text-sm mt-auto'>
                        <div className='flex justify-between'>
                          <span>Total Impressions:</span>
                          <span className='font-medium'>
                            {data.elements
                              .reduce((sum, el) => sum + el.impressions, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Clicks:</span>
                          <span className='font-medium'>
                            {data.elements.reduce(
                              (sum, el) => sum + el.clicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Cost:</span>
                          <span className='font-medium'>
                            {formatCurrency(
                              data.elements
                                .reduce(
                                  (sum, el) =>
                                    sum + parseFloat(el.costInLocalCurrency),
                                  0
                                )
                                .toString()
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Company Page Clicks:</span>
                          <span className='font-medium'>
                            {data.elements.reduce(
                              (sum, el) => sum + el.companyPageClicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Engagement:</span>
                          <span className='font-medium'>
                            {data.elements.reduce(
                              (sum, el) =>
                                sum +
                                el.likes +
                                el.comments +
                                el.shares +
                                el.follows,
                              0
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadGeographic}
                          className='w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          🌍 Download CSV
                        </button>
                      </div>
                    </div>

                    {/* Monthly Breakdown */}
                    <div
                      className='bg-white p-4 rounded-lg shadow border-l-4 border-purple-500 flex flex-col'
                      style={{ minHeight: '400px' }}
                    >
                      <div className='mb-3'>
                        <h4 className='font-semibold text-gray-900 text-sm leading-tight mb-2'>
                          Monthly Breakdown
                          <br />
                          <span className='text-xs text-gray-600'>
                            (timeGranularity=MONTHLY, with pivot)
                          </span>
                        </h4>
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
                          ⚠️ Use with Caution
                        </span>
                      </div>
                      <p className='text-xs text-gray-600 mb-3 leading-relaxed'>
                        <strong>Caution:</strong> While providing temporal
                        granularity, this approach exhibits{' '}
                        {(() => {
                          const geoTotal = data.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const monthlyTotal = monthlyData.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const reductionPercent =
                            geoTotal > 0
                              ? Math.round(
                                  ((geoTotal - monthlyTotal) / geoTotal) * 100
                                )
                              : 0

                          let severityText = 'minimal data loss'
                          if (reductionPercent >= 50) {
                            severityText = 'severe data loss'
                          } else if (reductionPercent >= 20) {
                            severityText = 'significant data loss'
                          } else if (reductionPercent >= 5) {
                            severityText = 'moderate data loss'
                          }

                          return severityText
                        })()}{' '}
                        due to LinkedIn&apos;s demographic filtering applied at
                        the monthly level. Cost metrics show{' '}
                        {(() => {
                          const geoTotal = data.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const monthlyTotal = monthlyData.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const reductionPercent =
                            geoTotal > 0
                              ? Math.round(
                                  ((geoTotal - monthlyTotal) / geoTotal) * 100
                                )
                              : 0
                          return `~${reductionPercent}%`
                        })()}{' '}
                        reduction compared to Geographic Breakdown
                        {(() => {
                          const geoTotal = data.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const monthlyTotal = monthlyData.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const reductionPercent =
                            geoTotal > 0
                              ? Math.round(
                                  ((geoTotal - monthlyTotal) / geoTotal) * 100
                                )
                              : 0

                          if (reductionPercent >= 20) {
                            return ', indicating substantial underreporting that may impact budget reconciliation and financial accuracy'
                          } else if (reductionPercent >= 5) {
                            return ', which may affect budget reconciliation accuracy'
                          } else {
                            return ', representing acceptable variance for most use cases'
                          }
                        })()}
                        .
                      </p>
                      <div className='space-y-2 text-sm mt-auto'>
                        <div className='flex justify-between'>
                          <span>Total Impressions:</span>
                          <span className='font-medium'>
                            {monthlyData.elements
                              .reduce((sum, el) => sum + el.impressions, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Clicks:</span>
                          <span className='font-medium'>
                            {monthlyData.elements.reduce(
                              (sum, el) => sum + el.clicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Cost:</span>
                          <span className='font-medium'>
                            {formatCurrency(
                              monthlyData.elements
                                .reduce(
                                  (sum, el) =>
                                    sum + parseFloat(el.costInLocalCurrency),
                                  0
                                )
                                .toString()
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Company Page Clicks:</span>
                          <span className='font-medium'>
                            {monthlyData.elements.reduce(
                              (sum, el) => sum + el.companyPageClicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Engagement:</span>
                          <span className='font-medium'>
                            {monthlyData.elements.reduce(
                              (sum, el) =>
                                sum +
                                el.likes +
                                el.comments +
                                el.shares +
                                el.follows,
                              0
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadMonthly}
                          className='w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          📅 Download CSV
                        </button>
                      </div>
                    </div>

                    {/* Daily Totals */}
                    <div
                      className='bg-white p-4 rounded-lg shadow border-l-4 border-red-500 flex flex-col'
                      style={{ minHeight: '400px' }}
                    >
                      <div className='mb-3'>
                        <h4 className='font-semibold text-gray-900 text-sm leading-tight mb-2'>
                          Daily API Calls Sum
                          <br />
                          <span className='text-xs text-gray-600'>
                            (timeGranularity=DAILY, with pivot)
                          </span>
                        </h4>
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                          ⚠️ Not Recommended
                        </span>
                      </div>
                      <p className='text-xs text-gray-600 mb-3 leading-relaxed'>
                        <strong>Caution:</strong> This approach may result in
                        significant data loss and reporting inaccuracies due to
                        LinkedIn&apos;s professional demographic filtering
                        applied at the daily level. The aggregation of filtered
                        daily data compounds data loss, making totals unreliable
                        for business decisions.
                      </p>
                      <div className='space-y-2 text-sm mt-auto'>
                        <div className='flex justify-between'>
                          <span>Total Impressions:</span>
                          <span className='font-medium'>
                            {dailyData.aggregated
                              .reduce((sum, el) => sum + el.impressions, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Clicks:</span>
                          <span className='font-medium'>
                            {dailyData.aggregated.reduce(
                              (sum, el) => sum + el.clicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Cost:</span>
                          <span className='font-medium'>
                            {formatCurrency(
                              dailyData.aggregated
                                .reduce(
                                  (sum, el) =>
                                    sum + parseFloat(el.costInLocalCurrency),
                                  0
                                )
                                .toString()
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Company Page Clicks:</span>
                          <span className='font-medium'>
                            {dailyData.aggregated.reduce(
                              (sum, el) => sum + el.companyPageClicks,
                              0
                            )}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Total Engagement:</span>
                          <span className='font-medium'>
                            {dailyData.aggregated.reduce(
                              (sum, el) =>
                                sum +
                                el.likes +
                                el.comments +
                                el.shares +
                                el.follows,
                              0
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadDaily}
                          className='w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          📊 Download CSV
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Difference Analysis */}
                  <div className='mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200'>
                    <h4 className='font-semibold text-yellow-800 mb-2'>
                      🔍 Professional API Strategy Analysis
                    </h4>
                    <div className='text-sm text-yellow-700'>
                      {(() => {
                        // Calculate totals for each metric from all four strategies
                        const overallImpressions = overallData.elements.reduce(
                          (sum, el) => sum + el.impressions,
                          0
                        )
                        const overallClicks = overallData.elements.reduce(
                          (sum, el) => sum + el.clicks,
                          0
                        )
                        const overallCost = overallData.elements.reduce(
                          (sum, el) => sum + parseFloat(el.costInLocalCurrency),
                          0
                        )
                        const overallCompanyPageClicks =
                          overallData.elements.reduce(
                            (sum, el) => sum + el.companyPageClicks,
                            0
                          )
                        const overallEngagement = overallData.elements.reduce(
                          (sum, el) =>
                            sum +
                            el.likes +
                            el.comments +
                            el.shares +
                            el.follows,
                          0
                        )

                        const aggregateImpressions = data.elements.reduce(
                          (sum, el) => sum + el.impressions,
                          0
                        )
                        const aggregateClicks = data.elements.reduce(
                          (sum, el) => sum + el.clicks,
                          0
                        )
                        const aggregateCost = data.elements.reduce(
                          (sum, el) => sum + parseFloat(el.costInLocalCurrency),
                          0
                        )
                        const aggregateCompanyPageClicks = data.elements.reduce(
                          (sum, el) => sum + el.companyPageClicks,
                          0
                        )
                        const aggregateEngagement = data.elements.reduce(
                          (sum, el) =>
                            sum +
                            el.likes +
                            el.comments +
                            el.shares +
                            el.follows,
                          0
                        )

                        const monthlyImpressions = monthlyData.elements.reduce(
                          (sum, el) => sum + el.impressions,
                          0
                        )
                        const monthlyClicks = monthlyData.elements.reduce(
                          (sum, el) => sum + el.clicks,
                          0
                        )
                        const monthlyCost = monthlyData.elements.reduce(
                          (sum, el) => sum + parseFloat(el.costInLocalCurrency),
                          0
                        )
                        const monthlyCompanyPageClicks =
                          monthlyData.elements.reduce(
                            (sum, el) => sum + el.companyPageClicks,
                            0
                          )
                        const monthlyEngagement = monthlyData.elements.reduce(
                          (sum, el) =>
                            sum +
                            el.likes +
                            el.comments +
                            el.shares +
                            el.follows,
                          0
                        )

                        const dailyImpressions = dailyData.aggregated.reduce(
                          (sum, el) => sum + el.impressions,
                          0
                        )
                        const dailyClicks = dailyData.aggregated.reduce(
                          (sum, el) => sum + el.clicks,
                          0
                        )
                        const dailyCost = dailyData.aggregated.reduce(
                          (sum, el) => sum + parseFloat(el.costInLocalCurrency),
                          0
                        )
                        const dailyCompanyPageClicks =
                          dailyData.aggregated.reduce(
                            (sum, el) => sum + el.companyPageClicks,
                            0
                          )
                        const dailyEngagement = dailyData.aggregated.reduce(
                          (sum, el) =>
                            sum +
                            el.likes +
                            el.comments +
                            el.shares +
                            el.follows,
                          0
                        )

                        // Calculate differences for all metrics between all four strategies
                        const impressionDiffs = {
                          overallVsAggregate: Math.abs(
                            overallImpressions - aggregateImpressions
                          ),
                          overallVsMonthly: Math.abs(
                            overallImpressions - monthlyImpressions
                          ),
                          overallVsDaily: Math.abs(
                            overallImpressions - dailyImpressions
                          ),
                          aggregateVsMonthly: Math.abs(
                            aggregateImpressions - monthlyImpressions
                          ),
                          aggregateVsDaily: Math.abs(
                            aggregateImpressions - dailyImpressions
                          ),
                          monthlyVsDaily: Math.abs(
                            monthlyImpressions - dailyImpressions
                          ),
                        }

                        const clickDiffs = {
                          overallVsAggregate: Math.abs(
                            overallClicks - aggregateClicks
                          ),
                          overallVsMonthly: Math.abs(
                            overallClicks - monthlyClicks
                          ),
                          overallVsDaily: Math.abs(overallClicks - dailyClicks),
                          aggregateVsMonthly: Math.abs(
                            aggregateClicks - monthlyClicks
                          ),
                          aggregateVsDaily: Math.abs(
                            aggregateClicks - dailyClicks
                          ),
                          monthlyVsDaily: Math.abs(monthlyClicks - dailyClicks),
                        }

                        const costDiffs = {
                          overallVsAggregate: Math.abs(
                            overallCost - aggregateCost
                          ),
                          overallVsMonthly: Math.abs(overallCost - monthlyCost),
                          overallVsDaily: Math.abs(overallCost - dailyCost),
                          aggregateVsMonthly: Math.abs(
                            aggregateCost - monthlyCost
                          ),
                          aggregateVsDaily: Math.abs(aggregateCost - dailyCost),
                          monthlyVsDaily: Math.abs(monthlyCost - dailyCost),
                        }

                        const companyPageClickDiffs = {
                          overallVsAggregate: Math.abs(
                            overallCompanyPageClicks -
                              aggregateCompanyPageClicks
                          ),
                          overallVsMonthly: Math.abs(
                            overallCompanyPageClicks - monthlyCompanyPageClicks
                          ),
                          overallVsDaily: Math.abs(
                            overallCompanyPageClicks - dailyCompanyPageClicks
                          ),
                          aggregateVsMonthly: Math.abs(
                            aggregateCompanyPageClicks -
                              monthlyCompanyPageClicks
                          ),
                          aggregateVsDaily: Math.abs(
                            aggregateCompanyPageClicks - dailyCompanyPageClicks
                          ),
                          monthlyVsDaily: Math.abs(
                            monthlyCompanyPageClicks - dailyCompanyPageClicks
                          ),
                        }

                        const engagementDiffs = {
                          overallVsAggregate: Math.abs(
                            overallEngagement - aggregateEngagement
                          ),
                          overallVsMonthly: Math.abs(
                            overallEngagement - monthlyEngagement
                          ),
                          overallVsDaily: Math.abs(
                            overallEngagement - dailyEngagement
                          ),
                          aggregateVsMonthly: Math.abs(
                            aggregateEngagement - monthlyEngagement
                          ),
                          aggregateVsDaily: Math.abs(
                            aggregateEngagement - dailyEngagement
                          ),
                          monthlyVsDaily: Math.abs(
                            monthlyEngagement - dailyEngagement
                          ),
                        }

                        // Check if all metrics match perfectly
                        const allMatch =
                          Object.values(impressionDiffs).every(
                            (diff) => diff === 0
                          ) &&
                          Object.values(clickDiffs).every(
                            (diff) => diff === 0
                          ) &&
                          Object.values(costDiffs).every(
                            (diff) => diff === 0
                          ) &&
                          Object.values(companyPageClickDiffs).every(
                            (diff) => diff === 0
                          ) &&
                          Object.values(engagementDiffs).every(
                            (diff) => diff === 0
                          )

                        return allMatch ? (
                          <p>
                            ✅ Perfect match! All four API strategies return
                            identical totals across all metrics.
                          </p>
                        ) : (
                          <div className='space-y-3'>
                            <p className='font-medium'>
                              Metric differences between API strategies:
                            </p>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                              <div>
                                <p className='font-semibold text-yellow-800 mb-1'>
                                  Impressions:
                                </p>
                                <ul className='ml-4 space-y-1 text-xs'>
                                  <li>
                                    • Overall vs Geographic:{' '}
                                    {impressionDiffs.overallVsAggregate.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Monthly:{' '}
                                    {impressionDiffs.overallVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Daily:{' '}
                                    {impressionDiffs.overallVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Monthly:{' '}
                                    {impressionDiffs.aggregateVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Daily:{' '}
                                    {impressionDiffs.aggregateVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Monthly vs Daily:{' '}
                                    {impressionDiffs.monthlyVsDaily.toLocaleString()}
                                  </li>
                                </ul>
                              </div>

                              <div>
                                <p className='font-semibold text-yellow-800 mb-1'>
                                  Clicks:
                                </p>
                                <ul className='ml-4 space-y-1 text-xs'>
                                  <li>
                                    • Overall vs Geographic:{' '}
                                    {clickDiffs.overallVsAggregate.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Monthly:{' '}
                                    {clickDiffs.overallVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Daily:{' '}
                                    {clickDiffs.overallVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Monthly:{' '}
                                    {clickDiffs.aggregateVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Daily:{' '}
                                    {clickDiffs.aggregateVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Monthly vs Daily:{' '}
                                    {clickDiffs.monthlyVsDaily.toLocaleString()}
                                  </li>
                                </ul>
                              </div>

                              <div>
                                <p className='font-semibold text-yellow-800 mb-1'>
                                  Cost:
                                </p>
                                <ul className='ml-4 space-y-1 text-xs'>
                                  <li>
                                    • Overall vs Geographic: $
                                    {costDiffs.overallVsAggregate.toFixed(2)}
                                  </li>
                                  <li>
                                    • Overall vs Monthly: $
                                    {costDiffs.overallVsMonthly.toFixed(2)}
                                  </li>
                                  <li>
                                    • Overall vs Daily: $
                                    {costDiffs.overallVsDaily.toFixed(2)}
                                  </li>
                                  <li>
                                    • Geographic vs Monthly: $
                                    {costDiffs.aggregateVsMonthly.toFixed(2)}
                                  </li>
                                  <li>
                                    • Geographic vs Daily: $
                                    {costDiffs.aggregateVsDaily.toFixed(2)}
                                  </li>
                                  <li>
                                    • Monthly vs Daily: $
                                    {costDiffs.monthlyVsDaily.toFixed(2)}
                                  </li>
                                </ul>
                              </div>

                              <div>
                                <p className='font-semibold text-yellow-800 mb-1'>
                                  Company Page Clicks:
                                </p>
                                <ul className='ml-4 space-y-1 text-xs'>
                                  <li>
                                    • Overall vs Geographic:{' '}
                                    {companyPageClickDiffs.overallVsAggregate.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Monthly:{' '}
                                    {companyPageClickDiffs.overallVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Daily:{' '}
                                    {companyPageClickDiffs.overallVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Monthly:{' '}
                                    {companyPageClickDiffs.aggregateVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Daily:{' '}
                                    {companyPageClickDiffs.aggregateVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Monthly vs Daily:{' '}
                                    {companyPageClickDiffs.monthlyVsDaily.toLocaleString()}
                                  </li>
                                </ul>
                              </div>

                              <div className='md:col-span-2'>
                                <p className='font-semibold text-yellow-800 mb-1'>
                                  Total Engagement:
                                </p>
                                <ul className='ml-4 space-y-1 text-xs'>
                                  <li>
                                    • Overall vs Geographic:{' '}
                                    {engagementDiffs.overallVsAggregate.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Monthly:{' '}
                                    {engagementDiffs.overallVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Overall vs Daily:{' '}
                                    {engagementDiffs.overallVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Monthly:{' '}
                                    {engagementDiffs.aggregateVsMonthly.toLocaleString()}
                                  </li>
                                  <li>
                                    • Geographic vs Daily:{' '}
                                    {engagementDiffs.aggregateVsDaily.toLocaleString()}
                                  </li>
                                  <li>
                                    • Monthly vs Daily:{' '}
                                    {engagementDiffs.monthlyVsDaily.toLocaleString()}
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <p className='mt-3 text-xs'>
                              ⚠️ These differences are primarily due to
                              LinkedIn&apos;s Professional Demographic
                              restrictions:
                              <br />
                              • Professional Demographic values will not be
                              returned for ads receiving engagement from too few
                              members
                              <br />
                              • Professional Demographic pivots have a minimum
                              threshold of 3 events - values with less than 3
                              events are dropped from query results
                              <br />
                              • Geographic data uses professional demographics,
                              which may cause discrepancies when compared to
                              overall metrics
                              <br />
                              <a
                                href='https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2025-06&tabs=http#restrictions'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-blue-600 underline hover:text-blue-800'
                              >
                                Learn more about LinkedIn&apos;s reporting
                                restrictions
                              </a>
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Professional Recommendations */}
                  <div className='mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200'>
                    <h4 className='font-semibold text-blue-800 mb-3'>
                      🎯 Professional Implementation Recommendations
                    </h4>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm'>
                      <div className='bg-white p-3 rounded-lg border-l-4 border-blue-500'>
                        <h5 className='font-semibold text-blue-800 mb-2'>
                          📊 Benchmark Strategy
                        </h5>
                        <p className='text-blue-700 text-xs leading-relaxed'>
                          <strong>Overall Summary</strong> should be your
                          primary reference for data validation. Use this
                          approach to verify Campaign Manager report alignment
                          and establish baseline metrics for business reporting.
                        </p>
                      </div>
                      <div className='bg-white p-3 rounded-lg border-l-4 border-green-500'>
                        <h5 className='font-semibold text-green-800 mb-2'>
                          ✅ Production Strategy
                        </h5>
                        <p className='text-green-700 text-xs leading-relaxed'>
                          <strong>Geographic Breakdown</strong> represents the
                          best practice when demographic insights are required.
                          Accept minor data variance in exchange for valuable
                          segmentation capabilities that drive strategic
                          decisions.
                        </p>
                      </div>
                      <div className='bg-white p-3 rounded-lg border-l-4 border-orange-500'>
                        <h5 className='font-semibold text-orange-800 mb-2'>
                          ⚠️ Moderate Risk Strategy
                        </h5>
                        <p className='text-orange-700 text-xs leading-relaxed'>
                          <strong>Monthly Breakdown</strong> shows{' '}
                          {(() => {
                            const geoTotal = data.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const monthlyTotal = monthlyData.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const reductionPercent =
                              geoTotal > 0
                                ? Math.round(
                                    ((geoTotal - monthlyTotal) / geoTotal) * 100
                                  )
                                : 0

                            let severityText = 'minimal data variance'
                            if (reductionPercent >= 50) {
                              severityText = 'severe data loss'
                            } else if (reductionPercent >= 20) {
                              severityText = 'significant data loss'
                            } else if (reductionPercent >= 5) {
                              severityText = 'moderate data loss'
                            }

                            return severityText
                          })()}{' '}
                          with{' '}
                          {(() => {
                            const geoTotal = data.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const monthlyTotal = monthlyData.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const reductionPercent =
                              geoTotal > 0
                                ? Math.round(
                                    ((geoTotal - monthlyTotal) / geoTotal) * 100
                                  )
                                : 0
                            return `~${reductionPercent}%`
                          })()}{' '}
                          cost{' '}
                          {(() => {
                            const geoTotal = data.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const monthlyTotal = monthlyData.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const reductionPercent =
                              geoTotal > 0
                                ? Math.round(
                                    ((geoTotal - monthlyTotal) / geoTotal) * 100
                                  )
                                : 0

                            if (reductionPercent >= 20) {
                              return 'underreporting. Use with significant caution when temporal granularity is essential, and implement comprehensive validation against benchmark totals for financial accuracy'
                            } else if (reductionPercent >= 5) {
                              return 'variance. Use with caution when temporal granularity is essential, but implement additional validation against benchmark totals for financial accuracy'
                            } else {
                              return 'difference. Generally acceptable for temporal analysis use cases, though validation against benchmark totals is still recommended'
                            }
                          })()}
                          .
                        </p>
                      </div>
                      <div className='bg-white p-3 rounded-lg border-l-4 border-red-500'>
                        <h5 className='font-semibold text-red-800 mb-2'>
                          ❌ High Risk Strategy
                        </h5>
                        <p className='text-red-700 text-xs leading-relaxed'>
                          <strong>Daily API Calls Sum</strong> exhibits severe
                          data loss with{' '}
                          {(() => {
                            const geoTotal = data.elements.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const dailyTotal = dailyData.aggregated.reduce(
                              (sum, el) =>
                                sum + parseFloat(el.costInLocalCurrency),
                              0
                            )
                            const reductionPercent =
                              geoTotal > 0
                                ? Math.round(
                                    ((geoTotal - dailyTotal) / geoTotal) * 100
                                  )
                                : 0
                            return `~${reductionPercent}%`
                          })()}{' '}
                          cost underreporting. The compounded filtering from
                          multiple daily API calls creates unreliable totals
                          that may severely mislead business decisions.
                        </p>
                      </div>
                    </div>
                    <div className='mt-4 p-3 bg-indigo-100 rounded-lg'>
                      <p className='text-xs text-indigo-800 leading-relaxed'>
                        <strong>Key Insight:</strong> Data discrepancies between
                        strategies are not implementation errors but reflect
                        LinkedIn&apos;s privacy-first approach to professional
                        demographic reporting. Choose your strategy based on
                        your specific reporting requirements: Overall for
                        validation, Geographic for demographics, Monthly with
                        caution for time-series (expect{' '}
                        {(() => {
                          const geoTotal = data.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const monthlyTotal = monthlyData.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const monthlyReductionPercent =
                            geoTotal > 0
                              ? Math.round(
                                  ((geoTotal - monthlyTotal) / geoTotal) * 100
                                )
                              : 0
                          return `~${monthlyReductionPercent}%`
                        })()}{' '}
                        cost underreporting), and avoid Daily aggregation due to
                        severe data loss (
                        {(() => {
                          const geoTotal = data.elements.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const dailyTotal = dailyData.aggregated.reduce(
                            (sum, el) =>
                              sum + parseFloat(el.costInLocalCurrency),
                            0
                          )
                          const dailyReductionPercent =
                            geoTotal > 0
                              ? Math.round(
                                  ((geoTotal - dailyTotal) / geoTotal) * 100
                                )
                              : 0
                          return `~${dailyReductionPercent}%`
                        })()}{' '}
                        cost underreporting).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
