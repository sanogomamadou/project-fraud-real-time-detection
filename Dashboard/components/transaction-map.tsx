"use client"

import { useEffect, useState } from "react"
import { MapPin, AlertTriangle } from "./icons"
import { getTransactionFeed, type Transaction as ApiTransaction } from "@/lib/api"

interface MapTransaction {
  id: string
  transaction_id: string
  latitude: number
  longitude: number
  amount: number
  is_fraud: boolean
  is_suspicious: boolean
  city: string
  currency?: string  
  country: string
  timestamp: string
  user_id: string
  merchant: string
  suspicion_reason?: string
}

export function TransactionMap() {
  const [transactions, setTransactions] = useState<MapTransaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<MapTransaction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // CORRECTION : Récupérer les vraies transactions de l'API
        const apiTransactions = await getTransactionFeed(100)
        
        // CORRECTION : Convertir les transactions API en format Map
        const mapTransactions: MapTransaction[] = apiTransactions.map(tx => ({
          id: tx.transaction_id,
          transaction_id: tx.transaction_id,
          latitude: tx.latitude,
          longitude: tx.longitude,
          amount: tx.amount,
          is_fraud: tx.is_fraud,
          is_suspicious: tx.is_suspicious,
          city: tx.city,
          currency: tx.currency,
          country: tx.country,
          timestamp: tx.timestamp,
          user_id: tx.user_id,
          merchant: tx.merchant,
          suspicion_reason: tx.suspicion_reason
        }))

        setTransactions(mapTransactions)
        setLoading(false)

      } catch (error) {
        console.error("Error fetching transactions for map:", error)
        setLoading(false)
      }
    }

    fetchTransactions()

    // CORRECTION : Rafraîchissement toutes les 5 secondes
    const interval = setInterval(fetchTransactions, 5000)

    return () => clearInterval(interval)
  }, [])

  // CORRECTION : Fonction pour déterminer la couleur du point
  const getPointColor = (transaction: MapTransaction): string => {
    if (transaction.is_fraud) return "bg-destructive"
    if (transaction.is_suspicious) return "bg-warning"
    return "bg-success"
  }

  // CORRECTION : Fonction pour déterminer l'animation
  const getPointAnimation = (transaction: MapTransaction): string => {
    if (transaction.is_fraud) return "animate-ping"
    if (transaction.is_suspicious) return "animate-pulse"
    return ""
  }

  // CORRECTION : Fonction pour le statut
  const getStatusText = (transaction: MapTransaction): string => {
    if (transaction.is_fraud) return "Fraud Confirmed"
    if (transaction.is_suspicious) return "Suspicious Activity"
    return "Normal Transaction"
  }

  // CORRECTION : Fonction pour la couleur du statut
  const getStatusColor = (transaction: MapTransaction): string => {
    if (transaction.is_fraud) return "text-destructive"
    if (transaction.is_suspicious) return "text-warning"
    return "text-success"
  }

  if (loading) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-secondary/30">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-secondary/30">
      {/* World map background pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg className="h-full w-full" viewBox="0 0 1000 500">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="1000" height="500" fill="url(#grid)" />
        </svg>
      </div>

      {/* Transaction points */}
      <div className="absolute inset-0">
        {transactions.map((tx) => {
          // CORRECTION : Conversion des coordonnées pour l'affichage
          const x = ((tx.longitude + 180) / 360) * 100
          const y = ((90 - tx.latitude) / 180) * 100

          return (
            <button
              key={tx.transaction_id}
              onClick={() => setSelectedTransaction(tx)}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-150"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="relative">
                <div
                  className={`h-3 w-3 rounded-full ${getPointColor(tx)} ${getPointAnimation(tx)} absolute inset-0 opacity-75`}
                />
                <div className={`h-3 w-3 rounded-full ${getPointColor(tx)}`} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Transaction details popup */}
      {selectedTransaction && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {selectedTransaction.city}, {selectedTransaction.country}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-mono font-semibold text-foreground">
                    {selectedTransaction.amount.toFixed(2)} {selectedTransaction.currency}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className={`font-semibold ${getStatusColor(selectedTransaction)}`}>
                    {getStatusText(selectedTransaction)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Merchant</p>
                  <p className="font-semibold text-foreground truncate">
                    {selectedTransaction.merchant}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-mono text-xs text-foreground truncate">
                    {selectedTransaction.user_id}
                  </p>
                </div>
              </div>

              {/* CORRECTION : Afficher la raison de suspicion si applicable */}
              {selectedTransaction.suspicion_reason && selectedTransaction.suspicion_reason !== "none" && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-warning">
                    Reason: {selectedTransaction.suspicion_reason.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {new Date(selectedTransaction.timestamp).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute right-4 top-4 rounded-lg border border-border bg-card p-3 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">Suspicious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Fraud</span>
          </div>
        </div>
      </div>

      {/* CORRECTION : Indicateur de données en temps réel */}
      <div className="absolute left-4 top-4 rounded-lg border border-border bg-card px-3 py-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
          <span className="text-muted-foreground">
            {transactions.length} transactions
          </span>
        </div>
      </div>
    </div>
  )
}