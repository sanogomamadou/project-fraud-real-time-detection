import { NextResponse } from "next/server"

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

const severityLevels = ["high", "medium", "low"] as const

function generateAlert() {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "30")
  const activeOnly = searchParams.get("active_only") === "true"

  // Generate alerts
  let alerts = Array.from({ length: limit }, () => generateAlert())

  // Filter for active only if requested
  if (activeOnly) {
    alerts = alerts.filter((alert) => alert.status === "pending")
  }

  // Sort by timestamp (newest first)
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json(alerts)
}
