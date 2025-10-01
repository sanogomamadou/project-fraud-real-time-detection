// Mock data generators for fraud detection dashboard
// Client-side data generation for reliable preview

const merchants = [
  "Amazon",
  "Walmart",
  "Target",
  "Best Buy",
  "Apple Store",
  "Starbucks",
  "McDonald's",
  "Shell Gas",
  "Uber",
  "Netflix",
  "Spotify",
  "Steam",
  "PlayStation Store",
  "Nike",
  "Adidas",
]

const locations = [
  "New York, USA",
  "Los Angeles, USA",
  "London, UK",
  "Paris, France",
  "Tokyo, Japan",
  "Singapore",
  "Sydney, Australia",
  "Toronto, Canada",
  "Berlin, Germany",
  "Dubai, UAE",
  "Hong Kong",
  "Mumbai, India",
  "São Paulo, Brazil",
  "Mexico City, Mexico",
  "Seoul, South Korea",
]

const cardTypes = ["Visa", "Mastercard", "Amex", "Discover"]

const alertTypes = [
  "Impossible Travel",
  "High Amount",
  "Unusual Pattern",
  "Multiple Attempts",
  "Suspicious Location",
  "Card Not Present",
  "Velocity Check Failed",
  "Blacklisted Merchant",
]

const severityLevels = ["high", "medium", "low"] as const

export interface Transaction {
  transaction_id: string
  amount: number
  merchant: string
  location: string
  card_type: string
  timestamp: string
  is_fraud: boolean
}

export interface FraudAlert {
  alert_id: string
  transaction_id: string
  alert_type: string
  severity: "low" | "medium" | "high"
  amount: number
  merchant: string
  location: string
  timestamp: string
  risk_score: number
  status: "pending" | "resolved"
}

export function generateTransaction(): Transaction {
  const now = Date.now()
  const randomOffset = Math.floor(Math.random() * 3600000) // Random time within last hour

  return {
    transaction_id: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    amount: Math.floor(Math.random() * 5000) + 10,
    merchant: merchants[Math.floor(Math.random() * merchants.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    card_type: cardTypes[Math.floor(Math.random() * cardTypes.length)],
    timestamp: new Date(now - randomOffset).toISOString(),
    is_fraud: Math.random() < 0.05, // 5% fraud rate
  }
}

export function generateAlert(): FraudAlert {
  const now = Date.now()
  const randomOffset = Math.floor(Math.random() * 7200000) // Random time within last 2 hours
  const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)]

  return {
    alert_id: `ALT${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    transaction_id: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    alert_type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
    severity,
    amount: Math.floor(Math.random() * 10000) + 100,
    merchant: merchants[Math.floor(Math.random() * merchants.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    timestamp: new Date(now - randomOffset).toISOString(),
    risk_score: Math.floor(Math.random() * 40) + 60, // 60-100 risk score
    status: Math.random() < 0.3 ? "resolved" : "pending",
  }
}

export function generateTransactions(count: number): Transaction[] {
  const transactions = Array.from({ length: count }, () => generateTransaction())
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function generateAlerts(count: number, activeOnly = false): FraudAlert[] {
  let alerts = Array.from({ length: count }, () => generateAlert())

  if (activeOnly) {
    alerts = alerts.filter((alert) => alert.status === "pending")
  }

  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
