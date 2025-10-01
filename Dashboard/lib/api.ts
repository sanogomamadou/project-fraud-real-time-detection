// API service for fraud detection dashboard - CONNECTED TO REAL FASTAPI
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Transaction {
  transaction_id: string;
  timestamp: string;
  user_id: string;
  amount: number;
  currency: string;
  merchant: string;
  merchant_category: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  is_fraud: boolean;
  fraud_type?: string;
  is_suspicious: boolean;
  suspicion_reason: string;
  user_home_country: string;
  user_avg_amount: number;
  user_risk_score: number;
}

export interface FraudAlert {
  alert_date: string;
  timestamp: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  country: string;
  alert_level: string;
  suspicion_reason: string;
  processed: boolean;
}

// CORRECTION: Interfaces de réponse plus précises
export interface TransactionResponse {
  transactions: Transaction[];
  total: number;
}

export interface FraudAlertsResponse {
  alerts: FraudAlert[];
  total: number;
}

export interface HealthResponse {
  status: string;
  cassandra_connected: boolean;
  timestamp: string;
}

// Fetch real-time transaction feed from FastAPI - VERSION CORRIGÉE
export async function getTransactionFeed(limit = 50): Promise<Transaction[]> {
  try {
    const response = await fetch(`${API_BASE}/transactions/feed?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch transactions`);
    
    // CORRECTION: Utiliser l'interface de réponse correcte
    const data: TransactionResponse = await response.json();
    return data.transactions || [];
    
  } catch (error) {
    console.error("Error fetching transactions from FastAPI:", error);
    // Fallback to mock data if API is not available
    return await getMockTransactions(limit);
  }
}

// Fetch fraud alerts from FastAPI - VERSION CORRIGÉE
export async function getFraudAlerts(limit = 30, activeOnly = false): Promise<FraudAlert[]> {
  try {
    // CORRECTION: Ton API utilise "processed" avec true/false, pas "active_only"
    const processedParam = activeOnly ? "false" : "true";
    const response = await fetch(
      `${API_BASE}/fraud/alerts?limit=${limit}&processed=${processedParam}`
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch alerts`);
    
    // CORRECTION: Utiliser l'interface de réponse correcte
    const data: FraudAlertsResponse = await response.json();
    return data.alerts || [];
    
  } catch (error) {
    console.error("Error fetching alerts from FastAPI:", error);
    // Fallback to mock data if API is not available
    return await getMockAlerts(limit, activeOnly);
  }
}

// Fetch health status from FastAPI - VERSION CORRIGÉE
export async function getHealthStatus(): Promise<{
  status: string;
  cassandra_connected: boolean;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch health status`);
    
    // CORRECTION: Utiliser l'interface de réponse correcte
    const data: HealthResponse = await response.json();
    return data;
    
  } catch (error) {
    console.error("Error fetching health status:", error);
    return {
      status: "error",
      cassandra_connected: false,
      timestamp: new Date().toISOString(),
    };
  }
}

// Mock data fallbacks (from your existing mock-data.ts) - VERSION AMÉLIORÉE
async function getMockTransactions(limit: number): Promise<Transaction[]> {
  const merchants = ["Amazon", "Walmart", "Starbucks", "Apple", "Netflix"];
  const countries = ["US", "FR", "GB", "DE", "MA", "ML"];
  const cities = ["New York", "Paris", "London", "Berlin", "Casablanca", "Bamako"];
  const categories = ["electronics", "groceries", "food", "subscription", "retail"];
  
  return Array.from({ length: limit }, (_, i) => {
    const isFraud = Math.random() < 0.05;
    const isSuspicious = Math.random() < 0.1;
    
    return {
      transaction_id: `TXN_MOCK_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      user_id: `user_${Math.floor(Math.random() * 500)}`,
      amount: Math.floor(Math.random() * 5000) + 10,
      currency: "USD",
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      merchant_category: categories[Math.floor(Math.random() * categories.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      city: cities[Math.floor(Math.random() * cities.length)],
      latitude: 40 + Math.random() * 30 - 15, // Approx Europe/US
      longitude: -5 + Math.random() * 60 - 30,
      is_fraud: isFraud,
      fraud_type: isFraud ? "high_amount" : undefined,
      is_suspicious: isSuspicious,
      suspicion_reason: isSuspicious ? "high_amount" : "none",
      user_home_country: "US",
      user_avg_amount: 150,
      user_risk_score: Math.random(),
    };
  });
}

async function getMockAlerts(limit: number, activeOnly: boolean): Promise<FraudAlert[]> {
  const countries = ["US", "FR", "GB", "DE", "MA"];
  const reasons = ["high_amount", "foreign_country", "high_risk_score", "velocity_check"];
  
  return Array.from({ length: limit }, (_, i) => {
    const today = new Date();
    return {
      alert_date: today.toISOString().split('T')[0],
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      transaction_id: `TXN_ALERT_${Date.now()}_${i}`,
      user_id: `user_${Math.floor(Math.random() * 500)}`,
      amount: Math.floor(Math.random() * 10000) + 100,
      country: countries[Math.floor(Math.random() * countries.length)],
      alert_level: ["HIGH", "MEDIUM", "LOW"][Math.floor(Math.random() * 3)],
      suspicion_reason: reasons[Math.floor(Math.random() * reasons.length)],
      processed: activeOnly ? false : Math.random() < 0.3,
    };
  });
}

export async function getTransactionsByUser(userId: string, limit = 50): Promise<Transaction[]> {
  try {
    const response = await fetch(`${API_BASE}/transactions/user/${userId}?limit=${limit}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`User ${userId} not found`);
      }
      throw new Error(`HTTP ${response.status}: Failed to fetch user transactions`);
    }
    const data: TransactionResponse = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error(`Error fetching transactions for user ${userId}:`, error);
    // Fallback to filtering from all transactions if specific endpoint fails
    try {
      const allTransactions = await getTransactionFeed(200);
      const userTransactions = allTransactions.filter(tx => tx.user_id === userId).slice(0, limit);
      return userTransactions;
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return [];
    }
  }
}

// CORRECTION: Ajouter des fonctions pour les métriques globales
export async function getDashboardMetrics() {
  try {
    const [transactions, alerts, health] = await Promise.all([
      getTransactionFeed(100),
      getFraudAlerts(50, true),
      getHealthStatus()
    ]);

    const totalTransactions = transactions.length;
    const fraudTransactions = transactions.filter(t => t.is_fraud).length;
    const suspiciousTransactions = transactions.filter(t => t.is_suspicious).length;
    const activeAlerts = alerts.filter(a => !a.processed).length;

    return {
      totalTransactions,
      fraudTransactions,
      suspiciousTransactions,
      activeAlerts,
      systemStatus: health.status,
      cassandraConnected: health.cassandra_connected
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return {
      totalTransactions: 0,
      fraudTransactions: 0,
      suspiciousTransactions: 0,
      activeAlerts: 0,
      systemStatus: "error",
      cassandraConnected: false
    };
  }
}