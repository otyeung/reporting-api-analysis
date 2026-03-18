/**
 * LinkedIn API version (YYYYMM). Uses previous month, but skips December
 * (falls back to November) since LinkedIn doesn't ship a Dec API version.
 * Examples: Mar 2026→"202602", Jan 2026→Dec→skip→"202511"
 * LINKEDIN_API_VERSION env var overrides when set.
 */
export function getLinkedInApiVersion(): string {
  if (process.env.LINKEDIN_API_VERSION) {
    return process.env.LINKEDIN_API_VERSION
  }

  return computeLinkedInApiVersion(new Date())
}

export function computeLinkedInApiVersion(now: Date): string {
  let year = now.getFullYear()
  let month = now.getMonth() + 1

  month -= 1
  if (month === 0) {
    month = 12
    year -= 1
  }

  if (month === 12) {
    month = 11
  }

  return `${year}${String(month).padStart(2, '0')}`
}
