#spark-streaming/user_profiles.py
import json
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType
from pyspark.sql.functions import col, broadcast

class UserProfileManager:
    """
    Gère le chargement et l'accès aux profils utilisateurs pour l'enrichissement
    """
    
    def __init__(self, spark_session, user_profiles_path):
        self.spark = spark_session
        self.user_profiles_path = user_profiles_path
        self.user_profiles_df = None
        self._load_user_profiles()
    
    def _load_user_profiles(self):
        """Charge les profils utilisateurs depuis le fichier JSON"""
        try:
            # Définition du schéma pour les profils utilisateurs
            user_schema = StructType([
                StructField("user_id", StringType(), True),
                StructField("card_id", StringType(), True),
                StructField("home_country", StringType(), True),
                StructField("avg_amount", DoubleType(), True),
                StructField("risk_score", DoubleType(), True)
            ])
            
            # Charge les données utilisateurs
            with open(self.user_profiles_path, 'r') as f:
                user_data = json.load(f)
            
            # Convertit le dictionnaire en liste de valeurs
            user_list = list(user_data.values())
            
            # Crée le DataFrame Spark
            self.user_profiles_df = self.spark.createDataFrame(user_list, schema=user_schema)
            
            print(f"[UserProfileManager] Chargé {self.user_profiles_df.count()} profils utilisateurs")
            
        except Exception as e:
            print(f"[UserProfileManager] Erreur lors du chargement des profils: {e}")
            # Crée un DataFrame vide avec le bon schéma en cas d'erreur
            self.user_profiles_df = self.spark.createDataFrame([], user_schema)
    
    def enrich_transactions_with_user_data(self, transactions_df):
        """
        Enrichit les transactions avec les données utilisateur - VERSION CORRIGÉE
        """
        if self.user_profiles_df is None:
            return transactions_df
        
        # CORRECTION : Supprimer les colonnes potentiellement problématiques avant la jointure
        # Garder seulement les colonnes de base des transactions
        base_columns = [
            "transaction_id", "timestamp", "user_id", "card_id", "amount", 
            "currency", "merchant", "merchant_category", "country", "city",
            "latitude", "longitude", "device_id", "ip_address", "is_fraud", 
            "fraud_type", "label"
        ]
        
        # Filtrer les colonnes existantes
        existing_columns = [col for col in base_columns if col in transactions_df.columns]
        clean_transactions_df = transactions_df.select(*existing_columns)
        
        # Liste des colonnes à conserver du DataFrame users
        user_columns_to_keep = ["home_country", "avg_amount", "risk_score"]
        
        # Sélectionne seulement les colonnes nécessaires du DataFrame users
        users_selected = self.user_profiles_df.select(
            "user_id",
            *[col(field).alias(f"user_{field}") for field in user_columns_to_keep]
        )
        
        # Jointure simple - CORRECTION : utiliser la colonne user_id existante
        enriched_df = clean_transactions_df.join(
            broadcast(users_selected),
            clean_transactions_df.user_id == users_selected.user_id,
            "left_outer"
        ).drop(users_selected.user_id)  # IMPORTANT : supprimer la colonne dupliquée
        
        return enriched_df