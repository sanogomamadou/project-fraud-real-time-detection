"use client"

import { useState } from "react"
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  AlertTriangle,
  Database
} from "./icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { getHealthStatus, getFraudAlerts } from "@/lib/api"

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Real-time overview"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Reports & trends"
  },
  {
    id: "users",
    label: "User Profiles",
    icon: Users,
    description: "Customer insights"
  },
  {
    id: "settings",
    label: "Configuration",
    icon: Settings,
    description: "System settings"
  },
]

interface DashboardSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [systemMetrics, setSystemMetrics] = useState<{
    activeAlerts: number
    isSystemHealthy: boolean
    cassandraConnected: boolean
  }>({
    activeAlerts: 0,
    isSystemHealthy: false,
    cassandraConnected: false
  })

  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        // CORRECTION : Récupérer les métriques système réelles
        const [health, alerts] = await Promise.all([
          getHealthStatus(),
          getFraudAlerts(50, true) // Alertes actives seulement
        ])

        setSystemMetrics({
          activeAlerts: alerts.length,
          isSystemHealthy: health.status === "healthy",
          cassandraConnected: health.cassandra_connected
        })
      } catch (error) {
        console.error("Error fetching system metrics:", error)
        setSystemMetrics(prev => ({
          ...prev,
          isSystemHealthy: false,
          cassandraConnected: false
        }))
      }
    }

    fetchSystemMetrics()
    
    // CORRECTION : Rafraîchissement toutes les 15 secondes
    const interval = setInterval(fetchSystemMetrics, 15000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className={cn(
      "border-r border-border bg-sidebar transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* En-tête avec logo */}
      <div className={cn(
        "border-b border-border p-4 transition-all duration-300",
        collapsed ? "px-2" : "px-4"
      )}>
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          collapsed ? "justify-center" : "justify-start"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">Fraud Detection</h2>
              <p className="text-xs text-muted-foreground truncate">Monitoring System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation principale */}
      <div className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:shadow-sm",
                collapsed ? "justify-center px-2" : "justify-start"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-105"
              )} />
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.id === "dashboard" && systemMetrics.activeAlerts > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                        {systemMetrics.activeAlerts > 9 ? "9+" : systemMetrics.activeAlerts}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* CORRECTION : Indicateurs système */}
      {!collapsed && (
        <div className="border-t border-border p-3 space-y-3">
          {/* Indicateur d'alertes actives */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium">Active Alerts</span>
            </div>
            <span className="font-mono text-xs font-bold text-destructive">
              {systemMetrics.activeAlerts}
            </span>
          </div>

          {/* Statut système */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  systemMetrics.isSystemHealthy ? "bg-success" : "bg-destructive"
                }`} />
                <span className="text-muted-foreground">API</span>
              </div>
              <span className={systemMetrics.isSystemHealthy ? "text-success" : "text-destructive"}>
                {systemMetrics.isSystemHealthy ? "Online" : "Offline"}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Cassandra</span>
              </div>
              <span className={systemMetrics.cassandraConnected ? "text-success" : "text-destructive"}>
                {systemMetrics.cassandraConnected ? "Connected" : "Error"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CORRECTION : Bouton de collapse amélioré */}
      <div className="border-t border-border p-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setCollapsed(!collapsed)} 
          className={cn(
            "w-full transition-all duration-300 group",
            collapsed ? "justify-center px-2" : "justify-between"
          )}
        >
          {!collapsed && (
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Collapse
            </span>
          )}
          {collapsed ? (
            <ChevronRight className="h-4 w-4 transition-transform group-hover:scale-110" />
          ) : (
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:scale-110" />
          )}
        </Button>
      </div>
    </aside>
  )
}