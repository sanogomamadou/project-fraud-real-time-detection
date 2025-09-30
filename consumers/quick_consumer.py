# consumers/quick_consumer.py

import json
from kafka import KafkaConsumer
from colorama import Fore, Style, init

# Initialisation colorama pour les couleurs dans le terminal
init(autoreset=True)

consumer = KafkaConsumer(
    'transactions',                
    bootstrap_servers='localhost:29092',
    auto_offset_reset='earliest',  
    group_id='fraud-test-group',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))  
)

print("[i] En attente des transactions… Ctrl+C pour quitter.\n")

for message in consumer:
    txn = message.value
    fraud_flag = txn.get("is_fraud", False)
    fraud_type = txn.get("fraud_type", "None")

    color = Fore.RED if fraud_flag else Fore.GREEN

    print(f"{color}Transaction ID: {txn['transaction_id']}")
    print(f"  User ID    : {txn['user_id']}")
    print(f"  Amount     : {txn['amount']} {txn['currency']}")
    print(f"  Country    : {txn['country']}, City: {txn['city']}")
    print(f"  Merchant   : {txn['merchant']} ({txn['merchant_category']})")
    print(f"  Timestamp  : {txn['timestamp']}")
    print(f"  Fraud      : {fraud_flag} ({fraud_type})")
    print(Style.DIM + "-"*60)
