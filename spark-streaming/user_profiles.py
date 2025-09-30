# spark-streaming/user_profiles.py
import json
import logging
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType
from pyspark.sql.functions import col, broadcast, sum as spark_sum, avg as spark_avg

# Configuration du logger
logger = logging.getLogger("UserProfileManager")

class UserProfileManager:
    """
    Gère le chargement et l'accès aux profils utilisateurs pour l'enrichissement
    """
    
    def __init__(self, spark_session, user_profiles_path):
        self.spark = spark_session
        self.user_profiles_path = user_profiles_path
        self.user_profiles_df = None
        logger.info(f"  Initialisation UserProfileManager avec chemin: {user_profiles_path}")
        self._load_user_profiles()
    
    def _load_user_profiles(self):
        """Charge les profils utilisateurs depuis le fichier JSON"""
        try:
            logger.info("Début du chargement des profils utilisateurs")
            
            # Vérification de l'existence du fichier
            import os
            logger.info(f"Vérification du fichier: {self.user_profiles_path}")
            logger.info(f"Fichier existe: {os.path.exists(self.user_profiles_path)}")
            
            if os.path.exists(self.user_profiles_path):
                file_size = os.path.getsize(self.user_profiles_path)
                logger.info(f"  Taille du fichier: {file_size} bytes")
            else:
                logger.error("  FICHIER INTROUVABLE!")
                return

            # Définition du schéma pour les profils utilisateurs
            user_schema = StructType([
                StructField("user_id", StringType(), True),
                StructField("card_id", StringType(), True),
                StructField("home_country", StringType(), True),
                StructField("avg_amount", DoubleType(), True),
                StructField("risk_score", DoubleType(), True)
            ])
            
            # Charge les données utilisateurs
            logger.info("Lecture du fichier JSON...")
            with open(self.user_profiles_path, 'r') as f:
                user_data = json.load(f)
            
            logger.info(f"Données brutes chargées, clés: {list(user_data.keys())[:5]}...")
            logger.info(f"  Nombre d'utilisateurs dans le fichier: {len(user_data)}")
            
            # Convertit le dictionnaire en liste de valeurs
            user_list = list(user_data.values())
            logger.info(f"Liste utilisateurs créée, taille: {len(user_list)}")
            
            # Affiche quelques exemples pour debug
            if user_list:
                logger.info(" Exemples de profils utilisateurs:")
                for i, user in enumerate(user_list[:3]):
                    logger.info(f"   User {i}: {user}")
            
            # Crée le DataFrame Spark
            logger.info(" Création du DataFrame Spark...")
            self.user_profiles_df = self.spark.createDataFrame(user_list, schema=user_schema)
            
            # LOGS DE DEBUG COMPLETS
            logger.info("=" * 60)
            logger.info("  DEBUG USER PROFILES DATAFRAME")
            logger.info("=" * 60)
            logger.info(f"  DataFrame créé avec {self.user_profiles_df.count()} lignes")
            
            # Affiche le schéma
            logger.info("Schéma du DataFrame:")
            self.user_profiles_df.printSchema()
            
            # Affiche les données
            logger.info("Contenu du DataFrame (premières 10 lignes):")
            self.user_profiles_df.show(10, truncate=False)
            
            # Compte les user_id uniques
            unique_users = self.user_profiles_df.select("user_id").distinct().count()
            logger.info(f"User IDs uniques: {unique_users}")
            
            # Statistiques sur les colonnes importantes
            if self.user_profiles_df.count() > 0:
                logger.info("  Statistiques des profils utilisateurs:")
                self.user_profiles_df.select(
                    "home_country", "avg_amount", "risk_score"
                ).describe().show()
            
            logger.info(f" Chargé {self.user_profiles_df.count()} profils utilisateurs")
            
        except Exception as e:
            logger.error(f"  Erreur lors du chargement des profils: {e}")
            import traceback
            logger.error(f"Stack trace: {traceback.format_exc()}")
            # Crée un DataFrame vide avec le bon schéma en cas d'erreur
            self.user_profiles_df = self.spark.createDataFrame([], user_schema)
    
    def enrich_transactions_with_user_data(self, transactions_df):
        
        logger.info("Début de l'enrichissement des transactions")
        
        if self.user_profiles_df is None:
            logger.warning("  DataFrame utilisateurs est None")
            return transactions_df
        
        if self.user_profiles_df.count() == 0:
            logger.warning("  DataFrame utilisateurs est vide")
            return transactions_df
        
        # DEBUG: Informations sur les transactions en entrée
        logger.info("=" * 60)
        logger.info("  DEBUG TRANSACTIONS INPUT")
        logger.info("=" * 60)
        logger.info(f"Nombre de transactions: {transactions_df.count()}")
        logger.info("Schéma des transactions:")
        transactions_df.printSchema()
        
        # Affiche quelques transactions
        logger.info("Échantillon des transactions (premières 5):")
        transactions_df.select("user_id", "transaction_id", "amount", "country").show(5, truncate=False)
        
        # User IDs uniques dans les transactions
        transaction_users = transactions_df.select("user_id").distinct()
        logger.info(f" User IDs uniques dans transactions: {transaction_users.count()}")
        logger.info("Liste des user_id dans transactions:")
        transaction_users.show(10, truncate=False)
        
        base_columns = [
            "transaction_id", "timestamp", "user_id", "card_id", "amount", 
            "currency", "merchant", "merchant_category", "country", "city",
            "latitude", "longitude", "device_id", "ip_address", "is_fraud", 
            "fraud_type", "label"
        ]
        
        # Filtrer les colonnes existantes
        existing_columns = [col for col in base_columns if col in transactions_df.columns]
        logger.info(f" Colonnes sélectionnées pour nettoyage: {existing_columns}")
        clean_transactions_df = transactions_df.select(*existing_columns)
        
        # DEBUG: Informations sur les profils utilisateurs
        logger.info("=" * 60)
        logger.info("  DEBUG USER PROFILES POUR JOINTURE")
        logger.info("=" * 60)
        logger.info(f" Nombre de profils utilisateurs: {self.user_profiles_df.count()}")
        
        # User IDs uniques dans les profils
        profile_users = self.user_profiles_df.select("user_id").distinct()
        logger.info(f" User IDs uniques dans profils: {profile_users.count()}")
        logger.info(" Liste des user_id dans profils:")
        profile_users.show(10, truncate=False)
        
        # Liste des colonnes à conserver du DataFrame users
        user_columns_to_keep = ["home_country", "avg_amount", "risk_score"]
        
        # Sélectionne seulement les colonnes nécessaires du DataFrame users
        users_selected = self.user_profiles_df.select(
            "user_id",
            *[col(field).alias(f"user_{field}") for field in user_columns_to_keep]
        )
        
        logger.info(" Schéma des users sélectionnés pour jointure:")
        users_selected.printSchema()
        logger.info(" Contenu des users sélectionnés:")
        users_selected.show(10, truncate=False)
        
        # DEBUG: Vérification des user_id qui vont matcher
        transaction_user_ids = [row.user_id for row in clean_transactions_df.select("user_id").distinct().collect()]
        profile_user_ids = [row.user_id for row in users_selected.select("user_id").distinct().collect()]
        
        common_users = set(transaction_user_ids) & set(profile_user_ids)
        logger.info(f" User IDs en commun: {len(common_users)}")
        logger.info(f" Liste des user_ids en commun: {list(common_users)[:10]}")
        
        logger.info(" Exécution de la jointure...")
        logger.info(f" Type de jointure: left_outer")
        logger.info(f" Condition: clean_transactions_df.user_id == users_selected.user_id")
        
        enriched_df = clean_transactions_df.join(
            broadcast(users_selected),
            clean_transactions_df.user_id == users_selected.user_id,
            "left_outer"
        ).drop(users_selected.user_id)  # IMPORTANT : supprimer la colonne dupliquée
        
        # DEBUG: Résultats de la jointure
        logger.info("=" * 60)
        logger.info("  DEBUG RÉSULTATS JOINTURE")
        logger.info("=" * 60)
        logger.info(f"  Jointure terminée - DataFrame enrichi créé")
        logger.info(f" Nombre de lignes après jointure: {enriched_df.count()}")
        
        logger.info(" Schéma du DataFrame enrichi:")
        enriched_df.printSchema()
        
        logger.info(" Vérification des valeurs NULL dans les colonnes enrichies:")
        
        null_check_df = enriched_df.select([
            col("user_home_country").isNull().cast("double").alias("home_country_null"),
            col("user_avg_amount").isNull().cast("double").alias("avg_amount_null"), 
            col("user_risk_score").isNull().cast("double").alias("risk_score_null")
        ])
        
        null_stats = null_check_df.agg(
            spark_avg("home_country_null").alias("pct_home_country_null"),
            spark_avg("avg_amount_null").alias("pct_avg_amount_null"),
            spark_avg("risk_score_null").alias("pct_risk_score_null")
        ).collect()[0]
        
        logger.info(f"  Statistiques NULL:")
        logger.info(f"   user_home_country: {null_stats['pct_home_country_null']:.2%}")
        logger.info(f"   user_avg_amount: {null_stats['pct_avg_amount_null']:.2%}")
        logger.info(f"   user_risk_score: {null_stats['pct_risk_score_null']:.2%}")
        
        # Afficher des exemples de données enrichies
        logger.info(" Exemples de données enrichies (premières 10 lignes):")
        enriched_df.select(
            "user_id", "transaction_id", "amount", "country",
            "user_home_country", "user_avg_amount", "user_risk_score"
        ).show(10, truncate=False)
        
        # Compter les jointures réussies vs échouées
        successful_joins = enriched_df.filter(col("user_home_country").isNotNull()).count()
        failed_joins = enriched_df.filter(col("user_home_country").isNull()).count()
        
        logger.info(f" Résumé jointure: {successful_joins} réussies, {failed_joins} échouées")
        
        logger.info("  Enrichissement terminé")
        return enriched_df