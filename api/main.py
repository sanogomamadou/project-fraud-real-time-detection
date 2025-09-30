# api/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from datetime import datetime
import logging
from typing import Optional

from cassandra_client import CassandraClient
from models import TransactionResponse, FraudAlertsResponse, HealthCheck

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FraudDetectionAPI")

# Initialisation de l'application FastAPI
app = FastAPI(
    title="Fraud Detection API",
    description="API pour la détection de fraude en temps réel",
    version="1.0.0"
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Client Cassandra global
cassandra_client = CassandraClient()

@app.on_event("startup")
async def startup_event():
    logger.info(" Démarrage de l'API Fraud Detection...")
    try:
        cassandra_client.connect()
        logger.info(" API prête à recevoir des requêtes")
    except Exception as e:
        logger.error(f" Erreur au démarrage: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(" Arrêt de l'API Fraud Detection...")
    cassandra_client.close()

@app.get("/", response_class=HTMLResponse)
async def root():
    html_content = """
    <html>
        <head>
            <title>Fraud Detection API</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
                code { background: #eee; padding: 2px 5px; }
            </style>
        </head>
        <body>
            <h1>🚨 Fraud Detection API</h1>
            <p>API pour la détection de fraude en temps réel</p>
            
            <h2> Endpoints disponibles :</h2>
            
            <div class="endpoint">
                <strong>GET</strong> <code>/health</code><br>
                <em>Statut de santé de l'API</em>
            </div>
            
            <div class="endpoint">
                <strong>GET</strong> <code>/transactions/feed</code><br>
                <em>Flux des dernières transactions</em>
            </div>
            
            <div class="endpoint">
                <strong>GET</strong> <code>/fraud/alerts</code><br>
                <em>Alertes de fraude récentes</em>
            </div>
            
            <div class="endpoint">
                <strong>GET</strong> <code>/transactions/user/{user_id}</code><br>
                <em>Transactions d'un utilisateur spécifique</em>
            </div>
            
            <p> <a href="/docs">Documentation Swagger</a></p>
            <p> <a href="/redoc">Documentation ReDoc</a></p>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/health", response_model=HealthCheck)
async def health_check():
    try:
        cassandra_client.session.execute("SELECT now() FROM system.local")
        cassandra_connected = True
    except:
        cassandra_connected = False
    
    return HealthCheck(
        status="healthy" if cassandra_connected else "degraded",
        cassandra_connected=cassandra_connected,
        timestamp=datetime.now()
    )

@app.get("/transactions/feed", response_model=TransactionResponse)
async def get_transactions_feed(
    limit: int = Query(100, description="Nombre maximum de transactions à retourner", ge=1, le=1000)
):
    try:
        transactions = cassandra_client.get_recent_transactions(limit=limit)
        return TransactionResponse(transactions=transactions, total=len(transactions))
    except Exception as e:
        logger.error(f"  Erreur dans /transactions/feed: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

@app.get("/fraud/alerts", response_model=FraudAlertsResponse)
async def get_fraud_alerts(
    limit: int = Query(50, description="Nombre maximum d'alertes à retourner", ge=1, le=500),
    processed: bool = Query(False, description="Inclure les alertes déjà traitées")
):
    try:
        alerts = cassandra_client.get_fraud_alerts(limit=limit, processed=processed)
        return FraudAlertsResponse(alerts=alerts, total=len(alerts))
    except Exception as e:
        logger.error(f"Erreur dans /fraud/alerts: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

@app.get("/transactions/user/{user_id}", response_model=TransactionResponse)
async def get_user_transactions(
    user_id: str,
    limit: int = Query(50, description="Nombre maximum de transactions à retourner", ge=1, le=200)
):
    try:
        transactions = cassandra_client.get_transactions_by_user(user_id, limit=limit)
        if not transactions:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé ou aucune transaction")
        return TransactionResponse(transactions=transactions, total=len(transactions))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur dans /transactions/user/{user_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)