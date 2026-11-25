"""Deterministic synthetic trip expense dataset generator for Trip Splitter."""

from __future__ import annotations

import csv
import datetime as dt
import json
import math
import random
from pathlib import Path
from typing import Any

from settle_oracle import write_settlement_outputs

CATEGORIES = [
    "Stay",
    "Food",
    "Drinks",
    "Fuel",
    "Transport",
    "Activities",
    "Groceries",
    "Shopping",
]

PARTIAL_SPLIT_CATEGORIES = {"Food", "Drinks", "Activities", "Shopping"}

# (min_inr, max_inr, step_inr)
CATEGORY_RANGES: dict[str, tuple[int, int, int]] = {
    "Stay": (9000, 36000, 500),
    "Food": (700, 6500, 10),
    "Drinks": (400, 4500, 10),
    "Fuel": (900, 3200, 10),
    "Transport": (300, 4500, 10),
    "Activities": (1200, 9000, 50),
    "Groceries": (250, 1800, 10),
    "Shopping": (400, 3500, 10),
}

# Category distribution for non-Stay expenses.
NON_STAY_WEIGHTS: list[tuple[str, float]] = [
    ("Food", 0.30),
    ("Drinks", 0.14),
    ("Fuel", 0.10),
    ("Transport", 0.14),
    ("Activities", 0.14),
    ("Groceries", 0.10),
    ("Shopping", 0.08),
]

DESCRIPTIONS: dict[str, dict[str, list[str]]] = {
    "Goa": {
        "Stay": ["Beachfront villa advance", "Villa balance payment"],
        "Food": [
            "Seafood dinner at Baga",
            "Fish thali lunch",
            "Goan curry & rice",
            "Beach shack breakfast",
            "Portuguese cafe brunch",
            "Tandoori grill platter",
            "Late-night burger run",
        ],
        "Drinks": [
            "Beach shack cocktails",
            "Sunset mocktails & beers",
            "Fresh coconut water round",
            "Evening craft beer pitcher",
            "Cold coffee & smoothies",
        ],
        "Fuel": ["Petrol fill-up for scooters", "Highway fuel top-up", "Scooter tank refill"],
        "Transport": [
            "Airport cab transfer",
            "Scooter rentals (3 days)",
            "Return cab to station",
            "Chapora local taxi",
        ],
        "Activities": [
            "Parasailing session",
            "Jet ski & banana boat",
            "Dolphin boat tour",
            "Scuba intro dive",
        ],
        "Groceries": [
            "Water bottles & ice box",
            "Breakfast bread & eggs",
            "Sunscreen & beach snacks",
            "Midnight chips & soda",
        ],
        "Shopping": [
            "Anjuna flea market tees",
            "Cashews & local spices",
            "Straw hats & flip-flops",
            "Handcrafted shell souvenirs",
        ],
    },
    "Manali": {
        "Stay": ["Snow-view wooden cabin", "Cabin balance settlement"],
        "Food": [
            "Himachali trout dinner",
            "Hot momos & thukpa",
            "Old Manali cafe brunch",
            "Highway dhaba lunch",
            "Woodfired pizza night",
            "Riverside Maggi & chai",
        ],
        "Drinks": [
            "Bonfire hot chocolate",
            "Ginger honey lemon tea",
            "Craft cider & beers",
            "Spiced apple juice round",
        ],
        "Fuel": ["Diesel tank full before Rohtang", "Mountain petrol refill", "Highway fuel stop"],
        "Transport": [
            "Overnight Volvo luggage drop",
            "Local cab to Solang",
            "Atal Tunnel permit & taxi",
            "Auto back from Mall Road",
        ],
        "Activities": [
            "Paragliding in Solang",
            "Snow tubing & skiing",
            "Gondola ropeway pass",
            "Guided snow trek",
        ],
        "Groceries": [
            "Trail mix & energy bars",
            "Thermos tea & biscuits",
            "Mineral water & Maggi packs",
        ],
        "Shopping": [
            "Woollen caps & gloves",
            "Kullu shawl souvenirs",
            "Thermal socks & mufflers",
        ],
    },
    "Jaipur": {
        "Stay": ["Heritage haveli booking", "Haveli final balance"],
        "Food": [
            "Rajasthani dal baati dinner",
            "Lassi & kachori breakfast",
            "Rooftop fort-view dinner",
            "Jaipur thali lunch",
            "Chai & samosa pitstop",
        ],
        "Drinks": [
            "Kesar pista lassi round",
            "Rooftop mocktails",
            "Cold brew & iced tea",
        ],
        "Fuel": ["Highway petrol fill-up", "City fuel top-up"],
        "Transport": [
            "Cab to Amer Fort",
            "Old City e-rickshaws",
            "Station pickup cab",
        ],
        "Activities": [
            "Amer Fort entry & guide",
            "Chokhi Dhani folk evening",
            "Nahargarh sunset pass",
            "Block-print workshop",
        ],
        "Groceries": [
            "Water bottles & ORS",
            "Road-trip snacks",
        ],
        "Shopping": [
            "Block-print cotton kurtas",
            "Lac bangles & mojris",
            "Blue pottery coasters",
        ],
    },
    "Kerala": {
        "Stay": ["Alleppey houseboat booking", "Backwater resort balance"],
        "Food": [
            "Sadya banana-leaf lunch",
            "Appam & stew breakfast",
            "Karimeen pollichathu dinner",
            "Malabar parotta & curry",
            "Tea garden cafe snacks",
            "Coastal seafood platter",
            "Bakery puffs & coffee",
        ],
        "Drinks": [
            "Tender coconut stop",
            "Filter coffee round",
            "Fresh lime soda & shakes",
            "Evening toddy shop drinks",
        ],
        "Fuel": ["Highway diesel refill", "Hill-climb petrol fill-up", "Return fuel top-up"],
        "Transport": [
            "Kochi airport Tempo Traveller",
            "Public backwater ferry",
            "Munnar local jeep hire",
            "Ernakulam station cab",
            "Parking & highway tolls",
        ],
        "Activities": [
            "Shikara canoe ride",
            "Kathakali evening show",
            "Periyar boat safari",
            "Tea museum tour",
            "Ayurvedic massage session",
        ],
        "Groceries": [
            "Water cans & banana chips",
            "Mosquito repellent & snacks",
            "Morning fruit basket",
        ],
        "Shopping": [
            "Cardamom & black pepper",
            "Kasavu cotton mundu",
            "Handmade coconut bowls",
            "Artisanal tea packs",
        ],
    },
    "Rishikesh": {
        "Stay": ["Riverside tent camp", "Camp balance payment"],
        "Food": [
            "Ganga-view cafe brunch",
            "Camp buffet dinner",
            "Aloo paratha breakfast",
            "Pahadi thali lunch",
            "Evening momos & soup",
        ],
        "Drinks": [
            "Ginger lemon honey tea",
            "Cold coffee at Laxman Jhula",
            "Fresh fruit juices",
        ],
        "Fuel": ["Haridwar highway petrol", "Hill fuel top-up"],
        "Transport": [
            "Shared jeep to Shivpuri",
            "Auto to Triveni Ghat",
            "Return cab to station",
        ],
        "Activities": [
            "16km white-water rafting",
            "Cliff jumping & body surfing",
            "Zipline across Ganga",
            "Neer Garh waterfall trek",
        ],
        "Groceries": [
            "Electrolytes & water",
            "Bonfire marshmallows & chips",
        ],
        "Shopping": [
            "Waterproof phone pouches",
            "Dry bags & flip-flops",
            "Rudraksha & trinkets",
        ],
    },
}

TRIP_SPECS = [
    {
        "id": "trip1",
        "name": "Goa Beach Week",
        "destination": "Goa",
        "num_expenses": 36,
        "days": 5,
        "start_date": "2026-01-10",
        "members": [
            ("t1_m1", "Aarav", "organizer"),
            ("t1_m2", "Meera", "regular"),
            ("t1_m3", "Kabir", "regular"),
            ("t1_m4", "Isha", "regular"),
            ("t1_m5", "Rohan", "driver"),
            ("t1_m6", "Tara", "forgetful"),
        ],
    },
    {
        "id": "trip2",
        "name": "Manali Snow Escape",
        "destination": "Manali",
        "num_expenses": 28,
        "days": 5,
        "start_date": "2026-02-05",
        "members": [
            ("t2_m1", "Vikram", "regular"),
            ("t2_m2", "Anaya", "organizer"),
            ("t2_m3", "Dev", "driver"),
            ("t2_m4", "Sana", "regular"),
            ("t2_m5", "Neel", "forgetful"),
        ],
    },
    {
        "id": "trip3",
        "name": "Jaipur Heritage Weekend",
        "destination": "Jaipur",
        "num_expenses": 22,
        "days": 3,
        "start_date": "2026-02-20",
        "members": [
            ("t3_m1", "Zoya", "organizer"),
            ("t3_m2", "Arjun", "driver"),
            ("t3_m3", "Pia", "regular"),
            ("t3_m4", "Yash", "forgetful"),
        ],
    },
    {
        "id": "trip4",
        "name": "Kerala Backwaters",
        "destination": "Kerala",
        "num_expenses": 40,
        "days": 6,
        "start_date": "2026-03-04",
        "members": [
            ("t4_m1", "Nikhil", "regular"),
            ("t4_m2", "Riya", "organizer"),
            ("t4_m3", "Samar", "driver"),
            ("t4_m4", "Diya", "regular"),
            ("t4_m5", "Kunal", "regular"),
            ("t4_m6", "Mira", "regular"),
            ("t4_m7", "Ishaan", "forgetful"),
        ],
    },
    {
        "id": "trip5",
        "name": "Rishikesh Rafting Trip",
        "destination": "Rishikesh",
        "num_expenses": 25,
        "days": 4,
        "start_date": "2026-03-20",
        "members": [
            ("t5_m1", "Parth", "regular"),
            ("t5_m2", "Naina", "organizer"),
            ("t5_m3", "Veer", "driver"),
            ("t5_m4", "Ria", "regular"),
            ("t5_m5", "Om", "forgetful"),
        ],
    },
]


def _round_to_step(value: float, step: int, low: int, high: int) -> int:
    rounded = int(round(value / step)) * step
    return max(low, min(high, rounded))


def _pick_amount(
    rng: random.Random,
    category: str,
    split_count: int,
    split_type: str,
    stay_index: int = 0,
    num_members: int = 5,
    num_stays: int = 1,
) -> int:
    low, high, base_step = CATEGORY_RANGES[category]
    if category == "Stay":
        # Keep Stay inside [9000, 36000] and overall Stay share around 30-40% of total spend.
        if num_stays == 1:
            raw = rng.uniform(25000, 32000 + num_members * 600)
        elif stay_index == 0:
            raw = rng.uniform(20000, 27000)
        else:
            raw = rng.uniform(10000, 14500)
    else:
        # Skew right so most daily bills are moderate with occasional splurges.
        raw = low + (high - low) * (rng.random() ** 1.75)

    # For equal splits, pick a step compatible with split_count so INR and paise agree exactly.
    step = math.lcm(base_step, split_count) if split_type == "equal" else base_step
    if step > high - low:
        step = base_step
    first = ((low + step - 1) // step) * step
    last = (high // step) * step
    if first <= last:
        candidates = range(first, last + 1, step)
        # Pick the candidate closest to raw with small jitter.
        best = min(candidates, key=lambda c: abs(c - raw))
        return best
    return _round_to_step(raw, base_step, low, high)


def _pick_exact_shares(
    rng: random.Random,
    amount: int,
    split_among: list[str],
) -> dict[str, int]:
    """Generate unequal positive integer shares summing exactly to amount."""
    n = len(split_among)
    if n < 2:
        raise ValueError("Exact split requires at least 2 members")

    while True:
        weights = [rng.uniform(0.6, 1.8) for _ in range(n)]
        total_w = sum(weights)
        # Allocate in steps of 10 INR when possible for realistic numbers, then adjust remainder.
        unit = 10 if amount >= n * 20 and amount % 10 == 0 else 1
        total_units = amount // unit
        raw_shares = [max(1, int((w / total_w) * total_units)) for w in weights]
        diff = total_units - sum(raw_shares)
        while diff != 0:
            idx = rng.randrange(n)
            if diff > 0:
                raw_shares[idx] += 1
                diff -= 1
            elif raw_shares[idx] > 1:
                raw_shares[idx] -= 1
                diff += 1
        shares = {m_id: val * unit for m_id, val in zip(split_among, raw_shares, strict=True)}
        if len(set(shares.values())) > 1 and sum(shares.values()) == amount:
            return shares


def _choose_payer(
    rng: random.Random,
    category: str,
    members: list[tuple[str, str, str]],
    forgetful_count: int,
) -> str:
    organizer_id = next(m_id for m_id, _, role in members if role == "organizer")
    driver_id = next(m_id for m_id, _, role in members if role == "driver")
    forgetful_id = next(m_id for m_id, _, role in members if role == "forgetful")

    if category == "Stay" and rng.random() < 0.85:
        return organizer_id
    if category == "Fuel" and rng.random() < 0.80:
        return driver_id

    ids: list[str] = []
    weights: list[float] = []
    for m_id, _, role in members:
        if role == "forgetful" and forgetful_count >= 2:
            continue
        ids.append(m_id)
        if role == "organizer":
            weights.append(1.3)
        elif role == "forgetful":
            weights.append(0.08)
        else:
            weights.append(1.0)
    return rng.choices(ids, weights=weights, k=1)[0]


def _choose_split_among(
    rng: random.Random,
    category: str,
    member_ids: list[str],
) -> list[str]:
    n = len(member_ids)
    if category in PARTIAL_SPLIT_CATEGORIES:
        is_partial = rng.random() < 0.50
    else:
        is_partial = category in {"Transport", "Groceries"} and rng.random() < 0.10

    if not is_partial or n <= 2:
        return list(member_ids)

    subset_size = rng.randint(2, n - 1)
    chosen = set(rng.sample(member_ids, subset_size))
    return [m_id for m_id in member_ids if m_id in chosen]


def generate_trips(seed: int = 42) -> list[dict[str, Any]]:
    """Generate the 5 deterministic hackathon sample trips."""
    random.seed(seed)
    rng = random.Random(seed)

    cat_names = [c for c, _ in NON_STAY_WEIGHTS]
    cat_weights = [w for _, w in NON_STAY_WEIGHTS]

    trips: list[dict[str, Any]] = []
    for trip_idx, spec in enumerate(TRIP_SPECS, start=1):
        destination = spec["destination"]
        members_spec = spec["members"]
        member_ids = [m_id for m_id, _, _ in members_spec]
        forgetful_id = next(m_id for m_id, _, role in members_spec if role == "forgetful")
        start = dt.date.fromisoformat(spec["start_date"])
        num_days = spec["days"]
        num_expenses = spec["num_expenses"]

        # Exactly 1 Stay expense, plus 2nd Stay with 50% chance.
        num_stays = 2 if rng.random() < 0.50 else 1
        categories_plan = ["Stay"] * num_stays + rng.choices(
            cat_names, weights=cat_weights, k=num_expenses - num_stays
        )
        # Ensure Fuel appears at least once per trip for driver realism.
        if "Fuel" not in categories_plan:
            categories_plan[-1] = "Fuel"

        # Pick ~12% exact splits (never Stay to keep Stay splits clear, or any >=2 split).
        exact_target = max(1, round(num_expenses * 0.12))
        non_stay_indices = [i for i, c in enumerate(categories_plan) if c != "Stay"]
        exact_indices = set(rng.sample(non_stay_indices, min(exact_target, len(non_stay_indices))))

        desc_counters: dict[str, int] = {}
        raw_expenses: list[dict[str, Any]] = []
        forgetful_count = 0
        stay_seen = 0

        for idx, category in enumerate(categories_plan):
            if category == "Stay":
                day_offset = 0 if stay_seen == 0 else num_days - 1
                stay_seen += 1
            else:
                day_offset = rng.randrange(num_days)
            exp_date = (start + dt.timedelta(days=day_offset)).isoformat()

            paid_by = _choose_payer(rng, category, members_spec, forgetful_count)
            if paid_by == forgetful_id:
                forgetful_count += 1

            split_among = _choose_split_among(rng, category, member_ids)
            split_type = "exact" if idx in exact_indices else "equal"
            amount = _pick_amount(
                rng,
                category,
                split_count=len(split_among),
                split_type=split_type,
                stay_index=(stay_seen - 1) if category == "Stay" else 0,
                num_members=len(member_ids),
                num_stays=num_stays,
            )

            pool = DESCRIPTIONS[destination][category]
            d_idx = desc_counters.get(category, 0)
            description = pool[d_idx % len(pool)]
            desc_counters[category] = d_idx + 1

            expense: dict[str, Any] = {
                "id": "",
                "description": description,
                "amount": amount,
                "category": category,
                "paid_by": paid_by,
                "split_type": split_type,
                "split_among": split_among,
                "date": exp_date,
            }
            if split_type == "exact":
                expense["shares"] = _pick_exact_shares(rng, amount, split_among)
            raw_expenses.append(expense)

        # Sort chronologically, keeping Stay booking first on day 1.
        raw_expenses.sort(key=lambda e: (e["date"], 0 if e["category"] == "Stay" else 1, e["category"]))
        for exp_num, expense in enumerate(raw_expenses, start=1):
            expense["id"] = f"t{trip_idx}_e{exp_num}"

        trips.append(
            {
                "id": spec["id"],
                "name": spec["name"],
                "destination": destination,
                "currency": "INR",
                "members": [{"id": m_id, "name": name} for m_id, name, _ in members_spec],
                "expenses": raw_expenses,
            }
        )

    return trips


def write_outputs(trips: list[dict[str, Any]], output_dir: Path | None = None) -> None:
    """Write trips.json and expenses.csv into data_analyst/output/."""
    out_dir = output_dir or (Path(__file__).resolve().parent / "output")
    out_dir.mkdir(parents=True, exist_ok=True)

    trips_json_path = out_dir / "trips.json"
    with trips_json_path.open("w", encoding="utf-8") as f:
        json.dump({"trips": trips}, f, indent=2)

    csv_path = out_dir / "expenses.csv"
    fieldnames = [
        "trip",
        "expense_id",
        "date",
        "description",
        "category",
        "amount_inr",
        "paid_by",
        "split_type",
        "split_among",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for trip in trips:
            id_to_name = {m["id"]: m["name"] for m in trip["members"]}
            for exp in trip["expenses"]:
                writer.writerow(
                    {
                        "trip": trip["name"],
                        "expense_id": exp["id"],
                        "date": exp["date"],
                        "description": exp["description"],
                        "category": exp["category"],
                        "amount_inr": exp["amount"],
                        "paid_by": id_to_name[exp["paid_by"]],
                        "split_type": exp["split_type"],
                        "split_among": "|".join(id_to_name[m_id] for m_id in exp["split_among"]),
                    }
                )


def main() -> None:
    trips = generate_trips(seed=42)
    out_dir = Path(__file__).resolve().parent / "output"
    write_outputs(trips, output_dir=out_dir)
    write_settlement_outputs(trips_path=out_dir / "trips.json", output_dir=out_dir)
    total_expenses = sum(len(t["expenses"]) for t in trips)
    total_inr = sum(e["amount"] for t in trips for e in t["expenses"])
    print(f"Generated {len(trips)} trips, {total_expenses} expenses, total INR {total_inr:,}")


if __name__ == "__main__":
    main()
