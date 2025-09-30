#genrator/generator.py

import argparse
import json
import time
import uuid
import random
from datetime import datetime, timedelta
from faker import Faker
from dateutil import tz
from kafka import KafkaProducer
from kafka.errors import KafkaError

fake = Faker()
FRAUD_TYPES = ("impossible_travel", "burst_small_txns", "high_amount")

COUNTRY_META = {
    "US": {"lat": 38.0, "lon": -97.0, "currency": "USD"},
    "FR": {"lat": 46.0, "lon": 2.0, "currency": "EUR"},
    "MA": {"lat": 31.0, "lon": -7.0, "currency": "MAD"},
    "ML": {"lat": 12.6, "lon": -8.0, "currency": "XOF"},
    "GB": {"lat": 54.0, "lon": -2.0, "currency": "GBP"},
    "DE": {"lat": 51.0, "lon": 10.0, "currency": "EUR"},
    "IN": {"lat": 21.0, "lon": 78.0, "currency": "INR"},
    "BR": {"lat": -10.0, "lon": -55.0, "currency": "BRL"},
    "CN": {"lat": 35.0, "lon": 103.0, "currency": "CNY"},
    "ZA": {"lat": -29.0, "lon": 24.0, "currency": "ZAR"},
}

MERCHANT_CATEGORIES = ["groceries", "electronics", "travel", "restaurants", "fuel", "pharmacy", "fashion", "gaming"]

def now_iso():
    return datetime.utcnow().replace(tzinfo=tz.tzutc()).isoformat()

def make_user_profile(uid, home_country):
    avg = round(random.uniform(10, 200), 2)
    return {
        "user_id": f"user_{uid}",
        "card_id": f"card_{uid}",
        "home_country": home_country,
        "avg_amount": avg,
        "last_tx_time": None,
        "last_tx_country": None
    }

def random_amount_for_user(avg):
    amt = random.gauss(avg, avg * 0.6)
    return round(max(0.5, amt), 2)

def build_tx(user, country=None, amount=None, is_fraud=False, fraud_type=None, timestamp=None):
    if country is None:
        country = user["home_country"] if random.random() > 0.03 else random.choice(list(COUNTRY_META.keys()))
    meta = COUNTRY_META.get(country, {"lat": 0.0, "lon": 0.0, "currency": "USD"})
    if amount is None:
        amount = random_amount_for_user(user["avg_amount"])
    txn = {
        "transaction_id": str(uuid.uuid4()),
        "timestamp": timestamp if timestamp is not None else now_iso(),
        "user_id": user["user_id"],
        "card_id": user["card_id"],
        "amount": float(amount),
        "currency": meta["currency"],
        "merchant": fake.company(),
        "merchant_category": random.choice(MERCHANT_CATEGORIES),
        "country": country,
        "city": fake.city(),
        "latitude": meta["lat"] + random.uniform(-1.0, 1.0),
        "longitude": meta["lon"] + random.uniform(-1.0, 1.0),
        "device_id": f"dev_{random.randint(1,10000)}",
        "ip_address": fake.ipv4_public(),
        "is_fraud": bool(is_fraud),
        "fraud_type": fraud_type if is_fraud else None,
        "label": 1 if is_fraud else 0
    }
    return txn

def create_users(num_users, seed=None):
    if seed:
        random.seed(seed)
    users = {}
    countries = list(COUNTRY_META.keys())
    for i in range(num_users):
        home = random.choice(countries)
        user = make_user_profile(i, home)
        users[user["user_id"]] = user
    print(f"[i] Created {len(users)} users.")
    return users

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap-server", type=str, default="localhost:29092", help="Kafka bootstrap server")
    parser.add_argument("--topic", type=str, default="transactions")
    parser.add_argument("--num-users", type=int, default=500)
    parser.add_argument("--rate", type=float, default=5.0)
    parser.add_argument("--num-transactions", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--p-impossible", type=float, default=0.002)
    parser.add_argument("--p-burst", type=float, default=0.001)
    parser.add_argument("--p-high", type=float, default=0.003)
    args = parser.parse_args()

    print(f"[i] Creating {args.num_users} users...")
    users = create_users(args.num_users, seed=args.seed)

    print(f"[i] Connecting to Kafka at {args.bootstrap_server}...")
    try:
        producer = KafkaProducer(
            bootstrap_servers=[args.bootstrap_server],
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8")
        )
        print(f"[i] Connected to Kafka at {args.bootstrap_server}, producing to topic '{args.topic}'")
    except KafkaError as e:
        print(f"[!] Kafka connection failed: {e}")
        return

    produced = 0
    try:
        while True:
            if args.num_transactions > 0 and produced >= args.num_transactions:
                print("[i] Reached target number of transactions. Exiting.")
                break

            user = random.choice(list(users.values()))
            ts = datetime.utcnow().replace(tzinfo=tz.tzutc())
            is_fraud = False
            fraud_type = None
            r = random.random()

            if r < args.p_impossible:
                country = random.choice([c for c in COUNTRY_META.keys() if c != user["home_country"]])
                last_time = user.get("last_tx_time")
                ts = ts if last_time is None else last_time + timedelta(minutes=random.uniform(1, 50))
                is_fraud = True
                fraud_type = "impossible_travel"
                txn = build_tx(user, country=country, amount=random_amount_for_user(user["avg_amount"]),
                               is_fraud=is_fraud, fraud_type=fraud_type, timestamp=ts.isoformat())
                user["last_tx_time"] = ts
                user["last_tx_country"] = country

            elif r < args.p_impossible + args.p_burst:
                burst_n = random.randint(6, 12)
                base_time = ts
                for i in range(burst_n):
                    ts_i = base_time + timedelta(seconds=i * random.uniform(0.1, 5.0))
                    amt = round(random.uniform(0.5, max(1.0, user["avg_amount"] * 0.4)), 2)
                    txn = build_tx(user, amount=amt, is_fraud=True, fraud_type="burst_small_txns", timestamp=ts_i.isoformat())
                    try:
                        producer.send(args.topic, key=user["user_id"], value=txn)
                        print(f"[+] Produced burst txn {txn['transaction_id']} user={user['user_id']} amt={amt}")
                    except KafkaError as e:
                        print(f"[!] Failed to produce burst txn: {e}")
                produced += burst_n
                user["last_tx_time"] = base_time + timedelta(seconds=burst_n)
                user["last_tx_country"] = user["home_country"]
                continue

            elif r < args.p_impossible + args.p_burst + args.p_high:
                amt = round(max(user["avg_amount"] * random.uniform(3.1, 10.0), user["avg_amount"] + 20), 2)
                txn = build_tx(user, amount=amt, is_fraud=True, fraud_type="high_amount", timestamp=ts.isoformat())

            else:
                amt = random_amount_for_user(user["avg_amount"])
                country = user["home_country"] if random.random() > 0.03 else random.choice(list(COUNTRY_META.keys()))
                txn = build_tx(user, country=country, amount=amt, is_fraud=False, fraud_type=None, timestamp=ts.isoformat())

            try:
                producer.send(args.topic, key=user["user_id"], value=txn)
                produced += 1
                print(f"[+] Produced txn {txn['transaction_id']} user={user['user_id']} amt={txn['amount']} fraud={txn['is_fraud']}")
            except KafkaError as e:
                print(f"[!] Failed to produce txn: {e}")

            if produced % 50 == 0:
                producer.flush()

            wait = random.expovariate(args.rate) if args.rate > 0 else 0.01
            time.sleep(wait)

    except KeyboardInterrupt:
        print("\n[i] Interrupted by user. Flushing remaining messages...")
    finally:
        producer.flush()
        producer.close()
        print(f"[i] Produced {produced} messages. Done.")

if __name__ == "__main__":
    main()
