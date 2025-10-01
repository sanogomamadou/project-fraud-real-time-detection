import { NextResponse } from "next/server"

// Mock data generators
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

function generateTransaction() {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  // Generate transactions
  const transactions = Array.from({ length: limit }, () => generateTransaction())

  // Sort by timestamp (newest first)
  transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json(transactions)
}
