"""Compute overall and per-trip analytics, write insights.json and INSIGHTS.md."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from settle_oracle import compute_trip_balances, settle_minimum


def analyze_trips(trips: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute overall and per-trip insights from trips data."""
    overall_cat_totals: dict[str, int] = defaultdict(int)
    payer_stats: dict[str, dict[str, Any]] = {}
    total_expenses = 0
    total_inr = 0

    per_trip: list[dict[str, Any]] = []

    for trip in trips:
        members = trip["members"]
        expenses = trip["expenses"]
        id_to_name = {m["id"]: m["name"] for m in members}
        n_members = len(members)
        n_expenses = len(expenses)
        trip_total = sum(int(e["amount"]) for e in expenses)
        total_expenses += n_expenses
        total_inr += trip_total

        trip_cat_totals: dict[str, int] = defaultdict(int)
        trip_payer_counts: dict[str, int] = {m["id"]: 0 for m in members}
        trip_payer_amounts: dict[str, int] = {m["id"]: 0 for m in members}
        partial_splits = 0
        biggest_exp: dict[str, Any] | None = None

        for exp in expenses:
            amt = int(exp["amount"])
            cat = exp["category"]
            payer_id = exp["paid_by"]

            overall_cat_totals[cat] += amt
            trip_cat_totals[cat] += amt
            trip_payer_counts[payer_id] += 1
            trip_payer_amounts[payer_id] += amt

            if payer_id not in payer_stats:
                payer_stats[payer_id] = {
                    "member_id": payer_id,
                    "name": id_to_name[payer_id],
                    "trip": trip["name"],
                    "expenses_paid": 0,
                    "paid_inr": 0,
                }
            payer_stats[payer_id]["expenses_paid"] += 1
            payer_stats[payer_id]["paid_inr"] += amt

            if len(exp["split_among"]) < n_members:
                partial_splits += 1

            if biggest_exp is None or amt > biggest_exp["amount_inr"]:
                biggest_exp = {
                    "id": exp["id"],
                    "description": exp["description"],
                    "category": cat,
                    "amount_inr": amt,
                    "paid_by": id_to_name[payer_id],
                }

        # Include members with 0 expenses in overall payer stats as well.
        for m in members:
            if m["id"] not in payer_stats:
                payer_stats[m["id"]] = {
                    "member_id": m["id"],
                    "name": m["name"],
                    "trip": trip["name"],
                    "expenses_paid": 0,
                    "paid_inr": 0,
                }

        sorted_cats = sorted(trip_cat_totals.items(), key=lambda item: (-item[1], item[0]))
        top_categories = [
            {
                "category": cat,
                "total": total,
                "pct": round((total / trip_total) * 100, 1) if trip_total else 0.0,
            }
            for cat, total in sorted_cats[:3]
        ]

        most_freq_id = max(
            trip_payer_counts,
            key=lambda m_id: (trip_payer_counts[m_id], trip_payer_amounts[m_id], m_id),
        )
        biggest_spender_id = max(
            trip_payer_amounts,
            key=lambda m_id: (trip_payer_amounts[m_id], trip_payer_counts[m_id], m_id),
        )
        least_freq_id = min(
            trip_payer_counts,
            key=lambda m_id: (trip_payer_counts[m_id], trip_payer_amounts[m_id], m_id),
        )

        balances = compute_trip_balances(trip, by_name=True)
        min_payments = settle_minimum(balances)
        naive_payments = (n_members * (n_members - 1)) // 2

        per_trip.append(
            {
                "trip": trip["name"],
                "members": n_members,
                "expenses": n_expenses,
                "total_inr": trip_total,
                "per_person_inr": round(trip_total / n_members),
                "top_categories": top_categories,
                "most_frequent_payer": {
                    "name": id_to_name[most_freq_id],
                    "expenses_paid": trip_payer_counts[most_freq_id],
                },
                "biggest_spender": {
                    "name": id_to_name[biggest_spender_id],
                    "paid_inr": trip_payer_amounts[biggest_spender_id],
                },
                "least_frequent_payer": {
                    "name": id_to_name[least_freq_id],
                    "expenses_paid": trip_payer_counts[least_freq_id],
                },
                "partial_split_pct": round((partial_splits / n_expenses) * 100, 1),
                "biggest_single_expense": biggest_exp,
                "settle_payments": len(min_payments),
                "naive_payments": naive_payments,
            }
        )

    category_ranking = [
        {
            "category": cat,
            "total": total,
            "pct": round((total / total_inr) * 100, 1) if total_inr else 0.0,
        }
        for cat, total in sorted(overall_cat_totals.items(), key=lambda item: (-item[1], item[0]))
    ]

    all_payers = list(payer_stats.values())
    payers_by_count = [
        {
            "name": p["name"],
            "trip": p["trip"],
            "expenses_paid": p["expenses_paid"],
            "paid_inr": p["paid_inr"],
        }
        for p in sorted(
            all_payers, key=lambda p: (-p["expenses_paid"], -p["paid_inr"], p["name"])
        )[:5]
    ]
    payers_by_amount = [
        {
            "name": p["name"],
            "trip": p["trip"],
            "paid_inr": p["paid_inr"],
            "expenses_paid": p["expenses_paid"],
        }
        for p in sorted(
            all_payers, key=lambda p: (-p["paid_inr"], -p["expenses_paid"], p["name"])
        )[:5]
    ]

    return {
        "overall": {
            "total_expenses": total_expenses,
            "total_inr": total_inr,
            "category_ranking": category_ranking,
            "payers_by_count": payers_by_count,
            "payers_by_amount": payers_by_amount,
        },
        "per_trip": per_trip,
    }


def build_pitch_markdown(insights: dict[str, Any]) -> str:
    """Build a crisp 6-line plain-English pitch summary for INSIGHTS.md."""
    overall = insights["overall"]
    per_trip = insights["per_trip"]
    cats = overall["category_ranking"]
    top1, top2, top3 = cats[0], cats[1], cats[2]
    top_payer = overall["payers_by_count"][0]
    top_spender = overall["payers_by_amount"][0]
    least_payers = [
        f"{t['least_frequent_payer']['name']} ({t['least_frequent_payer']['expenses_paid']})"
        for t in per_trip
    ]
    naive_total = sum(t["naive_payments"] for t in per_trip)
    settle_total = sum(t["settle_payments"] for t in per_trip)
    saved = naive_total - settle_total
    avg_partial = round(sum(t["partial_split_pct"] for t in per_trip) / len(per_trip), 1)

    lines = [
        (
            f"Across 5 group trips ({overall['total_expenses']} expenses, "
            f"INR {overall['total_inr']:,} total), Trip Splitter shows how unevenly trip bills pile up."
        ),
        (
            f"The top three categories are {top1['category']} ({top1['pct']}%), "
            f"{top2['category']} ({top2['pct']}%), and {top3['category']} ({top3['pct']}%), "
            "keeping accommodation realistic without hiding daily food and activity costs."
        ),
        (
            f"{top_payer['name']} ({top_payer['trip']}) paid most often with "
            f"{top_payer['expenses_paid']} bills, while {top_spender['name']} ({top_spender['trip']}) "
            f"fronted the highest total at INR {top_spender['paid_inr']:,}."
        ),
        (
            "Every trip shows the 'forgetful friend' pattern—members who paid only 0 to 2 bills "
            f"({', '.join(least_payers)}) while still sharing daily costs."
        ),
        (
            f"Roughly {avg_partial}% of expenses per trip are partial splits among subsets of friends, "
            "proving simple even-for-all calculators get group balances wrong."
        ),
        (
            f"Instead of {naive_total} naive pairwise transfers across all 5 trips, "
            f"our settle-up reduces {naive_total} payments to {settle_total} "
            f"(saving {saved} transactions)."
        ),
    ]
    return "\n".join(lines) + "\n"


def print_summary(insights: dict[str, Any]) -> None:
    """Print a readable terminal summary of the trip analytics."""
    overall = insights["overall"]
    print("=== TRIP SPLITTER ANALYTICS SUMMARY ===")
    print(f"Total expenses: {overall['total_expenses']} | Total spend: INR {overall['total_inr']:,}")
    print("\nCategory Ranking:")
    for row in overall["category_ranking"]:
        print(f"  - {row['category']:<12} INR {row['total']:>8,} ({row['pct']:>4.1f}%)")
    print("\nTop 5 Payers by Count:")
    for row in overall["payers_by_count"]:
        print(f"  - {row['name']} ({row['trip']}): {row['expenses_paid']} bills, INR {row['paid_inr']:,}")
    print("\nPer-Trip Breakdown:")
    for t in insights["per_trip"]:
        print(
            f"  - {t['trip']}: {t['members']} members, {t['expenses']} expenses, "
            f"INR {t['total_inr']:,} (INR {t['per_person_inr']:,}/person) | "
            f"partial={t['partial_split_pct']}% | "
            f"settle {t['naive_payments']} -> {t['settle_payments']} payments | "
            f"least={t['least_frequent_payer']['name']}({t['least_frequent_payer']['expenses_paid']})"
        )


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    out_dir = base_dir / "output"
    with (out_dir / "trips.json").open("r", encoding="utf-8") as f:
        data = json.load(f)

    insights = analyze_trips(data["trips"])
    with (out_dir / "insights.json").open("w", encoding="utf-8") as f:
        json.dump(insights, f, indent=2)

    pitch = build_pitch_markdown(insights)
    with (out_dir / "INSIGHTS.md").open("w", encoding="utf-8") as f:
        f.write(pitch)

    print_summary(insights)


if __name__ == "__main__":
    main()
