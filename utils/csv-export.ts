interface AnalyticsElement {
  dateRange: {
    start: { year: number; month: number; day: number }
    end?: { year: number; month: number; day: number }
  }
  impressions: number
  likes: number
  shares: number
  costInLocalCurrency: string
  clicks: number
  costInUsd: string
  comments: number
  pivotValues: string[]
}

export interface CSVExportData {
  overall: { elements: AnalyticsElement[] }
  geographic: { elements: AnalyticsElement[] }
  monthly: { elements: AnalyticsElement[] }
  daily: { elements: AnalyticsElement[] }
}

function sumMetric(
  elements: AnalyticsElement[],
  selector: (element: AnalyticsElement) => number
): number {
  return elements.reduce((sum, element) => sum + selector(element), 0)
}

export function formatDateRange(dateRange: AnalyticsElement['dateRange']): string {
  const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`

  if (!dateRange.end) {
    return startDate
  }

  const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
  return startDate === endDate ? startDate : `${startDate} to ${endDate}`
}

export function formatPivotValue(
  pivotValue: string,
  geoData: Record<string, string> = {}
): string {
  const match = pivotValue.match(/urn:li:geo:(\d+)/)
  if (match) {
    const geoId = match[1]
    return geoData[geoId] || `Geo: ${geoId}`
  }
  return pivotValue
}

export function generateOverallCSV(
  data: CSVExportData['overall'],
  geoData: Record<string, string> = {}
): string {
  const headers = [
    'Date Range',
    'Geography',
    'Impressions',
    'Clicks',
    'Cost (Local)',
    'Cost (USD)',
    'Likes',
    'Comments',
    'Shares',
  ]

  const rows = data.elements.map((element) => [
    formatDateRange(element.dateRange),
    element.pivotValues.length > 0
      ? element.pivotValues.map((pv) => formatPivotValue(pv, geoData)).join('; ')
      : 'All Regions',
    element.impressions,
    element.clicks,
    element.costInLocalCurrency,
    element.costInUsd,
    element.likes,
    element.comments,
    element.shares,
  ])

  const totals = [
    'TOTALS',
    'All Regions Combined',
    sumMetric(data.elements, (element) => element.impressions),
    sumMetric(data.elements, (element) => element.clicks),
    sumMetric(data.elements, (element) => parseFloat(element.costInLocalCurrency)).toFixed(2),
    sumMetric(data.elements, (element) => parseFloat(element.costInUsd)).toFixed(2),
    sumMetric(data.elements, (element) => element.likes),
    sumMetric(data.elements, (element) => element.comments),
    sumMetric(data.elements, (element) => element.shares),
  ]

  return [headers, ...rows, totals]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')
}

export function generateGeographicCSV(
  data: CSVExportData['geographic'],
  geoData: Record<string, string> = {}
): string {
  return generateOverallCSV(data, geoData)
}

export function generateMonthlyCSV(
  data: CSVExportData['monthly'],
  geoData: Record<string, string> = {}
): string {
  return generateOverallCSV(data, geoData)
}

function formatDatePart(datePart: { year: number; month: number; day: number }): string {
  return `${datePart.year}-${String(datePart.month).padStart(2, '0')}-${String(datePart.day).padStart(2, '0')}`
}

export function generateDailyCSV(
  data: CSVExportData['daily'],
  geoData: Record<string, string> = {}
): string {
  const headers = [
    'Start Date',
    'End Date',
    'Geography',
    'Impressions',
    'Clicks',
    'Cost (Local)',
    'Cost (USD)',
    'Likes',
    'Comments',
    'Shares',
  ]

  const rows: (string | number)[][] = data.elements.map((element) => [
    formatDatePart(element.dateRange.start),
    element.dateRange.end ? formatDatePart(element.dateRange.end) : '—',
    element.pivotValues.length > 0
      ? element.pivotValues.map((pv) => formatPivotValue(pv, geoData)).join('; ')
      : 'All Regions',
    element.impressions,
    element.clicks,
    element.costInLocalCurrency,
    element.costInUsd,
    element.likes,
    element.comments,
    element.shares,
  ])

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')
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
