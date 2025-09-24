#!/usr/bin/env python3
"""
Application Spark Streaming pour la détection de fraude en temps réel
"""

import os
import yaml
import json
from datetime import datetime
from pathlib import Path

from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, BooleanType, TimestampType
from pyspark.sql.functions import from_json, col, to_timestamp

from user_profiles import UserProfileManager
from fraud_rules import FraudRulesEngine

# Configuration Python pour Spark sur Windows
os.environ['PYSPARK_PYTHON'] = 'python'
os.environ['PYSPARK_DRIVER_PYTHON'] = 'python'

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
        """Crée et configure la session Spark"""
        spark_config = self.config['spark']['config']
        
        # Obtient le chemin vers Python
        import sys
        python_executable = sys.executable
        
        self.spark = SparkSession.builder \
            .appName(self.config['spark']['app']['name']) \
            .master(self.config['spark']['master']) \
            .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.0") \
            .config("spark.sql.adaptive.enabled", spark_config['spark.sql.adaptive.enabled']) \
            .config("spark.sql.adaptive.coalescePartitions.enabled", spark_config['spark.sql.adaptive.coalescePartitions.enabled']) \
            .config("spark.serializer", spark_config['spark.serializer']) \
            .config("spark.streaming.backpressure.enabled", spark_config['spark.streaming.backpressure.enabled']) \
            .config("spark.pyspark.python", python_executable) \
            .config("spark.pyspark.driver.python", python_executable) \
            .getOrCreate()
        
        # Configure le niveau de logging pour réduire le bruit
        self.spark.sparkContext.setLogLevel("WARN")
        
        print(f"[Spark] Session Spark créée avec succès, utilisant Python: {python_executable}")
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
    
    def start_streaming(self):
        """Démarre le streaming Spark"""
        try:
            # Crée la session Spark
            self.create_spark_session()
            
            # Dans Docker, le chemin est différent
            project_root = "/opt/workspace"  # Chemin dans le conteneur
            user_profiles_path = f"{project_root}/data/user_profiles.json"
            config_path = f"{project_root}/spark-streaming/config/spark_config.yaml"
            
            print(f"[Docker] Chargement de la configuration depuis: {config_path}")
            print(f"[Docker] Chargement des profils depuis: {user_profiles_path}")
            
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
            
            print("[Spark] Connexion à Kafka établie")
            
            # Parse les messages JSON
            parsed_transactions_df = kafka_stream_df \
                .select(
                    col("key").cast("string").alias("user_id"),
                    from_json(col("value").cast("string"), transaction_schema).alias("data")
                ) \
                .select("user_id", "data.*") \
                .withColumn("timestamp", to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
            
            print("[Spark] Données Kafka parsées avec succès")
            
            # Enrichissement avec les données utilisateur
            enriched_df = self.user_profile_manager.enrich_transactions_with_user_data(parsed_transactions_df)
            print("[Spark] Données enrichies avec les profils utilisateurs")
            
            # Application des règles de fraude
            fraud_checked_df = self.fraud_rules_engine.apply_business_rules(enriched_df)
            print("[Spark] Règles de fraude appliquées")
            
            # Agrégations par fenêtre (pour l'instant juste un log)
            print("[Spark] Prêt pour les agrégations par fenêtre")
            
            # Sortie console pour le débogage (simplifiée pour tester)
            console_query = fraud_checked_df \
                .writeStream \
                .outputMode("append") \
                .format("console") \
                .option("truncate", "false") \
                .start()
            
            print("[Spark] Streaming démarré. Attente des données...")
            
            # Attend la terminaison de la requête
            console_query.awaitTermination()
            
        except Exception as e:
            print(f"[Spark] Erreur lors du streaming: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.spark:
                self.spark.stop()
                print("[Spark] Session Spark arrêtée")

def main():
    """Point d'entrée principal"""
    # Obtient le chemin absolu du fichier de configuration
    project_root = Path(__file__).parent.parent.absolute()
    config_path = project_root / "spark-streaming" / "config" / "spark_config.yaml"
    
    # Vérifie que le fichier de configuration existe
    if not os.path.exists(config_path):
        print(f"Erreur: Fichier de configuration {config_path} introuvable")
        return
    
    print(f"[Config] Chargement de la configuration depuis: {config_path}")
    
    # Démarre l'application de streaming
    fraud_detection = FraudDetectionStreaming(str(config_path))
    fraud_detection.start_streaming()

if __name__ == "__main__":
    main()