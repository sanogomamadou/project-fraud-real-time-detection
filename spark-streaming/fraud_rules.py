from pyspark.sql.functions import col, udf, when, lit, sum as spark_sum, count as spark_count, window
from pyspark.sql.types import BooleanType, StringType, StructType, StructField
from datetime import datetime, timedelta

class FraudRulesEngine:
    """
    Moteur de règles de détection de fraude
    """
    
    def __init__(self):
        self.fraud_reasons = []
    
    def apply_business_rules(self, transactions_df):
        """
        Applique les règles métier de détection de fraude
        """
        # Règle 1: Montant > 3x la moyenne de l'utilisateur
        high_amount_rule = (col("amount") > col("user_avg_amount") * 3) & (col("user_avg_amount").isNotNull())
        
        # Règle 2: Transaction dans un pays différent du pays de résidence
        foreign_country_rule = (col("country") != col("user_home_country")) & (col("user_home_country").isNotNull())
        
        # Règle 3: Score de risque utilisateur élevé
        high_risk_rule = col("user_risk_score") > 0.7
        
        # Combine toutes les règles
        is_suspicious = high_amount_rule | foreign_country_rule | high_risk_rule
        
        # Ajoute les colonnes de détection
        result_df = transactions_df.withColumn(
            "is_suspicious", 
            when(is_suspicious, True).otherwise(False)
        ).withColumn(
            "suspicion_reason",
            when(high_amount_rule, "high_amount")
            .when(foreign_country_rule, "foreign_country")
            .when(high_risk_rule, "high_risk_score")
            .otherwise("none")
        )
        
        return result_df
    
    def apply_windowed_aggregations(self, transactions_df, window_duration="10 minutes", slide_duration="1 minute"):
        """
        Calcule les agrégations par fenêtre glissante
        """
        windowed_df = transactions_df \
            .withWatermark("timestamp", "2 minutes") \
            .groupBy(
                window(col("timestamp"), window_duration, slide_duration),
                col("user_id")
            ) \
            .agg(
                spark_count("transaction_id").alias("txn_count"),
                spark_sum("amount").alias("total_amount"),
                spark_sum(when(col("is_suspicious"), 1).otherwise(0)).alias("suspicious_count")
            )
        
        # Détection de rafale de transactions (>5 en 10 minutes)
        burst_detection_df = windowed_df.withColumn(
            "burst_alert",
            when(col("txn_count") > 5, True).otherwise(False)
        )
        
        return burst_detection_df