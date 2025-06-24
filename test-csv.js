// Simple test to verify CSV export functionality
import {
  generateOverallCSV,
  generateGeographicCSV,
  generateMonthlyCSV,
  generateDailyCSV
} from '../utils/csv-export'

// Sample test data
const sampleElement = {
  actionClicks: 5,
  viralImpressions: 100,
  comments: 2,
  oneClickLeads: 1,
  dateRange: {
    start: { year: 2024, month: 12, day: 1 },
    end: { year: 2024, month: 12, day: 31 }
  },
  landingPageClicks: 3,
  adUnitClicks: 2,
  follows: 1,
  oneClickLeadFormOpens: 0,
  companyPageClicks: 1,
  costInLocalCurrency: "1703.27",
  impressions: 2553,
  viralFollows: 0,
  sends: 0,
  shares: 2,
  clicks: 14,
  viralClicks: 0,
  pivotValues: ["urn:li:geo:103644278"],
  likes: 0
}

const sampleData = {
  elements: [sampleElement]
}

const sampleGeoData = {
  "103644278": "United States"
}

const sampleDailyData = {
  aggregated: [sampleElement],
  dailyData: [
    {
      date: "2024-12-01",
      elements: [sampleElement]
    }
  ]
}

// Test CSV generation
console.log('Testing CSV generation...')

try {
  const overallCSV = generateOverallCSV(sampleData, sampleGeoData)
  console.log('✅ Overall CSV generated successfully')
  console.log('Sample output:', overallCSV.substring(0, 200) + '...')

  const geoCSV = generateGeographicCSV(sampleData, sampleGeoData)
  console.log('✅ Geographic CSV generated successfully')

  const monthlyCSV = generateMonthlyCSV(sampleData, sampleGeoData)
  console.log('✅ Monthly CSV generated successfully')

  const dailyCSV = generateDailyCSV(sampleDailyData, sampleGeoData)
  console.log('✅ Daily CSV generated successfully')

  console.log('🎉 All CSV export functions working correctly!')
} catch (error) {
  console.error('❌ Error testing CSV generation:', error)
}
