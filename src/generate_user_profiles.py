# src/generate_user_profiles.py
import json
import random

def generate_complete_user_profiles(num_users=500, output_file="data/user_profiles.json"):
    """Génère un fichier complet de profils utilisateurs"""
    countries = ["US", "FR", "MA", "ML", "GB", "DE", "IN", "BR", "CN", "ZA"]
    
    user_profiles = {}
    for i in range(num_users):
        user_id = f"user_{i}"
        user_profiles[user_id] = {
            "user_id": user_id,
            "card_id": f"card_{i}",
            "home_country": random.choice(countries),
            "avg_amount": round(random.uniform(10, 200), 2),
            "risk_score": round(random.uniform(0.0, 1.0), 2)
        }
    
    with open(output_file, 'w') as f:
        json.dump(user_profiles, f, indent=2)
    
    print(f"  Généré {num_users} profils utilisateurs dans {output_file}")

if __name__ == "__main__":
    generate_complete_user_profiles(500)