'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { computeLinkedInApiVersion } from '@/lib/linkedin-api-version'
import TokenStatusComponent from './components/TokenStatusComponent'
import {
  downloadCSV,
  generateDailyCSV,
  generateGeographicCSV,
  generateMonthlyCSV,
  generateOverallCSV,
} from '../utils/csv-export'

interface DateRange {
  start: {
    year: number
    month: number
    day: number
  }
  end?: {
    year: number
    month: number
    day: number
  }
}

interface AnalyticsElement {
  dateRange: DateRange
  impressions: number
  likes: number
  shares: number
  costInLocalCurrency: string
  clicks: number
  costInUsd: string
  comments: number
  pivotValues: string[]
}

interface LinkedInAnalyticsResponse {
  paging: {
    start: number
    count: number
    links: Record<string, unknown>[]
  }
  elements: AnalyticsElement[]
}

interface AggregatedMetrics {
  impressions: number
  clicks: number
  costInLocalCurrency: number
  costInUsd: number
  likes: number
  comments: number
  shares: number
}

interface DifferenceGroup {
  overallVsGeographic: number
  overallVsMonthly: number
  overallVsDaily: number
  geographicVsMonthly: number
  geographicVsDaily: number
  monthlyVsDaily: number
}

type StrategyKey = 'overall' | 'geographic' | 'monthly' | 'daily'

type CopyStrategyKey = StrategyKey | `${StrategyKey}Response`

interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
}

const ZERO_METRICS: AggregatedMetrics = {
  impressions: 0,
  clicks: 0,
  costInLocalCurrency: 0,
  costInUsd: 0,
  likes: 0,
  comments: 0,
  shares: 0,
}

const parseMetricValue = (value: string) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const aggregateMetrics = (elements: AnalyticsElement[]): AggregatedMetrics =>
  elements.reduce(
    (totals, element) => ({
      impressions: totals.impressions + element.impressions,
      clicks: totals.clicks + element.clicks,
      costInLocalCurrency:
        totals.costInLocalCurrency + parseMetricValue(element.costInLocalCurrency),
      costInUsd: totals.costInUsd + parseMetricValue(element.costInUsd),
      likes: totals.likes + element.likes,
      comments: totals.comments + element.comments,
      shares: totals.shares + element.shares,
    }),
    ZERO_METRICS
  )

const calculateDifferenceGroup = (
  overall: number,
  geographic: number,
  monthly: number,
  daily: number
): DifferenceGroup => ({
  overallVsGeographic: Math.abs(overall - geographic),
  overallVsMonthly: Math.abs(overall - monthly),
  overallVsDaily: Math.abs(overall - daily),
  geographicVsMonthly: Math.abs(geographic - monthly),
  geographicVsDaily: Math.abs(geographic - daily),
  monthlyVsDaily: Math.abs(monthly - daily),
})

const calculateReductionPercent = (baseline: number, comparison: number) =>
  baseline > 0 ? Math.round(((baseline - comparison) / baseline) * 100) : 0

const getReductionSeverity = (reductionPercent: number) => {
  if (reductionPercent >= 50) return 'severe data loss'
  if (reductionPercent >= 20) return 'significant data loss'
  if (reductionPercent >= 5) return 'moderate data loss'
  return 'minimal data variance'
}

const getMonthlyReductionNarrative = (reductionPercent: number) => {
  if (reductionPercent >= 20) {
    return 'underreporting. Use with significant caution when temporal granularity is essential, and implement comprehensive validation against benchmark totals for financial accuracy'
  }

  if (reductionPercent >= 5) {
    return 'variance. Use with caution when temporal granularity is essential, but implement additional validation against benchmark totals for financial accuracy'
  }

  return 'difference. Generally acceptable for temporal analysis use cases, though validation against benchmark totals is still recommended'
}

const DIFFERENCE_LABELS: Array<[keyof DifferenceGroup, string]> = [
  ['overallVsGeographic', 'Overall vs Geographic'],
  ['overallVsMonthly', 'Overall vs Monthly'],
  ['overallVsDaily', 'Overall vs Daily'],
  ['geographicVsMonthly', 'Geographic vs Monthly'],
  ['geographicVsDaily', 'Geographic vs Daily'],
  ['monthlyVsDaily', 'Monthly vs Daily'],
]

const PAGE_SIZE = 10

const datePartToNumber = (dp: {
  year: number
  month: number
  day: number
}): number => dp.year * 10000 + dp.month * 100 + dp.day

const getElementSortValue = (
  element: AnalyticsElement,
  column: string,
  geoNames: Record<string, string>
): string | number => {
  switch (column) {
    case 'dateRange':
    case 'startDate':
      return datePartToNumber(element.dateRange.start)
    case 'endDate':
      return element.dateRange.end ? datePartToNumber(element.dateRange.end) : 0
    case 'geography':
    case 'region': {
      const pivotValue = element.pivotValues[0] || 'All Regions'
      const match = pivotValue.match(/urn:li:geo:(\d+)/)
      if (match) {
        return geoNames[match[1]] || pivotValue
      }
      return pivotValue
    }
    case 'impressions':
      return element.impressions
    case 'clicks':
      return element.clicks
    case 'costLocal':
      return parseMetricValue(element.costInLocalCurrency)
    case 'costUsd':
      return parseMetricValue(element.costInUsd)
    case 'likes':
      return element.likes
    case 'comments':
      return element.comments
    case 'shares':
      return element.shares
    default:
      return 0
  }
}

const sortElements = (
  elements: AnalyticsElement[],
  config: SortConfig,
  geoNames: Record<string, string>
): AnalyticsElement[] =>
  [...elements].sort((a, b) => {
    const aValue = getElementSortValue(a, config.column, geoNames)
    const bValue = getElementSortValue(b, config.column, geoNames)

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return config.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (aValue < bValue) {
      return config.direction === 'asc' ? -1 : 1
    }

    if (aValue > bValue) {
      return config.direction === 'asc' ? 1 : -1
    }

    return 0
  })

const handleSort = (
  currentSort: SortConfig,
  column: string,
  setter: (sortConfig: SortConfig) => void,
  resetPage?: () => void
) => {
  if (resetPage) {
    resetPage()
  }

  if (currentSort.column === column) {
    setter({
      column,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
    })
    return
  }

  setter({ column, direction: 'desc' })
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [accountId, setAccountId] = useState('518645095')
  const [campaignId, setCampaignId] = useState('531508486')
  const [creativeId, setCreativeId] = useState('1119860556')

  const getDefaultDates = () => {
    return {
      startDate: '2026-02-19',
      endDate: '',
    }
  }

  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState(defaultDates.startDate)
  const [endDate, setEndDate] = useState(defaultDates.endDate)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LinkedInAnalyticsResponse | null>(null)
  const [overallData, setOverallData] =
    useState<LinkedInAnalyticsResponse | null>(null)
  const [overallRawResponse, setOverallRawResponse] = useState('')
  const [monthlyData, setMonthlyData] =
    useState<LinkedInAnalyticsResponse | null>(null)
  const [geographicRawResponse, setGeographicRawResponse] = useState('')
  const [monthlyRawResponse, setMonthlyRawResponse] = useState('')
  const [dailyData, setDailyData] = useState<LinkedInAnalyticsResponse | null>(
    null
  )
  const [dailyRawResponse, setDailyRawResponse] = useState('')
  const [monthlyPage, setMonthlyPage] = useState(0)
  const [dailyPage, setDailyPage] = useState(0)
  const [overallSort, setOverallSort] = useState<SortConfig>({
    column: 'dateRange',
    direction: 'desc',
  })
  const [geographicSort, setGeographicSort] = useState<SortConfig>({
    column: 'dateRange',
    direction: 'desc',
  })
  const [monthlySort, setMonthlySort] = useState<SortConfig>({
    column: 'dateRange',
    direction: 'desc',
  })
  const [dailySort, setDailySort] = useState<SortConfig>({
    column: 'startDate',
    direction: 'desc',
  })
  const [debugOpen, setDebugOpen] = useState<Record<string, boolean>>({})
  const [copiedStrategy, setCopiedStrategy] = useState<CopyStrategyKey | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [geoData, setGeoData] = useState<{ [key: string]: string }>({})
  const [geoLoading, setGeoLoading] = useState<Set<string>>(new Set())
  const [customToken, setCustomToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenValidating, setTokenValidating] = useState(false)
  const [tokenValidationResult, setTokenValidationResult] = useState<{
    active: boolean
    status?: string
    scope?: string
    validatedVia?: string
    message?: string
    computed?: {
      isExpired: boolean
      expiresInDays: number | null
      ageInDays: number | null
    }
  } | null>(null)
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(
    null
  )

  const activeToken = customToken || session?.accessToken || ''

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

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
          Authorization: `Bearer ${activeToken}`,
        },
      })
      const responseData = await response.json()
      const countryName =
        responseData.defaultLocalizedName?.value || `Geo: ${geoId}`

      setGeoData((prev) => ({ ...prev, [geoId]: countryName }))
      setGeoLoading((prev) => {
        const newSet = new Set(prev)
        newSet.delete(geoId)
        return newSet
      })
      return countryName
    } catch (fetchError) {
      console.error('Error fetching geo data:', fetchError)
      setGeoLoading((prev) => {
        const newSet = new Set(prev)
        newSet.delete(geoId)
        return newSet
      })
      return `Geo: ${geoId}`
    }
  }

  const handleValidateToken = async () => {
    const trimmed = tokenInput.trim()
    if (!trimmed) return

    setTokenValidating(true)
    setTokenValidationResult(null)
    setTokenValidationError(null)

    try {
      const response = await fetch('/api/token-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      })

      const result = await response.json()

      if (!response.ok) {
        setTokenValidationError(result.error || 'Validation failed')
        return
      }

      setTokenValidationResult(result)

      if (result.active && !result.computed?.isExpired) {
        setCustomToken(trimmed)
      }
    } catch (err) {
      setTokenValidationError(
        err instanceof Error ? err.message : 'Validation failed'
      )
    } finally {
      setTokenValidating(false)
    }
  }

  const handleClearCustomToken = () => {
    setCustomToken('')
    setTokenInput('')
    setTokenValidationResult(null)
    setTokenValidationError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    setOverallData(null)
    setMonthlyData(null)
    setDailyData(null)
    setOverallRawResponse('')
    setGeographicRawResponse('')
    setMonthlyRawResponse('')
    setDailyRawResponse('')
    setCopiedStrategy(null)

    try {
      if (!activeToken) {
        throw new Error(
          'No valid access token. Please sign in or paste a custom token above.'
        )
      }

      if (!startDate) {
        throw new Error('Start date is required.')
      }

      let query = `accountId=${accountId}&startDate=${startDate}`
      if (creativeId) query += `&creativeId=${creativeId}`
      if (campaignId && campaignId !== '0') query += `&campaignId=${campaignId}`
      if (endDate) query += `&endDate=${endDate}`

      const [
        overallResponse,
        aggregateResponse,
        monthlyResponse,
        dailyResponse,
      ] = await Promise.all([
        fetch(`/api/overall-analytics?${query}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }),
        fetch(`/api/analytics?${query}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }),
        fetch(`/api/monthly-analytics?${query}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }),
        fetch(`/api/daily-analytics-single?${query}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }),
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

      setOverallRawResponse(JSON.stringify(overallResult, null, 2))
      setGeographicRawResponse(JSON.stringify(aggregateResult, null, 2))
      setMonthlyRawResponse(JSON.stringify(monthlyResult, null, 2))
      setDailyRawResponse(JSON.stringify(dailyResult, null, 2))
      setOverallData(overallResult)
      setData(aggregateResult)
      setMonthlyData(monthlyResult)
      setDailyData(dailyResult)
      setMonthlyPage(0)
      setDailyPage(0)

      const allElements = [
        ...(aggregateResult.elements || []),
        ...(monthlyResult.elements || []),
        ...(dailyResult.elements || []),
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

        Promise.all(Array.from(geoIds).map((geoId) => fetchGeoName(geoId)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cost: string | number) => {
    const num = typeof cost === 'number' ? cost : parseMetricValue(cost)
    return `$${num.toFixed(2)}`
  }

  const formatPivotValue = (pivotValue: string) => {
    const match = pivotValue.match(/urn:li:geo:(\d+)/)
    if (match) {
      const geoId = match[1]
      return geoData[geoId] || `Geo: ${geoId}`
    }
    return pivotValue
  }

  const formatDateRange = (dateRange: DateRange) => {
    const start = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`

    if (!dateRange.end) {
      return start
    }

    const end = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
    return start === end ? start : `${start} to ${end}`
  }

  const formatDatePart = (datePart: { year: number; month: number; day: number }) =>
    `${datePart.year}-${String(datePart.month).padStart(2, '0')}-${String(datePart.day).padStart(2, '0')}`

  const renderPivotValues = (pivotValues: string[]) => (
    <div className='space-y-1'>
      {pivotValues.length === 0 ? (
        <div className='text-gray-900 font-medium'>All Regions</div>
      ) : (
        pivotValues.map((pivotValue, index) => {
          const match = pivotValue.match(/urn:li:geo:(\d+)/)
          const geoId = match ? match[1] : ''
          const geoName = formatPivotValue(pivotValue)
          const isLoading = geoId && geoLoading.has(geoId)
          const isGeoId = geoName.startsWith('Geo: ')

          return (
            <div key={`${pivotValue}-${index}`} className='flex items-center space-x-2'>
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
        })
      )}
    </div>
  )

  const buildCurlCommand = (strategy: StrategyKey) => {
    const start = new Date(startDate)
    const accountUrn = encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`)
    let dateRangeParam = `(start:(year:${start.getFullYear()},month:${start.getMonth() + 1},day:${start.getDate()})`
    if (endDate) {
      const end = new Date(endDate)
      dateRangeParam += `,end:(year:${end.getFullYear()},month:${end.getMonth() + 1},day:${end.getDate()})`
    }
    dateRangeParam += ')'
    const fields =
      'dateRange,impressions,likes,shares,costInLocalCurrency,clicks,costInUsd,comments,pivotValues'
    const apiVersion = computeLinkedInApiVersion(new Date())

    let url = 'https://api.linkedin.com/rest/adAnalytics?q=analytics'

    switch (strategy) {
      case 'overall':
        url += '&timeGranularity=ALL'
        break
      case 'geographic':
        url += '&timeGranularity=ALL&pivot=MEMBER_COUNTRY_V2'
        break
      case 'monthly':
        url += '&timeGranularity=MONTHLY&pivot=MEMBER_COUNTRY_V2'
        break
      case 'daily':
        url += '&timeGranularity=DAILY&pivot=MEMBER_COUNTRY_V2'
        break
    }

    if (creativeId) {
      const creativeUrn = encodeURIComponent(
        `urn:li:sponsoredCreative:${creativeId}`
      )
      url += `&creatives=List(${creativeUrn})`
    }
    url += `&accounts=List(${accountUrn})`
    if (campaignId && campaignId !== '0') {
      const campaignUrn = encodeURIComponent(
        `urn:li:sponsoredCampaign:${campaignId}`
      )
      url += `&campaigns=List(${campaignUrn})`
    }
    url += `&dateRange=${dateRangeParam}`
    url += `&fields=${fields}`

    return `curl -X GET '${url}' \\
  -H 'LinkedIn-Version: ${apiVersion}' \\
  -H 'Authorization: Bearer ${activeToken}' \\
  -H 'X-Restli-Protocol-Version: 2.0.0'`
  }

  const handleCopyContent = async (
    content: string,
    copyKey: CopyStrategyKey
  ) => {
    await navigator.clipboard.writeText(content)
    setCopiedStrategy(copyKey)

    window.setTimeout(() => {
      setCopiedStrategy((currentStrategy) =>
        currentStrategy === copyKey ? null : currentStrategy
      )
    }, 2000)
  }

  const handleCopyCurl = async (strategy: StrategyKey) => {
    await handleCopyContent(buildCurlCommand(strategy), strategy)
  }

  const analyticsLabel = `Account: ${accountId} / Creative: ${creativeId}`
  const filenameSuffix = endDate
    ? `account-${accountId}-creative-${creativeId}-${startDate}-to-${endDate}.csv`
    : `account-${accountId}-creative-${creativeId}-${startDate}-onwards.csv`

  const handleDownloadOverall = () => {
    if (!overallData) return
    const csvContent = generateOverallCSV(overallData, geoData)
    downloadCSV(csvContent, `linkedin-analytics-overall-${filenameSuffix}`)
  }

  const handleDownloadGeographic = () => {
    if (!data) return
    const csvContent = generateGeographicCSV(data, geoData)
    downloadCSV(csvContent, `linkedin-analytics-geographic-${filenameSuffix}`)
  }

  const handleDownloadMonthly = () => {
    if (!monthlyData) return
    const csvContent = generateMonthlyCSV(monthlyData, geoData)
    downloadCSV(csvContent, `linkedin-analytics-monthly-${filenameSuffix}`)
  }

  const handleDownloadDaily = () => {
    if (!dailyData) return
    const csvContent = generateDailyCSV(dailyData, geoData)
    downloadCSV(csvContent, `linkedin-analytics-daily-${filenameSuffix}`)
  }

  const overallTotals = overallData
    ? aggregateMetrics(overallData.elements)
    : ZERO_METRICS
  const geographicTotals = data ? aggregateMetrics(data.elements) : ZERO_METRICS
  const monthlyTotals = monthlyData
    ? aggregateMetrics(monthlyData.elements)
    : ZERO_METRICS
  const dailyTotals = dailyData
    ? aggregateMetrics(dailyData.elements)
    : ZERO_METRICS

  const sortedMonthlyElements = monthlyData
    ? sortElements(monthlyData.elements, monthlySort, geoData)
    : []
  const monthlyTotalRows = sortedMonthlyElements.length
  const monthlyTotalPages = Math.max(1, Math.ceil(monthlyTotalRows / PAGE_SIZE))
  const monthlyStartRow = monthlyPage * PAGE_SIZE
  const monthlyEndRow = monthlyStartRow + PAGE_SIZE
  const paginatedMonthlyElements = sortedMonthlyElements.slice(
    monthlyStartRow,
    monthlyEndRow
  )

  const sortedDailyElements = dailyData
    ? sortElements(dailyData.elements, dailySort, geoData)
    : []
  const dailyTotalRows = sortedDailyElements.length
  const dailyTotalPages = Math.max(1, Math.ceil(dailyTotalRows / PAGE_SIZE))
  const dailyStartRow = dailyPage * PAGE_SIZE
  const dailyEndRow = dailyStartRow + PAGE_SIZE
  const paginatedDailyElements = sortedDailyElements.slice(
    dailyStartRow,
    dailyEndRow
  )

  const monthlyReductionPercent = calculateReductionPercent(
    geographicTotals.costInLocalCurrency,
    monthlyTotals.costInLocalCurrency
  )
  const dailyReductionPercent = calculateReductionPercent(
    geographicTotals.costInLocalCurrency,
    dailyTotals.costInLocalCurrency
  )

  const metricSummary = (metrics: AggregatedMetrics) => (
    <div className='space-y-2 text-sm mt-auto'>
      <div className='flex justify-between'>
        <span>Impressions:</span>
        <span className='font-medium'>{metrics.impressions.toLocaleString()}</span>
      </div>
      <div className='flex justify-between'>
        <span>Clicks:</span>
        <span className='font-medium'>{metrics.clicks.toLocaleString()}</span>
      </div>
      <div className='flex justify-between'>
        <span>Cost (Local):</span>
        <span className='font-medium'>
          {formatCurrency(metrics.costInLocalCurrency)}
        </span>
      </div>
      <div className='flex justify-between'>
        <span>Cost (USD):</span>
        <span className='font-medium'>{formatCurrency(metrics.costInUsd)}</span>
      </div>
      <div className='flex justify-between'>
        <span>Likes:</span>
        <span className='font-medium'>{metrics.likes.toLocaleString()}</span>
      </div>
      <div className='flex justify-between'>
        <span>Comments:</span>
        <span className='font-medium'>{metrics.comments.toLocaleString()}</span>
      </div>
      <div className='flex justify-between'>
        <span>Shares:</span>
        <span className='font-medium'>{metrics.shares.toLocaleString()}</span>
      </div>
    </div>
  )

  const differenceSections =
    overallData && data && monthlyData && dailyData
      ? [
          {
            title: 'Impressions',
            values: calculateDifferenceGroup(
              overallTotals.impressions,
              geographicTotals.impressions,
              monthlyTotals.impressions,
              dailyTotals.impressions
            ),
            formatter: (value: number) => value.toLocaleString(),
          },
          {
            title: 'Clicks',
            values: calculateDifferenceGroup(
              overallTotals.clicks,
              geographicTotals.clicks,
              monthlyTotals.clicks,
              dailyTotals.clicks
            ),
            formatter: (value: number) => value.toLocaleString(),
          },
          {
            title: 'Cost (Local)',
            values: calculateDifferenceGroup(
              overallTotals.costInLocalCurrency,
              geographicTotals.costInLocalCurrency,
              monthlyTotals.costInLocalCurrency,
              dailyTotals.costInLocalCurrency
            ),
            formatter: (value: number) => `$${value.toFixed(2)}`,
          },
          {
            title: 'Cost (USD)',
            values: calculateDifferenceGroup(
              overallTotals.costInUsd,
              geographicTotals.costInUsd,
              monthlyTotals.costInUsd,
              dailyTotals.costInUsd
            ),
            formatter: (value: number) => `$${value.toFixed(2)}`,
          },
          {
            title: 'Likes',
            values: calculateDifferenceGroup(
              overallTotals.likes,
              geographicTotals.likes,
              monthlyTotals.likes,
              dailyTotals.likes
            ),
            formatter: (value: number) => value.toLocaleString(),
          },
          {
            title: 'Comments',
            values: calculateDifferenceGroup(
              overallTotals.comments,
              geographicTotals.comments,
              monthlyTotals.comments,
              dailyTotals.comments
            ),
            formatter: (value: number) => value.toLocaleString(),
          },
          {
            title: 'Shares',
            values: calculateDifferenceGroup(
              overallTotals.shares,
              geographicTotals.shares,
              monthlyTotals.shares,
              dailyTotals.shares
            ),
            formatter: (value: number) => value.toLocaleString(),
          },
        ]
      : []

  const allStrategiesMatch =
    differenceSections.length > 0 &&
    differenceSections.every((section) =>
      Object.values(section.values).every((difference) => difference === 0)
    )

  const SortableHeader = ({
    label,
    column,
    sortConfig,
    onSort,
  }: {
    label: string
    column: string
    sortConfig: SortConfig
    onSort: (column: string) => void
  }) => (
    <th
      className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none'
      onClick={() => onSort(column)}
    >
      <div className='flex items-center gap-1'>
        {label}
        <span className='text-gray-400'>
          {sortConfig.column === column
            ? sortConfig.direction === 'asc'
              ? '▲'
              : '▼'
            : '⇅'}
        </span>
      </div>
    </th>
  )

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='bg-white shadow rounded-lg'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <h1 className='text-2xl font-bold text-gray-900'>
              LinkedIn Analytics API Strategy Analysis
            </h1>
            <p className='mt-1 text-sm text-gray-600'>
              Professional comparison of four LinkedIn Marketing API
              approaches: Benchmark validation, Production implementation,
              time-series analysis, and daily granularity trade-offs
            </p>
          </div>

          <div className='p-6'>
            <TokenStatusComponent />

            <div className='mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-semibold text-gray-700'>
                  🔑 Bring Your Own Token
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    customToken
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {customToken ? 'Using Custom Token' : 'Using OAuth Session Token'}
                </span>
              </div>

              <div className='flex gap-2'>
                <input
                  type='password'
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className='flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                  placeholder='Paste your LinkedIn access token here...'
                />
                <button
                  type='button'
                  onClick={handleValidateToken}
                  disabled={tokenValidating || !tokenInput.trim()}
                  className='px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {tokenValidating ? 'Validating...' : 'Validate & Save'}
                </button>
                {customToken && (
                  <button
                    type='button'
                    onClick={handleClearCustomToken}
                    className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
                  >
                    Clear
                  </button>
                )}
              </div>

              {tokenValidationError && (
                <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700'>
                  ❌ {tokenValidationError}
                </div>
              )}

              {tokenValidationResult && (
                <div
                  className={`mt-2 p-2 rounded text-sm ${
                    tokenValidationResult.active &&
                    !tokenValidationResult.computed?.isExpired
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {tokenValidationResult.active &&
                  !tokenValidationResult.computed?.isExpired ? (
                    <div>
                      <div className='font-medium'>✅ Token is valid and saved</div>
                      <div className='mt-1 text-xs space-y-1'>
                        {tokenValidationResult.validatedVia === 'api_call' && (
                          <div className='text-amber-700'>
                            Validated via API call (introspection unavailable — token may belong to a different OAuth app)
                          </div>
                        )}
                        {tokenValidationResult.computed?.expiresInDays != null && (
                          <div>
                            Expires in:{' '}
                            {tokenValidationResult.computed.expiresInDays} days
                          </div>
                        )}
                        {tokenValidationResult.scope && (
                          <div>Scopes: {tokenValidationResult.scope}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className='font-medium'>❌ Token is not valid</div>
                      <div className='mt-1 text-xs'>
                        Status: {tokenValidationResult.status || 'inactive'}
                        {tokenValidationResult.computed?.isExpired && ' (expired)'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!customToken && (
                <p className='mt-2 text-xs text-gray-500'>
                  Paste a LinkedIn OAuth access token to use instead of the
                  session token. The token will be validated before saving.
                </p>
              )}
            </div>

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
                    <span className='text-red-600'> Single-call daily breakdown</span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4 mb-8'>
              <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
                <div>
                  <label
                    htmlFor='accountId'
                    className='block text-sm font-medium text-gray-700'
                  >
                    Account ID
                  </label>
                  <input
                    type='text'
                    id='accountId'
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className='mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='Enter account ID'
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor='campaignId'
                    className='block text-sm font-medium text-gray-700'
                  >
                    Ad ID
                  </label>
                  <input
                    type='text'
                    id='campaignId'
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className='mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='Enter campaign ID (0 to skip)'
                  />
                </div>

                <div>
                  <label
                    htmlFor='creativeId'
                    className='block text-sm font-medium text-gray-700'
                  >
                    Ad Set ID
                  </label>
                  <input
                    type='text'
                    id='creativeId'
                    value={creativeId}
                    onChange={(e) => setCreativeId(e.target.value)}
                    className='mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='Enter creative ID'
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
                    Creative Summary - Overall Totals
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Total performance for {analyticsLabel} (no geographic
                    breakdown)
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
                        <SortableHeader
                          label='Date Range'
                          column='dateRange'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Impressions'
                          column='impressions'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Clicks'
                          column='clicks'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Cost (Local)'
                          column='costLocal'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Cost (USD)'
                          column='costUsd'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Likes'
                          column='likes'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Comments'
                          column='comments'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                        <SortableHeader
                          label='Shares'
                          column='shares'
                          sortConfig={overallSort}
                          onSort={(column) =>
                            handleSort(overallSort, column, setOverallSort)
                          }
                        />
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {sortElements(overallData.elements, overallSort, geoData).map(
                        (element, index) => (
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
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900'>
                            {formatCurrency(element.costInUsd)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.likes.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.comments.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.shares.toLocaleString()}
                          </td>
                        </tr>
                        )
                      )}

                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {overallTotals.impressions.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {overallTotals.clicks.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(overallTotals.costInLocalCurrency)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(overallTotals.costInUsd)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {overallTotals.likes.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {overallTotals.comments.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {overallTotals.shares.toLocaleString()}
                        </td>
                      </tr>
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

                <div className='border-t border-gray-200'>
                  <button
                    onClick={() =>
                      setDebugOpen((prev) => ({
                        ...prev,
                        overall: !prev.overall,
                      }))
                    }
                    className='w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50'
                  >
                    <span className='font-medium'>🔧 Debug Session</span>
                    <svg
                      className={`h-4 w-4 transform transition-transform ${debugOpen.overall ? 'rotate-180' : ''}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>
                  {debugOpen.overall && (
                    <div className='px-4 pb-4 relative'>
                      <button
                        onClick={() => handleCopyCurl('overall')}
                        className='absolute top-2 right-6 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                        title='Copy curl command'
                      >
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                          />
                        </svg>
                      </button>
                      {copiedStrategy === 'overall' && (
                        <div className='absolute top-3 right-16 text-xs font-medium text-green-600'>
                          Copied!
                        </div>
                      )}
                      <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap'>
                        {buildCurlCommand('overall')}
                      </pre>

                      <div className='mt-3'>
                        <button
                          onClick={() =>
                            setDebugOpen((prev) => ({
                              ...prev,
                              overallResponse: !prev.overallResponse,
                            }))
                          }
                          className='flex items-center text-xs text-gray-500 hover:text-gray-700 mb-1'
                        >
                          <span>📋 API Response</span>
                          <svg
                            className={`ml-1 h-3 w-3 transform transition-transform ${debugOpen.overallResponse ? 'rotate-180' : ''}`}
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                        {debugOpen.overallResponse && (
                          <div className='relative'>
                            <button
                              onClick={() =>
                                handleCopyContent(
                                  overallRawResponse,
                                  'overallResponse'
                                )
                              }
                              className='absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                              title='Copy API response'
                            >
                              <svg
                                className='h-4 w-4'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                                />
                              </svg>
                            </button>
                            {copiedStrategy === 'overallResponse' && (
                              <div className='absolute top-3 right-12 text-xs font-medium text-green-600'>
                                Copied!
                              </div>
                            )}
                            <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto'>
                              {overallRawResponse || 'No response data available'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {data && (
              <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Geographic Breakdown - Pivoted by Country
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Analytics data for {analyticsLabel} broken down by
                    geographic regions (timeGranularity=ALL with pivot)
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Single API call with pivot | Total regions:{' '}
                    {data.elements.length} | Total impressions:{' '}
                    {geographicTotals.impressions.toLocaleString()}
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <SortableHeader
                          label='Geographic Region'
                          column='geography'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Date Range'
                          column='dateRange'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Impressions'
                          column='impressions'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Clicks'
                          column='clicks'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Cost (Local)'
                          column='costLocal'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Cost (USD)'
                          column='costUsd'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Likes'
                          column='likes'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Comments'
                          column='comments'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                        <SortableHeader
                          label='Shares'
                          column='shares'
                          sortConfig={geographicSort}
                          onSort={(column) =>
                            handleSort(
                              geographicSort,
                              column,
                              setGeographicSort
                            )
                          }
                        />
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {sortElements(data.elements, geographicSort, geoData).map(
                        (element, index) => (
                        <tr key={index} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                            {renderPivotValues(element.pivotValues)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatDateRange(element.dateRange)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.impressions.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.clicks.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInLocalCurrency)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInUsd)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.likes.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.comments.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.shares.toLocaleString()}
                          </td>
                        </tr>
                        )
                      )}

                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          All Regions Combined
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {geographicTotals.impressions.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {geographicTotals.clicks.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(geographicTotals.costInLocalCurrency)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(geographicTotals.costInUsd)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {geographicTotals.likes.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {geographicTotals.comments.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {geographicTotals.shares.toLocaleString()}
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

                <div className='border-t border-gray-200'>
                  <button
                    onClick={() =>
                      setDebugOpen((prev) => ({
                        ...prev,
                        geographic: !prev.geographic,
                      }))
                    }
                    className='w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50'
                  >
                    <span className='font-medium'>🔧 Debug Session</span>
                    <svg
                      className={`h-4 w-4 transform transition-transform ${debugOpen.geographic ? 'rotate-180' : ''}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>
                  {debugOpen.geographic && (
                    <div className='px-4 pb-4 relative'>
                      <button
                        onClick={() => handleCopyCurl('geographic')}
                        className='absolute top-2 right-6 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                        title='Copy curl command'
                      >
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                          />
                        </svg>
                      </button>
                      {copiedStrategy === 'geographic' && (
                        <div className='absolute top-3 right-16 text-xs font-medium text-green-600'>
                          Copied!
                        </div>
                      )}
                      <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap'>
                        {buildCurlCommand('geographic')}
                      </pre>

                      <div className='mt-3'>
                        <button
                          onClick={() =>
                            setDebugOpen((prev) => ({
                              ...prev,
                              geographicResponse: !prev.geographicResponse,
                            }))
                          }
                          className='flex items-center text-xs text-gray-500 hover:text-gray-700 mb-1'
                        >
                          <span>📋 API Response</span>
                          <svg
                            className={`ml-1 h-3 w-3 transform transition-transform ${debugOpen.geographicResponse ? 'rotate-180' : ''}`}
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                        {debugOpen.geographicResponse && (
                          <div className='relative'>
                            <button
                              onClick={() =>
                                handleCopyContent(
                                  geographicRawResponse,
                                  'geographicResponse'
                                )
                              }
                              className='absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                              title='Copy API response'
                            >
                              <svg
                                className='h-4 w-4'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                                />
                              </svg>
                            </button>
                            {copiedStrategy === 'geographicResponse' && (
                              <div className='absolute top-3 right-12 text-xs font-medium text-green-600'>
                                Copied!
                              </div>
                            )}
                            <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto'>
                              {geographicRawResponse || 'No response data available'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {monthlyData && (
              <div className='mt-8 bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Monthly Breakdown - Single API Call
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Analytics data for {analyticsLabel} broken down by month and
                    geographic regions (timeGranularity=MONTHLY with pivot)
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Single API call with monthly granularity and
                    geographic pivot | Total elements: {monthlyData.elements.length}{' '}
                    | Total impressions: {monthlyTotals.impressions.toLocaleString()}
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <SortableHeader
                          label='Date Range'
                          column='dateRange'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Geographic Region'
                          column='geography'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Impressions'
                          column='impressions'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Clicks'
                          column='clicks'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Cost (Local)'
                          column='costLocal'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Cost (USD)'
                          column='costUsd'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Likes'
                          column='likes'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Comments'
                          column='comments'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Shares'
                          column='shares'
                          sortConfig={monthlySort}
                          onSort={(column) =>
                            handleSort(monthlySort, column, setMonthlySort, () =>
                              setMonthlyPage(0)
                            )
                          }
                        />
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {paginatedMonthlyElements.map((element, index) => (
                        <tr key={index} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatDateRange(element.dateRange)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                            {renderPivotValues(element.pivotValues)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.impressions.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.clicks.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInLocalCurrency)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInUsd)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.likes.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.comments.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.shares.toLocaleString()}
                          </td>
                        </tr>
                      ))}

                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          All Months & Regions Combined
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyTotals.impressions.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyTotals.clicks.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(monthlyTotals.costInLocalCurrency)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(monthlyTotals.costInUsd)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyTotals.likes.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyTotals.comments.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {monthlyTotals.shares.toLocaleString()}
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

                {monthlyTotalRows > 0 && (
                  <div className='flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200'>
                    <div className='text-sm text-gray-700'>
                      Showing {monthlyStartRow + 1} to{' '}
                      {Math.min(monthlyEndRow, monthlyTotalRows)} of{' '}
                      {monthlyTotalRows} rows
                    </div>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setMonthlyPage((page) => page - 1)}
                        disabled={monthlyPage === 0}
                        className='px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Previous
                      </button>
                      <span className='px-3 py-1 text-sm text-gray-600'>
                        Page {monthlyPage + 1} of {monthlyTotalPages}
                      </span>
                      <button
                        onClick={() => setMonthlyPage((page) => page + 1)}
                        disabled={monthlyPage >= monthlyTotalPages - 1}
                        className='px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className='border-t border-gray-200'>
                  <button
                    onClick={() =>
                      setDebugOpen((prev) => ({
                        ...prev,
                        monthly: !prev.monthly,
                      }))
                    }
                    className='w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50'
                  >
                    <span className='font-medium'>🔧 Debug Session</span>
                    <svg
                      className={`h-4 w-4 transform transition-transform ${debugOpen.monthly ? 'rotate-180' : ''}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>
                  {debugOpen.monthly && (
                    <div className='px-4 pb-4 relative'>
                      <button
                        onClick={() => handleCopyCurl('monthly')}
                        className='absolute top-2 right-6 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                        title='Copy curl command'
                      >
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                          />
                        </svg>
                      </button>
                      {copiedStrategy === 'monthly' && (
                        <div className='absolute top-3 right-16 text-xs font-medium text-green-600'>
                          Copied!
                        </div>
                      )}
                      <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap'>
                        {buildCurlCommand('monthly')}
                      </pre>

                      <div className='mt-3'>
                        <button
                          onClick={() =>
                            setDebugOpen((prev) => ({
                              ...prev,
                              monthlyResponse: !prev.monthlyResponse,
                            }))
                          }
                          className='flex items-center text-xs text-gray-500 hover:text-gray-700 mb-1'
                        >
                          <span>📋 API Response</span>
                          <svg
                            className={`ml-1 h-3 w-3 transform transition-transform ${debugOpen.monthlyResponse ? 'rotate-180' : ''}`}
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                        {debugOpen.monthlyResponse && (
                          <div className='relative'>
                            <button
                              onClick={() =>
                                handleCopyContent(
                                  monthlyRawResponse,
                                  'monthlyResponse'
                                )
                              }
                              className='absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                              title='Copy API response'
                            >
                              <svg
                                className='h-4 w-4'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                                />
                              </svg>
                            </button>
                            {copiedStrategy === 'monthlyResponse' && (
                              <div className='absolute top-3 right-12 text-xs font-medium text-green-600'>
                                Copied!
                              </div>
                            )}
                            <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto'>
                              {monthlyRawResponse || 'No response data available'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {dailyData && (
              <div className='mt-8 bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Daily Breakdown - Single API Call
                  </h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    Analytics data for {analyticsLabel} from a single LinkedIn API
                    call using timeGranularity=DAILY with geographic pivoting.
                  </p>
                  <div className='mt-2 text-sm text-blue-600'>
                    Strategy: Single API call | {dailyData.elements.length}{' '}
                    elements
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <SortableHeader
                          label='Start Date'
                          column='startDate'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='End Date'
                          column='endDate'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Geographic Region'
                          column='geography'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Impressions'
                          column='impressions'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Clicks'
                          column='clicks'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Cost (Local)'
                          column='costLocal'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Cost (USD)'
                          column='costUsd'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Likes'
                          column='likes'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Comments'
                          column='comments'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                        <SortableHeader
                          label='Shares'
                          column='shares'
                          sortConfig={dailySort}
                          onSort={(column) =>
                            handleSort(dailySort, column, setDailySort, () =>
                              setDailyPage(0)
                            )
                          }
                        />
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {paginatedDailyElements.map((element, index) => (
                        <tr
                          key={`${formatDatePart(element.dateRange.start)}-${element.pivotValues.join('-') || 'all'}-${index}`}
                          className='hover:bg-gray-50'
                        >
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                            {formatDatePart(element.dateRange.start)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.dateRange.end ? formatDatePart(element.dateRange.end) : '—'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                            {renderPivotValues(element.pivotValues)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.impressions.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.clicks.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInLocalCurrency)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {formatCurrency(element.costInUsd)}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.likes.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.comments.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {element.shares.toLocaleString()}
                          </td>
                        </tr>
                      ))}

                      <tr className='bg-blue-50 font-semibold border-t-2 border-blue-200'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          TOTALS
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          All Regions Combined
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyTotals.impressions.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyTotals.clicks.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(dailyTotals.costInLocalCurrency)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {formatCurrency(dailyTotals.costInUsd)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyTotals.likes.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyTotals.comments.toLocaleString()}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900'>
                          {dailyTotals.shares.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {dailyData.elements.length === 0 && (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>
                      No daily analytics data found for the specified date
                      range.
                    </p>
                  </div>
                )}

                {dailyTotalRows > 0 && (
                  <div className='flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200'>
                    <div className='text-sm text-gray-700'>
                      Showing {dailyStartRow + 1} to{' '}
                      {Math.min(dailyEndRow, dailyTotalRows)} of {dailyTotalRows}{' '}
                      rows
                    </div>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setDailyPage((page) => page - 1)}
                        disabled={dailyPage === 0}
                        className='px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Previous
                      </button>
                      <span className='px-3 py-1 text-sm text-gray-600'>
                        Page {dailyPage + 1} of {dailyTotalPages}
                      </span>
                      <button
                        onClick={() => setDailyPage((page) => page + 1)}
                        disabled={dailyPage >= dailyTotalPages - 1}
                        className='px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className='px-4 py-3 bg-gray-50 border-t border-gray-200'>
                  <p className='text-xs text-gray-600'>
                    <strong>Note:</strong> All daily data points are displayed in
                    this table for transparency, excluding dates with no
                    returned elements.
                  </p>
                </div>

                <div className='border-t border-gray-200'>
                  <button
                    onClick={() =>
                      setDebugOpen((prev) => ({
                        ...prev,
                        daily: !prev.daily,
                      }))
                    }
                    className='w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50'
                  >
                    <span className='font-medium'>🔧 Debug Session</span>
                    <svg
                      className={`h-4 w-4 transform transition-transform ${debugOpen.daily ? 'rotate-180' : ''}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>
                  {debugOpen.daily && (
                    <div className='px-4 pb-4 relative'>
                      <button
                        onClick={() => handleCopyCurl('daily')}
                        className='absolute top-2 right-6 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                        title='Copy curl command'
                      >
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                          />
                        </svg>
                      </button>
                      {copiedStrategy === 'daily' && (
                        <div className='absolute top-3 right-16 text-xs font-medium text-green-600'>
                          Copied!
                        </div>
                      )}
                      <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap'>
                        {buildCurlCommand('daily')}
                      </pre>

                      <div className='mt-3'>
                        <button
                          onClick={() =>
                            setDebugOpen((prev) => ({
                              ...prev,
                              dailyResponse: !prev.dailyResponse,
                            }))
                          }
                          className='flex items-center text-xs text-gray-500 hover:text-gray-700 mb-1'
                        >
                          <span>📋 API Response</span>
                          <svg
                            className={`ml-1 h-3 w-3 transform transition-transform ${debugOpen.dailyResponse ? 'rotate-180' : ''}`}
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                        {debugOpen.dailyResponse && (
                          <div className='relative'>
                            <button
                              onClick={() =>
                                handleCopyContent(
                                  dailyRawResponse,
                                  'dailyResponse'
                                )
                              }
                              className='absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded'
                              title='Copy API response'
                            >
                              <svg
                                className='h-4 w-4'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16v2a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-2M8 16h8a2 2 0 002-2v-2'
                                />
                              </svg>
                            </button>
                            {copiedStrategy === 'dailyResponse' && (
                              <div className='absolute top-3 right-12 text-xs font-medium text-green-600'>
                                Copied!
                              </div>
                            )}
                            <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto'>
                              {dailyRawResponse || 'No response data available'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                        LinkedIn&apos;s Campaign Manager interface, making it the
                        gold standard for data reconciliation.
                      </p>
                      {metricSummary(overallTotals)}

                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadOverall}
                          className='w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          📊 Download CSV
                        </button>
                      </div>
                    </div>

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
                      {metricSummary(geographicTotals)}

                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadGeographic}
                          className='w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          🌍 Download CSV
                        </button>
                      </div>
                    </div>

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
                        {getReductionSeverity(monthlyReductionPercent)} due to
                        LinkedIn&apos;s demographic filtering applied at the monthly
                        level. Cost metrics show ~{monthlyReductionPercent}%
                        reduction compared to Geographic Breakdown
                        {monthlyReductionPercent >= 20
                          ? ', indicating substantial underreporting that may impact budget reconciliation and financial accuracy'
                          : monthlyReductionPercent >= 5
                            ? ', which may affect budget reconciliation accuracy'
                            : ', representing acceptable variance for most use cases'}
                        .
                      </p>
                      {metricSummary(monthlyTotals)}

                      <div className='mt-4 pt-3 border-t border-gray-200'>
                        <button
                          onClick={handleDownloadMonthly}
                          className='w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
                        >
                          📅 Download CSV
                        </button>
                      </div>
                    </div>

                    <div
                      className='bg-white p-4 rounded-lg shadow border-l-4 border-red-500 flex flex-col'
                      style={{ minHeight: '400px' }}
                    >
                      <div className='mb-3'>
                        <h4 className='font-semibold text-gray-900 text-sm leading-tight mb-2'>
                          Daily Breakdown
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
                        <strong>Use case:</strong> This single-call daily strategy
                        provides daily time-series breakdowns without duplicate
                        client-side aggregation logic, while still reflecting
                        LinkedIn&apos;s normal demographic filtering behavior for
                        pivoted results.
                      </p>
                      {metricSummary(dailyTotals)}

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

                  <div className='mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200'>
                    <h4 className='font-semibold text-yellow-800 mb-2'>
                      🔍 Professional API Strategy Analysis
                    </h4>
                    <div className='text-sm text-yellow-700'>
                      {allStrategiesMatch ? (
                        <p>
                          ✅ Perfect match! All four API strategies return
                          identical totals across the current metric set.
                        </p>
                      ) : (
                        <div className='space-y-3'>
                          <p className='font-medium'>
                            Metric differences between API strategies:
                          </p>

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {differenceSections.map((section) => (
                              <div key={section.title}>
                                <p className='font-semibold text-yellow-800 mb-1'>
                                  {section.title}:
                                </p>
                                <ul className='ml-4 space-y-1 text-xs'>
                                  {DIFFERENCE_LABELS.map(([key, label]) => (
                                    <li key={key}>
                                      • {label}:{' '}
                                      {section.formatter(section.values[key])}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <p className='mt-3 text-xs'>
                            ⚠️ These differences are primarily due to
                            LinkedIn&apos;s Professional Demographic restrictions:
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
                      )}
                    </div>
                  </div>

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
                          <strong>Overall Summary</strong> should be your primary
                          reference for data validation. Use this approach to
                          verify Campaign Manager report alignment and establish
                          baseline metrics for business reporting.
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
                          {getReductionSeverity(monthlyReductionPercent)} with
                          ~{monthlyReductionPercent}% cost {getMonthlyReductionNarrative(
                            monthlyReductionPercent
                          )}
                          .
                        </p>
                      </div>
                      <div className='bg-white p-3 rounded-lg border-l-4 border-red-500'>
                        <h5 className='font-semibold text-red-800 mb-2'>
                          ❌ High Risk Strategy
                        </h5>
                        <p className='text-red-700 text-xs leading-relaxed'>
                          <strong>Daily Breakdown</strong> still shows
                          ~{dailyReductionPercent}% cost underreporting versus
                          the geographic baseline, but now reflects a single
                          LinkedIn daily response instead of compounded
                          client-side aggregation from multiple calls.
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
                         caution for time-series (expect ~{monthlyReductionPercent}%
                         cost underreporting), and use Daily only when daily
                         granularity is required, understanding it may still
                         underreport by ~{dailyReductionPercent}% versus the
                         geographic baseline.
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
