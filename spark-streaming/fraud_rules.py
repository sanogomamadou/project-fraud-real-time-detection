# spark-streaming/fraud_rules.py
from pyspark.sql.functions import col, when, sum as spark_sum, count as spark_count, window

class FraudRulesEngine:
    """
    Moteur de règles de détection de fraude
    """

    def apply_business_rules(self, transactions_df):
        """
        Applique les règles métier de détection de fraude
        """
        high_amount_rule = (
            (col("amount") > col("user_avg_amount") * 3) &
            col("user_avg_amount").isNotNull()
        )

        foreign_country_rule = (
            (col("country") != col("user_home_country")) &
            col("user_home_country").isNotNull()
        )

        high_risk_rule = col("user_risk_score") > 0.7

        is_suspicious = high_amount_rule | foreign_country_rule | high_risk_rule

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

    def apply_windowed_aggregations(
        self,
        transactions_df,
        window_duration="10 minutes",
        slide_duration="1 minute"
    ):
        """
        Calcule les agrégations par fenêtre glissante
        """
        windowed_df = (
            transactions_df
            .withWatermark("timestamp", "2 minutes")
            .groupBy(
                window(col("timestamp"), window_duration, slide_duration),
                col("user_id")
            )
            .agg(
                spark_count("transaction_id").alias("txn_count"),
                spark_sum("amount").alias("total_amount"),
                spark_sum(when(col("is_suspicious"), 1).otherwise(0)).alias("suspicious_count")
            )
        )

        burst_detection_df = windowed_df.withColumn(
            "burst_alert",
            when(col("txn_count") > 5, True).otherwise(False)
        )

        return burst_detection_df
