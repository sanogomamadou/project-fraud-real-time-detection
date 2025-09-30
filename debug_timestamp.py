from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, current_timestamp
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, BooleanType
import json

def debug_timestamps():
    spark = SparkSession.builder \
        .appName("TimestampDebug") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.0") \
        .getOrCreate()
    
    # Schéma identique à votre application
    transaction_schema = StructType([
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
    
    # Lire depuis Kafka
    kafka_df = spark \
        .read \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "kafka:9092") \
        .option("subscribe", "transactions") \
        .option("startingOffsets", "earliest") \
        .load()
    
    # Parser les messages
    parsed_df = kafka_df.select(
        from_json(col("value").cast("string"), transaction_schema).alias("data")
    ).select("data.*")
    
    print("=== ANALYSE DES DONNÉES KAFKA ===")
    print(f"Nombre total de messages: {parsed_df.count()}")
    
    # Analyser la colonne timestamp
    timestamp_analysis = parsed_df.select(
        col("timestamp"),
        col("transaction_id")
    ).limit(20)
    
    print("\n=== VALEURS TIMESTAMP BRUTES ===")
    for row in timestamp_analysis.collect():
        print(f"Transaction: {row.transaction_id}")
        print(f"Timestamp brut: '{row.timestamp}'")
        print(f"Type: {type(row.timestamp)}")
        print(f"Est NULL: {row.timestamp is None}")
        print(f"Est vide: {row.timestamp == '' if row.timestamp else 'N/A'}")
        print("---")
    
    # Vérifier quelques messages bruts
    print("\n=== MESSAGES JSON BRUTS ===")
    raw_samples = kafka_df.select(
        col("value").cast("string")
    ).limit(5)
    
    for row in raw_samples.collect():
        try:
            data = json.loads(row.value)
            print(f"Timestamp dans JSON: {data.get('timestamp')}")
            print(f"Format complet: {json.dumps(data, indent=2)}")
            print("---")
        except Exception as e:
            print(f"Erreur parsing JSON: {e}")
            print(f"Message brut: {row.value}")
            print("---")
    
    spark.stop()

if __name__ == "__main__":
    debug_timestamps()