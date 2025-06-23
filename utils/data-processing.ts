/**
 * Data processing utilities for LinkedIn Analytics Dashboard
 */

/**
 * Format currency with proper formatting
 * @param value - The value to format as currency
 * @returns Formatted currency string
 */
export function formatCurrency(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '$0.00'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numValue)
}

/**
 * Calculate CPM (Cost Per Mille)
 * @param cost - The total cost
 * @param impressions - The total impressions
 * @returns Formatted CPM string
 */
export function calculateCPM(
  cost: string | number,
  impressions: number
): string {
  const costValue = typeof cost === 'string' ? parseFloat(cost) : cost
  if (isNaN(costValue) || impressions === 0) return '$0.00'

  const cpm = (costValue / impressions) * 1000
  return formatCurrency(cpm)
}

/**
 * Calculate CTR (Click-Through Rate)
 * @param clicks - The total clicks
 * @param impressions - The total impressions
 * @returns CTR as percentage string
 */
export function calculateCTR(clicks: number, impressions: number): string {
  if (impressions === 0) return '0.00%'

  const ctr = (clicks / impressions) * 100
  return `${ctr.toFixed(2)}%`
}

/**
 * Format date range for display
 * @param dateRange - The date range object from LinkedIn API
 * @returns Formatted date range string
 */
export function formatDateRange(dateRange: {
  start: { year: number; month: number; day: number }
  end: { year: number; month: number; day: number }
}): string {
  const startDate = new Date(
    dateRange.start.year,
    dateRange.start.month - 1,
    dateRange.start.day
  )
  const endDate = new Date(
    dateRange.end.year,
    dateRange.end.month - 1,
    dateRange.end.day
  )

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  if (startDate.getTime() === endDate.getTime()) {
    return startDate.toLocaleDateString('en-US', options)
  }

  return `${startDate.toLocaleDateString(
    'en-US',
    options
  )} - ${endDate.toLocaleDateString('en-US', options)}`
}

/**
 * Aggregate analytics elements by a key function
 * @param elements - Array of analytics elements
 * @param keyFn - Function to generate key for grouping
 * @returns Aggregated elements
 */
export function aggregateAnalyticsElements<
  T extends {
    impressions: number
    clicks: number
    costInLocalCurrency: string
    likes: number
    comments: number
    shares: number
    follows: number
    companyPageClicks: number
    actionClicks: number
    viralImpressions: number
    oneClickLeads: number
    landingPageClicks: number
    adUnitClicks: number
    oneClickLeadFormOpens: number
    viralFollows: number
    sends: number
    viralClicks: number
  }
>(elements: T[], keyFn: (element: T) => string): T[] {
  const aggregated = new Map<string, T>()

  elements.forEach((element) => {
    const key = keyFn(element)

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!

      // Aggregate numeric fields
      existing.impressions += element.impressions
      existing.clicks += element.clicks
      existing.likes += element.likes
      existing.comments += element.comments
      existing.shares += element.shares
      existing.follows += element.follows
      existing.companyPageClicks += element.companyPageClicks
      existing.actionClicks += element.actionClicks
      existing.viralImpressions += element.viralImpressions
      existing.oneClickLeads += element.oneClickLeads
      existing.landingPageClicks += element.landingPageClicks
      existing.adUnitClicks += element.adUnitClicks
      existing.oneClickLeadFormOpens += element.oneClickLeadFormOpens
      existing.viralFollows += element.viralFollows
      existing.sends += element.sends
      existing.viralClicks += element.viralClicks

      // Sum costs
      const existingCost = parseFloat(existing.costInLocalCurrency) || 0
      const elementCost = parseFloat(element.costInLocalCurrency) || 0
      existing.costInLocalCurrency = (existingCost + elementCost).toString()
    } else {
      aggregated.set(key, { ...element })
    }
  })

  return Array.from(aggregated.values())
}

/**
 * Validate analytics data for completeness
 * @param elements - Array of analytics elements
 * @returns Validation result
 */
export function validateAnalyticsData(elements: any[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(elements)) {
    errors.push('Elements must be an array')
    return { isValid: false, errors, warnings }
  }

  if (elements.length === 0) {
    warnings.push('No analytics data found')
  }

  elements.forEach((element, index) => {
    if (typeof element.impressions !== 'number' || element.impressions < 0) {
      errors.push(`Element ${index}: Invalid impressions value`)
    }

    if (typeof element.clicks !== 'number' || element.clicks < 0) {
      errors.push(`Element ${index}: Invalid clicks value`)
    }

    if (element.clicks > element.impressions) {
      warnings.push(`Element ${index}: Clicks exceed impressions`)
    }

    const cost = parseFloat(element.costInLocalCurrency)
    if (isNaN(cost) || cost < 0) {
      errors.push(`Element ${index}: Invalid cost value`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Calculate total metrics from analytics elements
 * @param elements - Array of analytics elements
 * @returns Total metrics
 */
export function calculateTotalMetrics(elements: any[]): {
  totalImpressions: number
  totalClicks: number
  totalCost: number
  totalEngagement: number
  averageCTR: number
  averageCPM: number
} {
  if (!elements || elements.length === 0) {
    return {
      totalImpressions: 0,
      totalClicks: 0,
      totalCost: 0,
      totalEngagement: 0,
      averageCTR: 0,
      averageCPM: 0,
    }
  }

  const totalImpressions = elements.reduce(
    (sum, el) => sum + (el.impressions || 0),
    0
  )
  const totalClicks = elements.reduce((sum, el) => sum + (el.clicks || 0), 0)
  const totalCost = elements.reduce(
    (sum, el) => sum + (parseFloat(el.costInLocalCurrency) || 0),
    0
  )
  const totalEngagement = elements.reduce(
    (sum, el) =>
      sum +
      (el.likes || 0) +
      (el.comments || 0) +
      (el.shares || 0) +
      (el.follows || 0),
    0
  )

  const averageCTR =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const averageCPM =
    totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0

  return {
    totalImpressions,
    totalClicks,
    totalCost,
    totalEngagement,
    averageCTR,
    averageCPM,
  }
}
