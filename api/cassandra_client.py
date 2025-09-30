# api/cassandra_client.py
import logging
from cassandra.cluster import Cluster
from cassandra.query import dict_factory

logger = logging.getLogger("CassandraClient")

class CassandraClient:
    """
    Client pour se connecter à Cassandra et exécuter des requêtes
    """
    
    def __init__(self):
        self.cluster = None
        self.session = None
        self.keyspace = "fraud_detection"
        
    def connect(self, hosts=['cassandra'], port=9042):
        """Établit la connexion à Cassandra"""
        try:
            self.cluster = Cluster(hosts, port=port)
            self.session = self.cluster.connect()
            
            # Créer le keyspace s'il n'existe pas
            self.session.execute(f"""
                CREATE KEYSPACE IF NOT EXISTS {self.keyspace}
                WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}
            """)
            
            self.session.set_keyspace(self.keyspace)
            self.session.row_factory = dict_factory
            
            logger.info("Connecté à Cassandra avec succès")
            
        except Exception as e:
            logger.error(f"Erreur de connexion à Cassandra: {e}")
            raise
    
    def get_recent_transactions(self, limit=100):
        """Récupère les transactions récentes"""
        try:
            query = f"SELECT * FROM transactions_by_user LIMIT {limit}"
            rows = self.session.execute(query)
            return list(rows)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des transactions: {e}")
            return []
    
    def get_fraud_alerts(self, limit=50, processed=False):
        try:
            query = """
                SELECT * FROM recent_fraud_alerts 
                WHERE processed = %s
                LIMIT %s 
                ALLOW FILTERING
            """
            rows = self.session.execute(query, (processed, limit))
            return list(rows)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des alertes: {e}")
            return []
    
    def get_transactions_by_user(self, user_id, limit=50):
        """Récupère les transactions d'un utilisateur spécifique"""
        try:
            query = f"SELECT * FROM transactions_by_user WHERE user_id = %s LIMIT {limit}"
            rows = self.session.execute(query, (user_id,))
            return list(rows)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des transactions utilisateur: {e}")
            return []
    
    def close(self):
        """Ferme la connexion à Cassandra"""
        if self.cluster:
            self.cluster.shutdown()
            logger.info(" Connexion Cassandra fermée")