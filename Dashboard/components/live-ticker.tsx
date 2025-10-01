"use client"

import { useEffect, useState } from "react"
import { AlertCircle, MapPin } from "./icons"
import { getFraudAlerts, type FraudAlert as ApiAlert } from "@/lib/api"

interface Alert {
  id: string
  transaction_id: string
  type: string
  amount: number
  location: string
  timestamp: Date
  user_id: string
  alert_level: string
  suspicion_reason: string
  isNew: boolean
}

export function LiveTicker() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // CORRECTION : Remplacer les mocks par les vraies alertes de l'API
        const apiAlerts = await getFraudAlerts(20, true) // Alertes actives seulement

        if (!apiAlerts.length) {
          setLoading(false)
          return
        }

        setAlerts((prevAlerts) => {
          const newAlerts = apiAlerts.map((alert: ApiAlert) => ({
            id: alert.transaction_id + alert.timestamp, // ID unique
            transaction_id: alert.transaction_id,
            type: formatAlertType(alert.suspicion_reason),
            amount: alert.amount,
            location: alert.country,
            timestamp: new Date(alert.timestamp),
            user_id: alert.user_id,
            alert_level: alert.alert_level,
            suspicion_reason: alert.suspicion_reason,
            isNew: prevAlerts.length > 0 && 
                   !prevAlerts.find(prev => prev.transaction_id === alert.transaction_id),
          }))

          return [...newAlerts, ...prevAlerts]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10) // Garder seulement les 10 plus récentes
        })

        setLoading(false)

        // CORRECTION : Reset isNew flag après 5 secondes
        setTimeout(() => {
          setAlerts((current) => current.map((alert) => ({ ...alert, isNew: false })))
        }, 5000)

      } catch (error) {
        console.error("Error fetching fraud alerts:", error)
        setLoading(false)
      }
    }

    fetchAlerts()

    // CORRECTION : Rafraîchissement toutes les 5 secondes
    const interval = setInterval(fetchAlerts, 5000)

    return () => clearInterval(interval)
  }, [])

  // CORRECTION : Fonction pour formater le type d'alerte
  const formatAlertType = (reason: string): string => {
    const typeMap: { [key: string]: string } = {
      "high_amount": "High Amount",
      "foreign_country": "Foreign Country", 
      "high_risk_score": "High Risk Score",
      "velocity_check": "Transaction Velocity",
      "impossible_travel": "Impossible Travel",
      "burst_small_txns": "Transaction Burst",
      "none": "Suspicious Activity"
    }
    return typeMap[reason] || reason.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // CORRECTION : Fonction pour la couleur selon le niveau d'alerte
  const getAlertColor = (alertLevel: string): string => {
    switch (alertLevel) {
      case "HIGH": return "text-destructive"
      case "MEDIUM": return "text-warning" 
      case "LOW": return "text-muted-foreground"
      default: return "text-destructive"
    }
  }

  const getAlertBgColor = (alertLevel: string): string => {
    switch (alertLevel) {
      case "HIGH": return "bg-destructive/20"
      case "MEDIUM": return "bg-warning/20" 
      case "LOW": return "bg-muted/20"
      default: return "bg-destructive/20"
    }
  }

  const getAlertBorderColor = (alertLevel: string): string => {
    switch (alertLevel) {
      case "HIGH": return "border-destructive"
      case "MEDIUM": return "border-warning" 
      case "LOW": return "border-muted"
      default: return "border-destructive"
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-destructive/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">Live Fraud Alerts</span>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto p-4">
          <div className="space-y-2">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-destructive/10 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">Live Fraud Alerts</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {alerts.length} active
          </span>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-4">
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active fraud alerts</p>
              <p className="text-xs text-muted-foreground">Alerts will appear here in real-time</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-300 ${
                  alert.isNew
                    ? "animate-pulse-glow scale-105 shadow-lg"
                    : "scale-100"
                } ${getAlertBorderColor(alert.alert_level)} ${getAlertBgColor(alert.alert_level)}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getAlertBgColor(alert.alert_level)}`}>
                    <AlertCircle className={`h-4 w-4 ${getAlertColor(alert.alert_level)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{alert.type}</p>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getAlertColor(alert.alert_level)} ${getAlertBgColor(alert.alert_level)}`}>
                        {alert.alert_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{alert.location}</span>
                      <span className="text-xs font-mono">• {alert.user_id}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`font-mono text-sm font-semibold ${getAlertColor(alert.alert_level)}`}>
                    ${alert.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {alert.timestamp.toLocaleTimeString("fr-FR", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}