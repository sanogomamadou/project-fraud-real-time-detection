#spark-streaming/fraud_detection.py

import os
import yaml
import json
import logging
from datetime import datetime
from pathlib import Path

from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, BooleanType, TimestampType
from pyspark.sql.functions import from_json, col, to_timestamp

from user_profiles import UserProfileManager
from fraud_rules import FraudRulesEngine
from cassandra_writer import CassandraWriter
from pyspark.sql.functions import coalesce,current_timestamp


# Configuration Python pour Spark sur Windows
os.environ['PYSPARK_PYTHON'] = 'python'
os.environ['PYSPARK_DRIVER_PYTHON'] = 'python'

# Configure le logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FraudDetection")

class FraudDetectionStreaming:
    """
    Application principale de détection de fraude en temps réel
    """
    
    def __init__(self, config_path):
        self.config = self._load_config(config_path)
        self.spark = None
        self.user_profile_manager = None
        self.fraud_rules_engine = FraudRulesEngine()
        
    def _load_config(self, config_path):
        """Charge la configuration depuis le fichier YAML"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def create_spark_session(self):
        spark_config = self.config['spark']['config']
        
        import sys
        python_executable = sys.executable
        
        packages = [
            "org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.0",
            "com.datastax.spark:spark-cassandra-connector_2.12:3.4.0"
        ]
        
        self.spark = SparkSession.builder \
            .appName(self.config['spark']['app']['name']) \
            .master(self.config['spark']['master']) \
            .config("spark.jars.packages", ",".join(packages)) \
            .config("spark.cassandra.connection.host", "cassandra") \
            .config("spark.cassandra.connection.port", "9042") \
            .config("spark.cassandra.output.consistency.level", "ONE") \
            .config("spark.cassandra.output.concurrent.writes", "10") \
            .config("spark.sql.adaptive.enabled", spark_config['spark.sql.adaptive.enabled']) \
            .config("spark.sql.adaptive.coalescePartitions.enabled", spark_config['spark.sql.adaptive.coalescePartitions.enabled']) \
            .config("spark.serializer", spark_config['spark.serializer']) \
            .config("spark.streaming.backpressure.enabled", spark_config['spark.streaming.backpressure.enabled']) \
            .config("spark.pyspark.python", python_executable) \
            .config("spark.pyspark.driver.python", python_executable) \
            .getOrCreate()
        
        self.spark.sparkContext.setLogLevel("WARN")
        logger.info("Session Spark créée avec configuration Cassandra globale")
        return self.spark
    
    def define_transaction_schema(self):
        """Définit le schéma des transactions Kafka"""
        return StructType([
            StructField("transaction_id", StringType(), True),
            StructField("timestamp", StringType(), True),
            StructField("user_id", StringType(), True),
            StructField("card_id", StringType(), True),
            StructField("amount", DoubleType(), True),
            StructField("currency", StringType(), True),
            StructField("merchant", StringType(), True),
            StructField("merchant_category", StringType(), True),
            StructField("country", StringType(), True),
            StructField("city", StringType(), True),
            StructField("latitude", DoubleType(), True),
            StructField("longitude", DoubleType(), True),
            StructField("device_id", StringType(), True),
            StructField("ip_address", StringType(), True),
            StructField("is_fraud", BooleanType(), True),
            StructField("fraud_type", StringType(), True),
            StructField("label", DoubleType(), True)
        ])
    
    def process_batch_with_cassandra(self, batch_df, batch_id):
    
        try:
            logger.info(f"  Traitement du batch {batch_id} : {batch_df.count()} transactions")
            
            # DEBUG: Afficher les colonnes pour diagnostic
            logger.info(f"  Colonnes du batch {batch_id}: {batch_df.columns}")
            
            if batch_df.count() > 0:
                # Vérifier les colonnes dupliquées
                columns = batch_df.columns
                duplicate_columns = [col for col in columns if columns.count(col) > 1]
                if duplicate_columns:
                    logger.warning(f"   Colonnes dupliquées détectées: {duplicate_columns}")
                    # Nettoyer les doublons en gardant la première occurrence
                    unique_columns = []
                    seen_columns = set()
                    for col_name in columns:
                        if col_name not in seen_columns:
                            unique_columns.append(col_name)
                            seen_columns.add(col_name)
                    batch_df = batch_df.select(*unique_columns)
                    logger.info(f"  DataFrame nettoyé. Nouvelles colonnes: {batch_df.columns}")
                
                # Enrichissement avec les données utilisateur
                enriched_df = self.user_profile_manager.enrich_transactions_with_user_data(batch_df)
                logger.info(f"  Colonnes après enrichissement: {enriched_df.columns}")
                
                # Application des règles de fraude
                fraud_checked_df = self.fraud_rules_engine.apply_business_rules(enriched_df)
                logger.info(f"  Colonnes après règles de fraude: {fraud_checked_df.columns}")
                
                # Vérifier une dernière fois les doublons
                final_columns = fraud_checked_df.columns
                final_duplicates = [col for col in final_columns if final_columns.count(col) > 1]
                if final_duplicates:
                    logger.error(f"  COLONNES DUPLIQUÉES PERSISTANTES: {final_duplicates}")
                    required_columns = [
                        "user_id", "transaction_id", "timestamp", "amount", "currency",
                        "country", "merchant", "merchant_category", "is_fraud", "fraud_type",
                        "is_suspicious", "suspicion_reason", "user_home_country",
                        "user_avg_amount", "user_risk_score", "latitude", "longitude"
                    ]
                    select_exprs = [col(c) for c in required_columns if c in fraud_checked_df.columns]
                    fraud_checked_df = fraud_checked_df.select(*select_exprs)
                
                # Écriture dans Cassandra
                cassandra_writer = CassandraWriter(self.spark)
                success1 = cassandra_writer.write_transactions_to_cassandra(fraud_checked_df)
                success2 = cassandra_writer.write_fraud_alerts(fraud_checked_df)
                
                if success1 and success2:
                    logger.info(f"  Batch {batch_id} traité et écrit dans Cassandra")
                else:
                    logger.error(f"  Batch {batch_id} partiellement écrit dans Cassandra")
            else:
                logger.info(f" Batch {batch_id} vide, ignoré")
                
        except Exception as e:
            logger.error(f"  Erreur lors du traitement du batch {batch_id}: {e}")
            import traceback
            traceback.print_exc()
    
    def start_streaming(self):
        """Démarre le streaming Spark avec intégration Cassandra"""
        try:
            # Crée la session Spark
            self.create_spark_session()
            
            project_root = "/opt/workspace"  
            user_profiles_path = f"{project_root}/data/user_profiles.json"
            config_path = f"{project_root}/spark-streaming/config/spark_config.yaml"
            
            logger.info(f"Chargement de la configuration depuis: {config_path}")
            logger.info(f"Chargement des profils depuis: {user_profiles_path}")
            
            # Recharge la config avec le bon chemin
            self.config = self._load_config(config_path)
            
            # Initialise le gestionnaire de profils utilisateurs
            self.user_profile_manager = UserProfileManager(
                self.spark, 
                user_profiles_path
            )
            
            # Schéma des transactions
            transaction_schema = self.define_transaction_schema()
            
            # Lecture du stream Kafka
            kafka_stream_df = self.spark \
                .readStream \
                .format("kafka") \
                .option("kafka.bootstrap.servers", self.config['spark']['kafka']['bootstrap.servers']) \
                .option("subscribe", "transactions") \
                .option("startingOffsets", self.config['spark']['kafka']['startingOffsets']) \
                .option("failOnDataLoss", self.config['spark']['kafka']['failOnDataLoss']) \
                .load()
            
            logger.info("Connexion à Kafka établie")
            
            # Parse les messages JSON
            parsed_transactions_df = kafka_stream_df \
                .select(
                    from_json(col("value").cast("string"), transaction_schema).alias("data")
                ) \
                .select("data.*") \
                .withColumn("timestamp", 
                coalesce(
                    to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ssXXX"),
                    current_timestamp() 
                ))
            
            logger.info("Données Kafka parsées avec succès")
            
            # Traitement par micro-batches avec Cassandra
            query = parsed_transactions_df \
                .writeStream \
                .outputMode("update") \
                .foreachBatch(self.process_batch_with_cassandra) \
                .option("checkpointLocation", "/tmp/checkpoints/cassandra") \
                .start()
            
            logger.info(" Application Spark Streaming avec Cassandra démarrée")
            
            # Console output pour debug
            console_query = parsed_transactions_df \
                .writeStream \
                .outputMode("append") \
                .format("console") \
                .option("truncate", "false") \
                .start()
            
            query.awaitTermination()
            console_query.awaitTermination()
            
        except Exception as e:
            logger.error(f"  Erreur lors du streaming: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.spark:
                self.spark.stop()
                logger.info(" Session Spark arrêtée")

def main():
    """Point d'entrée principal"""
    project_root = Path(__file__).parent.parent.absolute()
    config_path = project_root / "spark-streaming" / "config" / "spark_config.yaml"
    
    if not os.path.exists(config_path):
        logger.error(f"Fichier de configuration {config_path} introuvable")
        return
    
    logger.info(f"Chargement de la configuration depuis: {config_path}")
    
    fraud_detection = FraudDetectionStreaming(str(config_path))
    fraud_detection.start_streaming()

if __name__ == "__main__":
    main()