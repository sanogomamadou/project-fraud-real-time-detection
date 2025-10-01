"use client"

import { Shield, Activity, Clock, Database } from "./icons"
import { useEffect, useState } from "react"
import { getHealthStatus } from "@/lib/api"

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [systemStatus, setSystemStatus] = useState<{
    isLive: boolean
    cassandraConnected: boolean
    status: string
    lastUpdate: string
  }>({
    isLive: false,
    cassandraConnected: false,
    status: "unknown",
    lastUpdate: new Date().toISOString()
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const health = await getHealthStatus()
        
        setSystemStatus({
          isLive: health.status === "healthy",
          cassandraConnected: health.cassandra_connected,
          status: health.status,
          lastUpdate: health.timestamp
        })
      } catch (error) {
        console.error("Error checking system health:", error)
        setSystemStatus(prev => ({
          ...prev,
          isLive: false,
          status: "error"
        }))
      }
    }

    // Vérification initiale
    checkSystemHealth()

    // CORRECTION : Vérifier le statut toutes les 10 secondes
    const healthInterval = setInterval(checkSystemHealth, 10000)

    return () => clearInterval(healthInterval)
  }, [])

  // CORRECTION : Fonction pour le texte du statut
  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      "healthy": "Live",
      "degraded": "Degraded", 
      "error": "Offline",
      "unknown": "Checking..."
    }
    return statusMap[status] || "Unknown"
  }

  // CORRECTION : Fonction pour la couleur du statut
  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      "healthy": "bg-success",
      "degraded": "bg-warning", 
      "error": "bg-destructive",
      "unknown": "bg-muted"
    }
    return colorMap[status] || "bg-muted"
  }

  // CORRECTION : Fonction pour le temps écoulé depuis la dernière mise à jour
  const getTimeSinceLastUpdate = (timestamp: string): string => {
    const lastUpdate = new Date(timestamp)
    const diffInSeconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">RealShield</h1>
            <p className="text-xs text-muted-foreground">Real-time fraud detection system</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* CORRECTION : Statut du système avec données réelles */}
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                  systemStatus.isLive ? getStatusColor(systemStatus.status) : "bg-destructive"
                } opacity-75`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  systemStatus.isLive ? getStatusColor(systemStatus.status) : "bg-destructive"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-foreground">
              {getStatusText(systemStatus.status)}
            </span>
          </div>

          {/* CORRECTION : Statut Cassandra */}
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  systemStatus.cassandraConnected ? "bg-success" : "bg-destructive"
                } ${systemStatus.cassandraConnected ? "animate-ping" : ""} opacity-75`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  systemStatus.cassandraConnected ? "bg-success" : "bg-destructive"
                }`}
              />
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cassandra</span>
            </div>
          </div>

          {/* Heure actuelle */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-sm">{currentTime.toLocaleTimeString("fr-FR")}</span>
          </div>

          {/* CORRECTION : Indicateur d'activité système */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
            systemStatus.isLive ? "bg-success/10" : "bg-destructive/10"
          }`}>
            <Activity className={`h-4 w-4 ${
              systemStatus.isLive ? "text-success" : "text-destructive"
            }`} />
            <span className={`text-sm font-medium ${
              systemStatus.isLive ? "text-success" : "text-destructive"
            }`}>
              {systemStatus.isLive ? "System Active" : "System Offline"}
            </span>
          </div>

          {/* CORRECTION : Dernière mise à jour */}
          <div className="text-xs text-muted-foreground">
            Updated {getTimeSinceLastUpdate(systemStatus.lastUpdate)}
          </div>
        </div>
      </div>
    </header>
  )
}