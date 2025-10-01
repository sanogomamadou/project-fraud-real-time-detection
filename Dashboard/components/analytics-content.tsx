"use client"

import { useEffect, useState } from "react"
import { TrendingUp, AlertTriangle, MapPin, DollarSign } from "./icons"
import { Card } from "@/components/ui/card"
import { BarChart, PieChart,MetricCard , ProgressBar} from "./custom-charts"
import { getTransactionFeed, getFraudAlerts, type Transaction, type FraudAlert } from "@/lib/api"

interface ChartData {
  label: string
  value: number
}

export function AnalyticsContent() {
  const [hourlyData, setHourlyData] = useState<ChartData[]>([])
  const [topMerchants, setTopMerchants] = useState<Array<{ name: string; riskScore: number; incidents: number }>>([])
  const [amountDistribution, setAmountDistribution] = useState<ChartData[]>([])
  const [geographicData, setGeographicData] = useState<ChartData[]>([])
  const [stats, setStats] = useState({
    totalFrauds: 0,
    amountBlocked: 0,
    detectionRate: 0,
    countriesAffected: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // CORRECTION: Remplacer les mocks par les vraies données
        const alerts = await getFraudAlerts(500, false)
        const transactions = await getTransactionFeed(500)

        if (!alerts.length || !transactions.length) return

        // CORRECTION: Hourly data avec le bon timestamp
        const hourlyMap = new Map<string, number>()
        const last24Hours = Date.now() - 24 * 60 * 60 * 1000

        alerts
          .filter((alert) => new Date(alert.timestamp).getTime() > last24Hours)
          .forEach((alert) => {
            const hour = new Date(alert.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit" })
            hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
          })

        setHourlyData(
          Array.from(hourlyMap.entries())
            .map(([hour, count]) => ({ label: hour, value: count }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(-24),
        )

        // CORRECTION: Merchant risk - Utiliser les transactions au lieu des alertes
        // (car tes alertes n'ont pas de merchant)
        const merchantMap = new Map<string, { incidents: number; totalAmount: number }>()
        
        // Utiliser les transactions frauduleuses pour les merchants à risque
        const fraudTransactions = transactions.filter(tx => tx.is_fraud || tx.is_suspicious)
        fraudTransactions.forEach((tx) => {
          const current = merchantMap.get(tx.merchant) || { incidents: 0, totalAmount: 0 }
          merchantMap.set(tx.merchant, {
            incidents: current.incidents + 1,
            totalAmount: current.totalAmount + tx.amount,
          })
        })

        const merchantList = Array.from(merchantMap.entries())
          .map(([name, data]) => ({
            name,
            incidents: data.incidents,
            riskScore: Math.min(100, Math.round((data.incidents / fraudTransactions.length) * 1000)),
          }))
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 5)

        setTopMerchants(merchantList)

        // CORRECTION: Amount distribution avec les vraies alertes
        const amountRanges = [
          { range: "$0-$100", min: 0, max: 100 },
          { range: "$100-$500", min: 100, max: 500 },
          { range: "$500-$1K", min: 500, max: 1000 },
          { range: "$1K-$5K", min: 1000, max: 5000 },
          { range: "$5K+", min: 5000, max: Number.POSITIVE_INFINITY },
        ]

        const amountCounts = amountRanges.map((range) => ({
          label: range.range,
          value: alerts.filter((alert) => alert.amount >= range.min && alert.amount < range.max).length,
        }))

        setAmountDistribution(amountCounts)

        // CORRECTION: Geographic data avec le bon champ country
        const locationMap = new Map<string, number>()
        transactions.forEach((tx) => {
          // CORRECTION: Utiliser tx.country directement au lieu de split
          const country = tx.country || "Unknown"
          locationMap.set(country, (locationMap.get(country) || 0) + 1)
        })

        setGeographicData(
          Array.from(locationMap.entries())
            .map(([country, count]) => ({ label: country, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6),
        )

        // CORRECTION: Stats avec les vraies données
        const totalBlocked = alerts.reduce((sum, alert) => sum + alert.amount, 0)
        
        // CORRECTION: Utiliser country directement
        const uniqueCountries = new Set(transactions.map((tx) => tx.country).filter(Boolean))

        // CORRECTION: Calcul du taux de détection basé sur les transactions suspectes
        const suspiciousTransactions = transactions.filter(tx => tx.is_suspicious || tx.is_fraud).length

        setStats({
          totalFrauds: alerts.length,
          amountBlocked: totalBlocked,
          detectionRate: transactions.length > 0 ? (suspiciousTransactions / transactions.length) * 100 : 0,
          countriesAffected: uniqueCountries.size,
        })

      } catch (error) {
        console.error("Error fetching analytics data:", error)
      }
    }

    // Initial fetch
    fetchData()

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics & Reports</h2>
        <p className="text-sm text-muted-foreground">Comprehensive fraud analysis and trends</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Alerts" 
          value={stats.totalFrauds}
          change={5.2}
          trend="up"
          icon={<AlertTriangle className="h-5 w-5" />}
          color="hsl(var(--destructive))"
        />

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount at Risk</p>
              <p className="text-2xl font-bold text-foreground">${(stats.amountBlocked / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Suspicious Rate</p>
              <p className="text-2xl font-bold text-foreground">{stats.detectionRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Countries</p>
              <p className="text-2xl font-bold text-foreground">{stats.countriesAffected}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly trend */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Alert Trend (24 Hours)</h3>
          <BarChart data={hourlyData} height={300} color="hsl(var(--destructive))" />
        </Card>

        {/* Geographic distribution */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Geographic Distribution</h3>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <PieChart data={geographicData} size={200} innerRadius={30} />
            </div>
            <div className="flex-1 space-y-2">
              {geographicData.map((item, index) => {
                const colors = [
                  "hsl(var(--chart-1))",
                  "hsl(var(--chart-2))",
                  "hsl(var(--chart-3))",
                  "hsl(var(--destructive))",
                  "hsl(var(--chart-5))",
                  "hsl(var(--muted))",
                ]
                return (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">{item.value}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Top risky merchants */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Top 5 Risky Merchants</h3>
          <div className="space-y-4">
            {topMerchants.map((merchant, index) => (
              <div key={merchant.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="font-medium text-foreground">{merchant.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{merchant.incidents} incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar 
                    value={merchant.riskScore} 
                    color="hsl(var(--destructive))"
                    showLabel={false}
                    height={6}
                  />
                  <span className="font-mono text-xs font-semibold text-destructive">{merchant.riskScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Amount distribution */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Alert Amount Distribution</h3>
          <BarChart data={amountDistribution} height={300} color="hsl(var(--primary))" horizontal />
        </Card>
      </div>
    </div>
  )
}