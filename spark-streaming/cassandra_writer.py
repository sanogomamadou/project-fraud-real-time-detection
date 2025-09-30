#spark-streaming/cassandra_writer.py
from pyspark.sql.functions import current_timestamp, lit, col, date_format
import logging

class CassandraWriter:
    
    def __init__(self, spark_session):
        self.spark = spark_session
        self.logger = logging.getLogger("CassandraWriter")
        
        # Configuration Cassandra
        self._setup_cassandra_config()
    
    def _setup_cassandra_config(self):
        """Configure la connexion Cassandra"""
        try:
            self.spark.conf.set("spark.cassandra.connection.host", "cassandra")
            self.spark.conf.set("spark.cassandra.connection.port", "9042")
            self.spark.conf.set("spark.cassandra.output.consistency.level", "ONE")
            self.spark.conf.set("spark.cassandra.output.concurrent.writes", "10")            
            self.logger.info("Configuration Cassandra appliquée")
        except Exception as e:
            self.logger.error(f"Erreur configuration Cassandra: {e}")
    
    def write_transactions_to_cassandra(self, transactions_df):
        
        try:
            self.logger.info(f"Colonnes du DataFrame: {transactions_df.columns}")
            
            columns = transactions_df.columns
            duplicate_columns = [col for col in columns if columns.count(col) > 1]
            
            if duplicate_columns:
                self.logger.warning(f"Colonnes dupliquées détectées: {duplicate_columns}")
                required_columns = [
                    "user_id", "transaction_id", "timestamp", "amount", "currency",
                    "country", "merchant", "merchant_category", "is_fraud", "fraud_type",
                    "is_suspicious", "suspicion_reason", "user_home_country",
                    "user_avg_amount", "user_risk_score", "latitude", "longitude"
                ]
                
                select_exprs = []
                for col_name in required_columns:
                    if col_name in transactions_df.columns:
                        select_exprs.append(col(col_name))
                    else:
                        self.logger.warning(f"Colonne {col_name} manquante")
                
                cassandra_transactions = transactions_df.select(*select_exprs)
            else:
                cassandra_transactions = transactions_df.select(
                    col("user_id"),
                    col("transaction_id"),
                    col("timestamp"),
                    col("amount"),
                    col("currency"),
                    col("country"),
                    col("merchant"),
                    col("merchant_category"),
                    col("is_fraud"),
                    col("fraud_type"),
                    col("is_suspicious"),
                    col("suspicion_reason"),
                    col("user_home_country"),
                    col("user_avg_amount"),
                    col("user_risk_score"),
                    col("latitude"),
                    col("longitude")
                )
        
            (cassandra_transactions.write
                .format("org.apache.spark.sql.cassandra")
                .option("spark.cassandra.connection.host", "cassandra")
                .option("spark.cassandra.connection.port", "9042")
                .options(
                    table="transactions_by_user",
                    keyspace="fraud_detection"
                )
                .mode("append")
                .save())
            
            self.logger.info(f"  Transactions écrites dans Cassandra: {cassandra_transactions.count()}")
            return True
            
        except Exception as e:
            self.logger.error(f"  Erreur écriture transactions: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def write_fraud_alerts(self, transactions_df):
        
        try:
            self.logger.info(f"Colonnes pour alertes: {transactions_df.columns}")
            
            # Vérifier que la colonne is_suspicious existe
            if "is_suspicious" not in transactions_df.columns:
                self.logger.warning("Colonne is_suspicious manquante, pas d'alertes à écrire")
                return True
                
            # Filtre les transactions suspectes
            alerts_df = transactions_df.filter(col("is_suspicious") == True)
            
            if alerts_df.count() > 0:
                # Vérifier que toutes les colonnes nécessaires existent
                required_alert_columns = ["timestamp", "transaction_id", "user_id", "amount", "country", "suspicion_reason"]
                missing_columns = [col for col in required_alert_columns if col not in alerts_df.columns]
                
                if missing_columns:
                    self.logger.warning(f"Colonnes manquantes pour alertes: {missing_columns}")
                    # Créer des colonnes par défaut pour les manquantes
                    from pyspark.sql.types import StringType, DoubleType
                    
                    for missing_col in missing_columns:
                        if missing_col == "user_id":
                            alerts_df = alerts_df.withColumn("user_id", lit("unknown"))
                        elif missing_col == "transaction_id":
                            alerts_df = alerts_df.withColumn("transaction_id", lit("unknown"))
                        elif missing_col == "amount":
                            alerts_df = alerts_df.withColumn("amount", lit(0.0))
                        elif missing_col == "country":
                            alerts_df = alerts_df.withColumn("country", lit("unknown"))
                        elif missing_col == "suspicion_reason":
                            alerts_df = alerts_df.withColumn("suspicion_reason", lit("unknown"))
                        elif missing_col == "timestamp":
                            alerts_df = alerts_df.withColumn("timestamp", current_timestamp())
                
                # Prépare les alertes
                fraud_alerts = alerts_df.select(
                    date_format(col("timestamp"), "yyyy-MM-dd").alias("alert_date"),
                    col("timestamp"),
                    col("transaction_id"),
                    col("user_id"),
                    col("amount"),
                    col("country"),
                    col("suspicion_reason"),
                    lit("HIGH").alias("alert_level"),
                    lit(False).alias("processed")
                )
                
                # Écrit les alertes
                (fraud_alerts.write
                    .format("org.apache.spark.sql.cassandra")
                    .option("spark.cassandra.connection.host", "cassandra")
                    .option("spark.cassandra.connection.port", "9042")
                    .options(
                        table="recent_fraud_alerts",
                        keyspace="fraud_detection"
                    )
                    .mode("append")
                    .save())
                
                self.logger.info(f" Alertes de fraude écrites: {fraud_alerts.count()}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"  Erreur écriture alertes: {e}")
            import traceback
            traceback.print_exc()
            return False