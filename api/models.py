# api/models.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Transaction(BaseModel):
    transaction_id: str
    timestamp: datetime
    user_id: str
    card_id: Optional[str] = None  
    amount: float
    currency: str
    merchant: str
    merchant_category: str
    country: str
    city: Optional[str] = None  
    latitude: float
    longitude: float
    device_id: Optional[str] = None 
    ip_address: Optional[str] = None 
    is_fraud: bool
    fraud_type: Optional[str] = None
    is_suspicious: bool
    suspicion_reason: str
    user_home_country: str
    user_avg_amount: float
    user_risk_score: float

class FraudAlert(BaseModel):
    """Modèle pour une alerte de fraude"""
    alert_date: str
    timestamp: datetime
    transaction_id: str
    user_id: str
    amount: float
    country: str
    alert_level: str
    suspicion_reason: str
    processed: bool

class TransactionResponse(BaseModel):
    """Réponse pour les transactions"""
    transactions: List[Transaction]
    total: int

class FraudAlertsResponse(BaseModel):
    """Réponse pour les alertes de fraude"""
    alerts: List[FraudAlert]
    total: int

class HealthCheck(BaseModel):
    """Réponse pour le health check"""
    status: str
    cassandra_connected: bool
    timestamp: datetime