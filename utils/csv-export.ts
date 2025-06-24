interface AnalyticsElement {
  actionClicks: number
  viralImpressions: number
  comments: number
  oneClickLeads: number
  dateRange: {
    start: { year: number; month: number; day: number }
    end: { year: number; month: number; day: number }
  }
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

interface DailyDataElement {
  date: string
  elements: AnalyticsElement[]
}

export interface CSVExportData {
  overall: { elements: AnalyticsElement[] }
  geographic: { elements: AnalyticsElement[] }
  monthly: { elements: AnalyticsElement[] }
  daily: { aggregated: AnalyticsElement[]; dailyData: DailyDataElement[] }
}

export function formatDateRange(dateRange: AnalyticsElement['dateRange']): string {
  const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
  const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
  return `${startDate} to ${endDate}`
}

export function formatPivotValue(pivotValue: string, geoData: Record<string, string> = {}): string {
  const match = pivotValue.match(/urn:li:geo:(\d+)/)
  if (match) {
    const geoId = match[1]
    return geoData[geoId] || `Geo: ${geoId}`
  }
  return pivotValue
}

export function generateOverallCSV(data: CSVExportData['overall'], geoData: Record<string, string> = {}): string {
  const headers = [
    'Date Range',
    'Geography',
    'Impressions',
    'Clicks',
    'Cost (USD)',
    'Company Page Clicks',
    'Likes',
    'Comments',
    'Shares',
    'Follows',
    'Action Clicks',
    'Viral Impressions',
    'One Click Leads',
    'Landing Page Clicks',
    'Ad Unit Clicks',
    'One Click Lead Form Opens',
    'Viral Follows',
    'Sends',
    'Viral Clicks'
  ]

  const rows = data.elements.map(element => [
    formatDateRange(element.dateRange),
    element.pivotValues.length > 0 ? element.pivotValues.map(pv => formatPivotValue(pv, geoData)).join('; ') : 'All Regions',
    element.impressions,
    element.clicks,
    element.costInLocalCurrency,
    element.companyPageClicks,
    element.likes,
    element.comments,
    element.shares,
    element.follows,
    element.actionClicks,
    element.viralImpressions,
    element.oneClickLeads,
    element.landingPageClicks,
    element.adUnitClicks,
    element.oneClickLeadFormOpens,
    element.viralFollows,
    element.sends,
    element.viralClicks
  ])

  // Add totals row
  const totals = [
    'TOTALS',
    'All Regions Combined',
    data.elements.reduce((sum, el) => sum + el.impressions, 0),
    data.elements.reduce((sum, el) => sum + el.clicks, 0),
    data.elements.reduce((sum, el) => sum + parseFloat(el.costInLocalCurrency), 0).toFixed(2),
    data.elements.reduce((sum, el) => sum + el.companyPageClicks, 0),
    data.elements.reduce((sum, el) => sum + el.likes, 0),
    data.elements.reduce((sum, el) => sum + el.comments, 0),
    data.elements.reduce((sum, el) => sum + el.shares, 0),
    data.elements.reduce((sum, el) => sum + el.follows, 0),
    data.elements.reduce((sum, el) => sum + el.actionClicks, 0),
    data.elements.reduce((sum, el) => sum + el.viralImpressions, 0),
    data.elements.reduce((sum, el) => sum + el.oneClickLeads, 0),
    data.elements.reduce((sum, el) => sum + el.landingPageClicks, 0),
    data.elements.reduce((sum, el) => sum + el.adUnitClicks, 0),
    data.elements.reduce((sum, el) => sum + el.oneClickLeadFormOpens, 0),
    data.elements.reduce((sum, el) => sum + el.viralFollows, 0),
    data.elements.reduce((sum, el) => sum + el.sends, 0),
    data.elements.reduce((sum, el) => sum + el.viralClicks, 0)
  ]

  const csvContent = [headers, ...rows, totals]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  return csvContent
}

export function generateGeographicCSV(data: CSVExportData['geographic'], geoData: Record<string, string> = {}): string {
  return generateOverallCSV(data, geoData) // Same structure as overall
}

export function generateMonthlyCSV(data: CSVExportData['monthly'], geoData: Record<string, string> = {}): string {
  return generateOverallCSV(data, geoData) // Same structure as overall
}

export function generateDailyCSV(data: CSVExportData['daily'], geoData: Record<string, string> = {}): string {
  const headers = [
    'Date',
    'Date Range',
    'Geography',
    'Impressions',
    'Clicks',
    'Cost (USD)',
    'Company Page Clicks',
    'Likes',
    'Comments',
    'Shares',
    'Follows',
    'Action Clicks',
    'Viral Impressions',
    'One Click Leads',
    'Landing Page Clicks',
    'Ad Unit Clicks',
    'One Click Lead Form Opens',
    'Viral Follows',
    'Sends',
    'Viral Clicks'
  ]

  const rows: (string | number)[][] = []

  // Add daily breakdown data
  data.dailyData.forEach(day => {
    day.elements.forEach(element => {
      rows.push([
        day.date,
        formatDateRange(element.dateRange),
        element.pivotValues.length > 0 ? element.pivotValues.map(pv => formatPivotValue(pv, geoData)).join('; ') : 'All Regions',
        element.impressions,
        element.clicks,
        element.costInLocalCurrency,
        element.companyPageClicks,
        element.likes,
        element.comments,
        element.shares,
        element.follows,
        element.actionClicks,
        element.viralImpressions,
        element.oneClickLeads,
        element.landingPageClicks,
        element.adUnitClicks,
        element.oneClickLeadFormOpens,
        element.viralFollows,
        element.sends,
        element.viralClicks
      ])
    })
  })

  // Add aggregated totals row
  const totals = [
    'AGGREGATED TOTALS',
    'All Days Combined',
    'All Regions Combined',
    data.aggregated.reduce((sum, el) => sum + el.impressions, 0),
    data.aggregated.reduce((sum, el) => sum + el.clicks, 0),
    data.aggregated.reduce((sum, el) => sum + parseFloat(el.costInLocalCurrency), 0).toFixed(2),
    data.aggregated.reduce((sum, el) => sum + el.companyPageClicks, 0),
    data.aggregated.reduce((sum, el) => sum + el.likes, 0),
    data.aggregated.reduce((sum, el) => sum + el.comments, 0),
    data.aggregated.reduce((sum, el) => sum + el.shares, 0),
    data.aggregated.reduce((sum, el) => sum + el.follows, 0),
    data.aggregated.reduce((sum, el) => sum + el.actionClicks, 0),
    data.aggregated.reduce((sum, el) => sum + el.viralImpressions, 0),
    data.aggregated.reduce((sum, el) => sum + el.oneClickLeads, 0),
    data.aggregated.reduce((sum, el) => sum + el.landingPageClicks, 0),
    data.aggregated.reduce((sum, el) => sum + el.adUnitClicks, 0),
    data.aggregated.reduce((sum, el) => sum + el.oneClickLeadFormOpens, 0),
    data.aggregated.reduce((sum, el) => sum + el.viralFollows, 0),
    data.aggregated.reduce((sum, el) => sum + el.sends, 0),
    data.aggregated.reduce((sum, el) => sum + el.viralClicks, 0)
  ]

  const csvContent = [headers, ...rows, totals]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  return csvContent
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
