"use client"

import { KpiCards } from "@/components/kpi-cards"
import { LiveTicker } from "@/components/live-ticker"
import { TransactionMap } from "@/components/transaction-map"
import { RealTimeCharts } from "@/components/real-time-charts"

export function DashboardContent() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Real-time Overview</h2>
        <p className="text-sm text-muted-foreground">Monitor transactions and fraud alerts in real-time</p>
      </div>

      <KpiCards />
      <LiveTicker />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Transaction Map</h3>
          <div className="h-96">
            <TransactionMap />
          </div>
        </div>

        <div className="h-full">
          <RealTimeCharts />
        </div>
      </div>
    </div>
  )
}
