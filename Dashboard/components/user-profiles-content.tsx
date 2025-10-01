"use client"

import { useState, useEffect } from "react"
import { Search, User, TrendingUp, AlertCircle, CreditCard, Database } from "./icons"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getTransactionFeed, getTransactionsByUser, type Transaction } from "@/lib/api"

interface UserTransaction {
  id: string
  transaction_id: string
  date: string
  merchant: string
  amount: number
  currency: string
  status: "normal" | "suspicious" | "fraud"
  location: string
  country: string
  suspicion_reason?: string
}

interface UserProfileData {
  userId: string
  name: string
  email: string
  riskScore: number
  accountAge: string
  totalTransactions: number
  flaggedTransactions: number
  averageAmount: number
  homeCountry: string
  user_avg_amount: number
  user_risk_score: number
}

export function UserProfilesContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([])
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedUser) {
      fetchUserData(selectedUser)
    }
  }, [selectedUser])

  const fetchUserData = async (userId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // CORRECTION : Récupérer les transactions de l'utilisateur depuis l'API
      const transactions = await getTransactionsByUser(userId, 50)
      
      if (transactions.length === 0) {
        setError("No transactions found for this user")
        setLoading(false)
        return
      }

      // CORRECTION : Convertir les transactions API en format UserTransaction
      const userTx: UserTransaction[] = transactions.map((tx: Transaction) => ({
        id: tx.transaction_id,
        transaction_id: tx.transaction_id,
        date: new Date(tx.timestamp).toLocaleString("fr-FR"),
        merchant: tx.merchant,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.is_fraud ? "fraud" : tx.is_suspicious ? "suspicious" : "normal",
        location: `${tx.city}, ${tx.country}`,
        country: tx.country,
        suspicion_reason: tx.suspicion_reason
      }))

      setUserTransactions(userTx)

      // CORRECTION : Créer le profil utilisateur basé sur les données réelles
      const firstTx = transactions[0]
      const flaggedCount = transactions.filter(tx => tx.is_suspicious || tx.is_fraud).length
      const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)
      const avgAmount = totalAmount / transactions.length

      const profile: UserProfileData = {
        userId: userId,
        name: `User ${userId.split('_')[1]}`,
        email: `${userId}@gmail.com`,
        riskScore: Math.round((firstTx.user_risk_score || 0.5) * 100),
        accountAge: calculateAccountAge(transactions),
        totalTransactions: transactions.length,
        flaggedTransactions: flaggedCount,
        averageAmount: avgAmount,
        homeCountry: firstTx.user_home_country || "Unknown",
        user_avg_amount: firstTx.user_avg_amount || 0,
        user_risk_score: firstTx.user_risk_score || 0
      }

      setUserProfile(profile)
      setLoading(false)

    } catch (error) {
      console.error("Error fetching user data:", error)
      setError("Failed to fetch user data")
      setLoading(false)
    }
  }

  // CORRECTION : Calculer l'âge du compte basé sur la première transaction
  const calculateAccountAge = (transactions: Transaction[]): string => {
    if (transactions.length === 0) return "Unknown"
    
    const dates = transactions.map(tx => new Date(tx.timestamp).getTime())
    const oldestDate = new Date(Math.min(...dates))
    const now = new Date()
    
    const diffMonths = (now.getFullYear() - oldestDate.getFullYear()) * 12 + 
                      (now.getMonth() - oldestDate.getMonth())
    
    if (diffMonths < 1) return "Less than 1 month"
    if (diffMonths < 12) return `${diffMonths} months`
    
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    
    return months > 0 ? `${years} years ${months} months` : `${years} years`
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // CORRECTION : Support pour user_123 ou user_456
      const userId = searchQuery.startsWith('user_') ? searchQuery : `user_${searchQuery.replace(/\D/g, '')}`
      setSelectedUser(userId)
    }
  }

  // CORRECTION : Fonction pour le niveau de risque
  const getRiskLevel = (riskScore: number): { text: string; color: string } => {
    if (riskScore >= 70) return { text: "High Risk", color: "text-destructive" }
    if (riskScore >= 40) return { text: "Medium Risk", color: "text-warning" }
    return { text: "Low Risk", color: "text-success" }
  }

  const getStatusColor = (status: "normal" | "suspicious" | "fraud") => {
    switch (status) {
      case "fraud": return { bg: "bg-destructive/10", text: "text-destructive", icon: "text-destructive" }
      case "suspicious": return { bg: "bg-warning/10", text: "text-warning", icon: "text-warning" }
      default: return { bg: "bg-success/10", text: "text-success", icon: "text-success" }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">User Profiles</h2>
          <p className="text-sm text-muted-foreground">Search and analyze user transaction history</p>
        </div>

        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by User ID (e.g., user_123)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
                disabled
              />
            </div>
            <Button onClick={handleSearch} disabled>Search</Button>
          </div>
        </Card>

        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">User Profiles</h2>
        <p className="text-sm text-muted-foreground">Search and analyze user transaction history</p>
      </div>

      {/* Search bar */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by User ID (e.g., user_123)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </Card>

      {error && (
        <Card className="p-6 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {selectedUser && userProfile && (
        <>
          {/* User profile card */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{userProfile.name}</h3>
                  <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {userProfile.userId}</p>
                  <p className="text-xs text-muted-foreground">Home: {userProfile.homeCountry}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{userProfile.riskScore}</p>
                  <p className={`text-xs ${getRiskLevel(userProfile.riskScore).color}`}>
                    {getRiskLevel(userProfile.riskScore).text}
                  </p>
                </div>
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  userProfile.riskScore >= 70 ? "bg-destructive/10" : 
                  userProfile.riskScore >= 40 ? "bg-warning/10" : "bg-success/10"
                }`}>
                  <TrendingUp className={`h-8 w-8 ${
                    userProfile.riskScore >= 70 ? "text-destructive" : 
                    userProfile.riskScore >= 40 ? "text-warning" : "text-success"
                  }`} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Account Age</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{userProfile.accountAge}</p>
                  <p className="text-xs text-muted-foreground">Based on transaction history</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{userProfile.totalTransactions}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Flagged Transactions</p>
              <p className="mt-1 font-mono text-2xl font-bold text-warning">{userProfile.flaggedTransactions}</p>
              <p className="text-xs text-muted-foreground">
                {((userProfile.flaggedTransactions / userProfile.totalTransactions) * 100).toFixed(1)}% of total
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Average Amount</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                {userProfile.averageAmount.toFixed(2)} {userTransactions[0]?.currency || "USD"}
              </p>
              <p className="text-xs text-muted-foreground">
                vs {userProfile.user_avg_amount.toFixed(2)} user avg
              </p>
            </Card>
          </div>

          {/* Transaction history */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Recent Transactions</h3>
              <span className="text-sm text-muted-foreground">
                {userTransactions.length} transactions found
              </span>
            </div>
            <div className="space-y-3">
              {userTransactions.map((tx) => {
                const statusColors = getStatusColor(tx.status)
                return (
                  <div
                    key={tx.transaction_id}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${statusColors.bg}`}>
                        <AlertCircle className={`h-5 w-5 ${statusColors.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{tx.merchant}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.date} • {tx.location}
                        </p>
                        {tx.suspicion_reason && tx.suspicion_reason !== "none" && (
                          <p className="text-xs text-warning mt-1">
                            Reason: {tx.suspicion_reason.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-mono font-semibold text-foreground">
                        {tx.amount.toFixed(2)} {tx.currency}
                      </p>
                      <p className={`text-xs font-medium ${statusColors.text}`}>
                        {tx.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {!selectedUser && !loading && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Search for a User</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter a user ID (e.g., user_123) to view their profile and transaction history
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Try searching for: user_0, user_1, user_2, etc.</p>
              <p className="mt-1">Based on your 500 generated user profiles</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}