"use client"

import { useState, useEffect } from "react"
import { Shield, Zap, DollarSign, MapPin, Clock, Activity } from "./icons"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { getHealthStatus, getFraudAlerts, type FraudAlert } from "@/lib/api"

interface Rule {
  id: string
  name: string
  description: string
  enabled: boolean
  threshold?: number
  icon: any
}

interface SystemStatus {
  status: string
  cassandra_connected: boolean
  timestamp: string
  activeAlerts: number
}

export function ConfigurationContent() {
  const [rules, setRules] = useState<Rule[]>([
    {
      id: "high_amount",
      name: "High Amount Detection",
      description: "Flag transactions exceeding 3x user average amount",
      enabled: true,
      threshold: 3.0,
      icon: DollarSign,
    },
    {
      id: "foreign_country",
      name: "Foreign Country Alert",
      description: "Detect transactions outside user's home country",
      enabled: true,
      icon: MapPin,
    },
    {
      id: "velocity_check",
      name: "Transaction Velocity",
      description: "Monitor rapid succession of transactions from same user",
      enabled: true,
      threshold: 5,
      icon: Zap,
    },
    {
      id: "risk_score",
      name: "High Risk Score",
      description: "Alert on transactions from high-risk users",
      enabled: true,
      threshold: 0.7,
      icon: Activity,
    },
    {
      id: "impossible_travel",
      name: "Impossible Travel",
      description: "Detect transactions from geographically impossible locations",
      enabled: true,
      threshold: 60,
      icon: Clock,
    },
    {
      id: "ml_detection",
      name: "ML Anomaly Detection",
      description: "Machine learning-based fraud pattern detection",
      enabled: false,
      icon: Shield,
    },
  ])

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "unknown",
    cassandra_connected: false,
    timestamp: new Date().toISOString(),
    activeAlerts: 0
  })

  const [recentLogs, setRecentLogs] = useState<
    { rule: string; triggered: number; time: string }[]
  >([])

  // Charger les données système
  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [health, alerts] = await Promise.all([
          getHealthStatus(),
          getFraudAlerts(50, true) // Alertes actives seulement
        ])

        // Mettre à jour le statut système
        setSystemStatus({
          status: health.status,
          cassandra_connected: health.cassandra_connected,
          timestamp: health.timestamp,
          activeAlerts: alerts.length
        })

        // Générer les logs récents basés sur les vraies alertes
        const ruleTriggers = new Map<string, number>()
        
        alerts.forEach(alert => {
          const reason = alert.suspicion_reason
          const ruleName = getRuleNameFromReason(reason)
          ruleTriggers.set(ruleName, (ruleTriggers.get(ruleName) || 0) + 1)
        })

        const logs = Array.from(ruleTriggers.entries())
          .map(([rule, count]) => ({
            rule,
            triggered: count,
            time: getRelativeTime(new Date().getTime() - Math.random() * 300000) // 0-5 min ago
          }))
          .slice(0, 4)

        setRecentLogs(logs)

      } catch (error) {
        console.error("Error fetching system data:", error)
        setSystemStatus(prev => ({
          ...prev,
          status: "error",
          cassandra_connected: false
        }))
      }
    }

    fetchSystemData()
    const interval = setInterval(fetchSystemData, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Helper function to map suspicion reasons to rule names
  const getRuleNameFromReason = (reason: string): string => {
    const reasonMap: { [key: string]: string } = {
      "high_amount": "High Amount Detection",
      "foreign_country": "Foreign Country Alert", 
      "high_risk_score": "High Risk Score",
      "velocity_check": "Transaction Velocity",
      "impossible_travel": "Impossible Travel"
    }
    return reasonMap[reason] || "Unknown Rule"
  }

  // Helper function for relative time
  const getRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "Just now"
    if (minutes === 1) return "1 min ago"
    if (minutes < 60) return `${minutes} min ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return "1 hour ago"
    return `${hours} hours ago`
  }

  const toggleRule = (id: string) => {
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)))
  }

  const updateThreshold = (id: string, value: number[]) => {
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, threshold: value[0] } : rule)))
  }

  const getThresholdLabel = (rule: Rule): string => {
    switch (rule.id) {
      case "high_amount":
        return `${rule.threshold}x avg amount`
      case "velocity_check":
        return `${rule.threshold} tx/10min`
      case "risk_score":
        return `> ${rule.threshold}`
      case "impossible_travel":
        return `${rule.threshold} min`
      default:
        return rule.threshold?.toString() || ""
    }
  }

  const getThresholdConfig = (ruleId: string) => {
    switch (ruleId) {
      case "high_amount":
        return { max: 10, step: 0.1, unit: "x" }
      case "velocity_check":
        return { max: 20, step: 1, unit: "" }
      case "risk_score":
        return { max: 1, step: 0.05, unit: "" }
      case "impossible_travel":
        return { max: 120, step: 5, unit: "min" }
      default:
        return { max: 100, step: 1, unit: "" }
    }
  }

  const handleSaveConfiguration = () => {
    // Dans un vrai système, on enverrait ces règles au backend
    console.log("Saving configuration:", rules)
    // Ici on pourrait appeler une API pour sauvegarder la configuration
    alert("Configuration saved! (This would call your backend API in production)")
  }

  const handleResetDefaults = () => {
    setRules([
      {
        id: "high_amount",
        name: "High Amount Detection",
        description: "Flag transactions exceeding 3x user average amount",
        enabled: true,
        threshold: 3.0,
        icon: DollarSign,
      },
      {
        id: "foreign_country",
        name: "Foreign Country Alert",
        description: "Detect transactions outside user's home country",
        enabled: true,
        icon: MapPin,
      },
      {
        id: "velocity_check",
        name: "Transaction Velocity",
        description: "Monitor rapid succession of transactions from same user",
        enabled: true,
        threshold: 5,
        icon: Zap,
      },
      {
        id: "risk_score",
        name: "High Risk Score",
        description: "Alert on transactions from high-risk users",
        enabled: true,
        threshold: 0.7,
        icon: Activity,
      },
      {
        id: "impossible_travel",
        name: "Impossible Travel",
        description: "Detect transactions from geographically impossible locations",
        enabled: true,
        threshold: 60,
        icon: Clock,
      },
      {
        id: "ml_detection",
        name: "ML Anomaly Detection",
        description: "Machine learning-based fraud pattern detection",
        enabled: false,
        icon: Shield,
      },
    ])
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Configuration</h2>
        <p className="text-sm text-muted-foreground">Manage fraud detection rules and thresholds</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">Detection Rules</h3>
            <div className="space-y-6">
              {rules.map((rule) => {
                const Icon = rule.icon
                const thresholdConfig = getThresholdConfig(rule.id)
                
                return (
                  <div key={rule.id} className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                      <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                    </div>

                    {rule.threshold !== undefined && rule.enabled && (
                      <div className="ml-13 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Threshold</span>
                          <span className="font-mono font-semibold text-foreground">
                            {getThresholdLabel(rule)}
                          </span>
                        </div>
                        <Slider
                          value={[rule.threshold || 0]}
                          onValueChange={(value) => updateThreshold(rule.id, value)}
                          max={thresholdConfig.max}
                          step={thresholdConfig.step}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleSaveConfiguration} className="flex-1">
                Save Configuration
              </Button>
              <Button variant="outline" onClick={handleResetDefaults}>
                Reset to Defaults
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Rules</span>
                <span className="font-mono font-semibold text-foreground">
                  {rules.filter((r) => r.enabled).length}/{rules.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detection Engine</span>
                <span className={`text-sm font-semibold ${
                  systemStatus.status === "healthy" ? "text-success" : 
                  systemStatus.status === "degraded" ? "text-warning" : "text-destructive"
                }`}>
                  {systemStatus.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cassandra</span>
                <span className={`text-sm font-semibold ${
                  systemStatus.cassandra_connected ? "text-success" : "text-destructive"
                }`}>
                  {systemStatus.cassandra_connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Alerts</span>
                <span className="font-mono font-semibold text-destructive">
                  {systemStatus.activeAlerts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Update</span>
                <span className="text-sm text-muted-foreground">
                  {getRelativeTime(new Date(systemStatus.timestamp).getTime())}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">Recent Rule Triggers</h3>
            <div className="space-y-3">
              {recentLogs.length > 0 ? (
                recentLogs.map((log, index) => (
                  <div key={index} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-sm font-medium text-foreground">{log.rule}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{log.triggered} triggers</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">No recent triggers</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}