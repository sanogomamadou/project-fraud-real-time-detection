"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { KpiCards } from "@/components/kpi-cards"
import { LiveTicker } from "@/components/live-ticker"
import { TransactionMap } from "@/components/transaction-map"
import { RealTimeCharts } from "@/components/real-time-charts"
import { AnalyticsContent } from "@/components/analytics-content"
import { UserProfilesContent } from "@/components/user-profiles-content"
import { ConfigurationContent } from "@/components/configuration-content"
import { getHealthStatus } from "@/lib/api"

export default function FraudDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [systemStatus, setSystemStatus] = useState<{
    isHealthy: boolean
    cassandraConnected: boolean
  }>({
    isHealthy: false,
    cassandraConnected: false
  })

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const health = await getHealthStatus()
        setSystemStatus({
          isHealthy: health.status === "healthy",
          cassandraConnected: health.cassandra_connected
        })
      } catch (error) {
        console.error("Error checking system status:", error)
        setSystemStatus({
          isHealthy: false,
          cassandraConnected: false
        })
      }
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // CORRECTION : Composant DashboardContent intégré directement
  const DashboardContent = () => (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Real-time Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Live monitoring of transactions and fraud detection
          {!systemStatus.isHealthy && (
            <span className="ml-2 text-destructive text-xs">
              • System status: {systemStatus.isHealthy ? "Healthy" : "Degraded"}
            </span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards />

      {/* Main dashboard grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Live transaction map */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">Live Transaction Map</h3>
            <div className="h-96">
              <TransactionMap />
            </div>
          </div>

          {/* Real-time charts */}
          <RealTimeCharts />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Live fraud alerts */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">Live Alerts & Monitoring</h3>
            <LiveTicker />
          </div>

          {/* System status */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">System Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">API Status</p>
                  <p className={`mt-1 text-lg font-semibold ${
                    systemStatus.isHealthy ? "text-success" : "text-destructive"
                  }`}>
                    {systemStatus.isHealthy ? "Operational" : "Degraded"}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground">Database</p>
                  <p className={`mt-1 text-lg font-semibold ${
                    systemStatus.cassandraConnected ? "text-success" : "text-destructive"
                  }`}>
                    {systemStatus.cassandraConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
              
              <div className="rounded-lg bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">Detection Engine</p>
                <p className="mt-1 text-lg font-semibold text-success">Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Monitoring transactions in real-time with ML rules
                </p>
              </div>

              {!systemStatus.isHealthy && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive">System Notice</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Some services may be temporarily unavailable. Data display might be limited.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent />
      case "analytics":
        return <AnalyticsContent />
      case "users":
        return <UserProfilesContent />
      case "settings":
        return <ConfigurationContent />
      default:
        return <DashboardContent />
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}