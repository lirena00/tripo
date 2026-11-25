"""Plain-assert verification suite for Trip Splitter data analyst outputs."""

from __future__ import annotations

import csv
import datetime as dt
import json
from pathlib import Path

from generate_trips import CATEGORIES, TRIP_SPECS
from settle_oracle import (
    build_demo_gate_trip,
    compute_equal_shares,
    compute_expense_shares,
    compute_trip_balances,
    settle_minimum,
)

ALLOWED_CATEGORIES = set(CATEGORIES)


def _assert_is_int(val: object, label: str) -> None:
    assert isinstance(val, int) and not isinstance(val, bool), (
        f"{label} must be int (no floats/bools), got {type(val).__name__}: {val!r}"
    )


def test_trips_json_and_csv() -> None:
    base_dir = Path(__file__).resolve().parent
    out_dir = base_dir / "output"

    trips_data = json.loads((out_dir / "trips.json").read_text(encoding="utf-8"))
    trips = trips_data["trips"]
    assert len(trips) == 5, f"Expected 5 trips, got {len(trips)}"

    total_expenses = 0
    total_spend = 0
    stay_spend = 0
    exact_count = 0
    csv_rows_expected = []

    for trip, spec in zip(trips, TRIP_SPECS, strict=True):
        assert trip["id"] == spec["id"]
        assert trip["name"] == spec["name"]
        assert trip["destination"] == spec["destination"]
        assert trip["currency"] == "INR"

        members = trip["members"]
        assert len(members) == len(spec["members"])
        member_ids = [m["id"] for m in members]
        member_id_set = set(member_ids)
        assert len(member_id_set) == len(members), f"Duplicate member ids in {trip['id']}"
        id_to_name = {m["id"]: m["name"] for m in members}
        for m, (exp_id, exp_name, _) in zip(members, spec["members"], strict=True):
            assert m["id"] == exp_id
            assert m["name"] == exp_name

        expenses = trip["expenses"]
        assert 20 <= len(expenses) <= 40, f"{trip['id']} has {len(expenses)} expenses"
        assert len(expenses) == spec["num_expenses"]
        total_expenses += len(expenses)

        start = dt.date.fromisoformat(spec["start_date"])
        end = start + dt.timedelta(days=spec["days"] - 1)
        prev_date = ""
        stay_count = 0
        forgetful_id = next(m_id for m_id, _, role in spec["members"] if role == "forgetful")
        forgetful_paid = 0

        for idx, exp in enumerate(expenses, start=1):
            assert exp["id"] == f"t{spec['id'][-1]}_e{idx}"
            assert exp["category"] in ALLOWED_CATEGORIES, f"Bad category: {exp['category']}"
            _assert_is_int(exp["amount"], f"{exp['id']}.amount")
            assert exp["amount"] > 0

            assert exp["paid_by"] in member_id_set, f"Unknown paid_by {exp['paid_by']}"
            if exp["paid_by"] == forgetful_id:
                forgetful_paid += 1

            assert exp["split_type"] in {"equal", "exact"}
            split_among = exp["split_among"]
            assert len(split_among) >= 2
            assert len(set(split_among)) == len(split_among), f"Duplicate split_among in {exp['id']}"
            for m_id in split_among:
                assert m_id in member_id_set, f"Unknown member {m_id} in split_among of {exp['id']}"

            if exp["split_type"] == "exact":
                exact_count += 1
                assert "shares" in exp, f"Missing shares in exact split {exp['id']}"
                shares = exp["shares"]
                assert set(shares.keys()) == set(split_among)
                for m_id, share in shares.items():
                    assert m_id in member_id_set
                    _assert_is_int(share, f"{exp['id']}.shares[{m_id}]")
                    assert share > 0
                assert sum(shares.values()) == exp["amount"], f"Exact shares sum mismatch in {exp['id']}"
                assert len(set(shares.values())) > 1, f"Exact split should be unequal in {exp['id']}"
            else:
                assert "shares" not in exp, f"Equal split must not include shares in {exp['id']}"

            # Verify split shares in both INR and paise sum exactly to amount / amount*100.
            inr_shares = compute_expense_shares(exp, multiplier=1)
            paise_shares = compute_expense_shares(exp, multiplier=100)
            assert sum(inr_shares.values()) == exp["amount"]
            assert sum(paise_shares.values()) == exp["amount"] * 100

            exp_date = dt.date.fromisoformat(exp["date"])
            assert start <= exp_date <= end, f"Date {exp_date} out of range for {trip['id']}"
            assert exp["date"] >= prev_date, f"Expenses not sorted by date in {trip['id']}"
            prev_date = exp["date"]

            total_spend += exp["amount"]
            if exp["category"] == "Stay":
                stay_count += 1
                stay_spend += exp["amount"]

            csv_rows_expected.append(
                {
                    "trip": trip["name"],
                    "expense_id": exp["id"],
                    "date": exp["date"],
                    "description": exp["description"],
                    "category": exp["category"],
                    "amount_inr": str(exp["amount"]),
                    "paid_by": id_to_name[exp["paid_by"]],
                    "split_type": exp["split_type"],
                    "split_among": "|".join(id_to_name[m_id] for m_id in split_among),
                }
            )

        assert stay_count in {1, 2}, f"{trip['id']} stay_count={stay_count}"
        assert 0 <= forgetful_paid <= 2, f"{trip['id']} forgetful paid {forgetful_paid}"

        balances = compute_trip_balances(trip, by_name=True)
        assert sum(balances.values()) == 0, f"Balances do not sum to 0 for {trip['id']}"

    stay_pct = (stay_spend / total_spend) * 100
    assert 30.0 <= stay_pct <= 40.0, f"Stay share {stay_pct:.1f}% outside 30-40% target range"
    exact_pct = (exact_count / total_expenses) * 100
    assert 8.0 <= exact_pct <= 18.0, f"Exact split share {exact_pct:.1f}% outside ~12% target"

    with (out_dir / "expenses.csv").open("r", encoding="utf-8", newline="") as f:
        csv_rows = list(csv.DictReader(f))
    assert csv_rows == csv_rows_expected, "expenses.csv does not match trips.json"


def test_demo_gate_trip() -> None:
    gate_path = Path(__file__).resolve().parent / "output" / "demo_gate_trip.json"
    gate = json.loads(gate_path.read_text(encoding="utf-8"))
    built = build_demo_gate_trip()
    assert gate == built

    expected_balances = {"Asha": 5500, "Bilal": -1000, "Chitra": -1500, "Dhruv": -3000}
    assert gate["expected_balances"] == expected_balances, gate["expected_balances"]
    assert sum(gate["expected_balances"].values()) == 0

    expected_payments = [
        {"frm": "Dhruv", "to": "Asha", "amount": 3000},
        {"frm": "Chitra", "to": "Asha", "amount": 1500},
        {"frm": "Bilal", "to": "Asha", "amount": 1000},
    ]
    assert gate["expected_payments"] == expected_payments, gate["expected_payments"]


def test_settle_oracle_and_expected_settlements() -> None:
    out_dir = Path(__file__).resolve().parent / "output"
    trips_data = json.loads((out_dir / "trips.json").read_text(encoding="utf-8"))
    settlements_data = json.loads((out_dir / "expected_settlements.json").read_text(encoding="utf-8"))

    assert len(settlements_data["trips"]) == len(trips_data["trips"])
    for trip, entry in zip(trips_data["trips"], settlements_data["trips"], strict=True):
        balances = entry["balances"]
        payments = entry["payments"]
        assert sum(balances.values()) == 0
        for bal in balances.values():
            _assert_is_int(bal, f"{trip['id']} balance")

        # Verify oracle output zeroes out all balances.
        remaining = dict(balances)
        for p in payments:
            _assert_is_int(p["amount"], f"{trip['id']} payment amount")
            assert p["amount"] > 0
            assert p["frm"] in remaining and p["to"] in remaining
            remaining[p["frm"]] += p["amount"]
            remaining[p["to"]] -= p["amount"]
        assert all(v == 0 for v in remaining.values()), f"Non-zero residual in {trip['id']}: {remaining}"
        assert payments == settle_minimum(balances)

    # Edge-case unit checks for bitmask DP & remainder distribution:
    # 1) Disconnected zero-sum subgroups: {A:+100, B:-100, C:+50, D:-50} -> 2 payments, not 3.
    p2 = settle_minimum({"A": 100, "B": -100, "C": 50, "D": -50})
    assert len(p2) == 2, f"Expected 2 optimal payments, got {len(p2)}: {p2}"

    # 2) All-zero balances -> 0 payments.
    assert settle_minimum({"A": 0, "B": 0}) == []

    # 3) Remainder paise/rupee distribution on non-divisible equal split.
    rem_shares = compute_equal_shares(1000, ["m1", "m2", "m3"])
    assert rem_shares == {"m1": 334, "m2": 333, "m3": 333}
    assert sum(rem_shares.values()) == 1000


def main() -> None:
    test_trips_json_and_csv()
    test_demo_gate_trip()
    test_settle_oracle_and_expected_settlements()
    print("All data_analyst tests passed!")


if __name__ == "__main__":
    main()
