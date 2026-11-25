"""Exact minimum-payments settlement oracle using bitmask DP."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def compute_equal_shares(amount: int, split_among: list[str]) -> dict[str, int]:
    """Split an integer amount equally, giving remainder units to the first members."""
    if not split_among:
        raise ValueError("split_among cannot be empty")
    if not isinstance(amount, int) or amount <= 0:
        raise ValueError(f"amount must be a positive int, got {amount!r}")
    count = len(split_among)
    base, remainder = divmod(amount, count)
    shares: dict[str, int] = {}
    for idx, member_id in enumerate(split_among):
        shares[member_id] = base + (1 if idx < remainder else 0)
    return shares


def compute_expense_shares(expense: dict[str, Any], multiplier: int = 1) -> dict[str, int]:
    """Return member_id -> integer share for an expense (scaled by multiplier)."""
    amount = int(expense["amount"]) * multiplier
    split_type = expense["split_type"]
    split_among = list(expense["split_among"])

    if split_type == "equal":
        shares = compute_equal_shares(amount, split_among)
    elif split_type == "exact":
        raw_shares = expense.get("shares")
        if not isinstance(raw_shares, dict):
            raise ValueError(f"Exact split missing shares map: {expense['id']}")
        shares = {member_id: int(share) * multiplier for member_id, share in raw_shares.items()}
        if set(shares.keys()) != set(split_among):
            raise ValueError(f"Exact shares keys mismatch split_among in {expense['id']}")
    else:
        raise ValueError(f"Unknown split_type: {split_type!r}")

    if sum(shares.values()) != amount:
        raise AssertionError(
            f"Split sum {sum(shares.values())} != amount {amount} for {expense['id']}"
        )
    return shares


def compute_trip_balances(
    trip: dict[str, Any],
    *,
    by_name: bool = False,
    multiplier: int = 1,
) -> dict[str, int]:
    """Compute net balances (positive = owed, negative = owes) for a trip."""
    id_to_name = {m["id"]: m["name"] for m in trip["members"]}
    balances: dict[str, int] = {m["id"]: 0 for m in trip["members"]}

    for expense in trip["expenses"]:
        payer = expense["paid_by"]
        if payer not in balances:
            raise ValueError(f"Unknown paid_by {payer!r} in {expense['id']}")
        amount = int(expense["amount"]) * multiplier
        balances[payer] += amount

        shares = compute_expense_shares(expense, multiplier=multiplier)
        for member_id, share in shares.items():
            if member_id not in balances:
                raise ValueError(f"Unknown split member {member_id!r} in {expense['id']}")
            balances[member_id] -= share

    if sum(balances.values()) != 0:
        raise AssertionError(f"Trip {trip['id']} balances sum to {sum(balances.values())} != 0")

    if by_name:
        return {id_to_name[member_id]: bal for member_id, bal in balances.items()}
    return balances


def _settle_zero_sum_group(group_balances: dict[str, int]) -> list[dict[str, Any]]:
    """Match largest debtor to largest creditor inside a single zero-sum group."""
    remaining = {k: int(v) for k, v in group_balances.items() if v != 0}
    if sum(remaining.values()) != 0:
        raise ValueError("Group balances must sum to 0")

    payments: list[dict[str, Any]] = []
    while remaining:
        debtor = min(remaining, key=lambda k: (remaining[k], k))
        creditor = max(remaining, key=lambda k: (remaining[k], k))
        debt = -remaining[debtor]
        credit = remaining[creditor]
        if debt <= 0 or credit <= 0:
            raise AssertionError(f"Invalid debtor/creditor state: {remaining}")
        transfer = min(debt, credit)
        payments.append({"frm": debtor, "to": creditor, "amount": transfer})
        remaining[debtor] += transfer
        remaining[creditor] -= transfer
        if remaining[debtor] == 0:
            del remaining[debtor]
        if remaining[creditor] == 0:
            del remaining[creditor]
    return payments


def settle_minimum(balances: dict[str, int]) -> list[dict[str, Any]]:
    """Find the exact minimum-transaction settlement via bitmask DP over zero-sum groups."""
    for member, bal in balances.items():
        if not isinstance(bal, int) or isinstance(bal, bool):
            raise TypeError(f"Balance for {member!r} must be int, got {type(bal).__name__}")

    if sum(balances.values()) != 0:
        raise ValueError(f"Total balance must be 0, got {sum(balances.values())}")

    nonzero = [(member, bal) for member, bal in balances.items() if bal != 0]
    n = len(nonzero)
    if n == 0:
        return []

    names = [item[0] for item in nonzero]
    vals = [item[1] for item in nonzero]

    size = 1 << n
    sub_sum = [0] * size
    for mask in range(1, size):
        lsb = mask & -mask
        idx = lsb.bit_length() - 1
        sub_sum[mask] = sub_sum[mask ^ lsb] + vals[idx]

    dp = [0] * size
    parent_bit = [-1] * size
    for mask in range(1, size):
        best_val = -1
        best_idx = -1
        is_zero = 1 if sub_sum[mask] == 0 else 0
        rem = mask
        while rem:
            lsb = rem & -rem
            idx = lsb.bit_length() - 1
            prev = mask ^ lsb
            cand = dp[prev] + is_zero
            if cand > best_val:
                best_val = cand
                best_idx = idx
            rem ^= lsb
        dp[mask] = best_val
        parent_bit[mask] = best_idx

    # Reconstruct disjoint zero-sum groups using zero-sum prefix boundaries.
    groups: list[list[int]] = []
    current_group: list[int] = []
    cur = size - 1
    while cur:
        idx = parent_bit[cur]
        current_group.append(idx)
        cur ^= 1 << idx
        if sub_sum[cur] == 0:
            groups.append(current_group)
            current_group = []

    max_groups = dp[size - 1]
    if len(groups) != max_groups:
        raise AssertionError(f"Reconstructed {len(groups)} groups, expected {max_groups}")

    payments: list[dict[str, Any]] = []
    for group_indices in groups:
        group_map = {names[idx]: vals[idx] for idx in group_indices}
        payments.extend(_settle_zero_sum_group(group_map))

    if len(payments) != n - max_groups:
        raise AssertionError(f"Expected {n - max_groups} payments, got {len(payments)}")

    # Sort deterministically by largest amount descending, then frm, to.
    payments.sort(key=lambda p: (-p["amount"], p["frm"], p["to"]))

    # Verify applying payments zeroes every balance.
    verify = dict(balances)
    for p in payments:
        verify[p["frm"]] += p["amount"]
        verify[p["to"]] -= p["amount"]
    if any(v != 0 for v in verify.values()):
        raise AssertionError(f"Verification failed, residual balances: {verify}")

    return payments


def build_demo_gate_trip() -> dict[str, Any]:
    """Build the judge's live demo gate trip payload and expected results."""
    trip = {
        "id": "demo_gate",
        "name": "Judge Gate Test Trip",
        "destination": "Demo",
        "currency": "INR",
        "members": [
            {"id": "g_m1", "name": "Asha"},
            {"id": "g_m2", "name": "Bilal"},
            {"id": "g_m3", "name": "Chitra"},
            {"id": "g_m4", "name": "Dhruv"},
        ],
        "expenses": [
            {
                "id": "g_e1",
                "description": "Hotel",
                "amount": 8000,
                "category": "Stay",
                "paid_by": "g_m1",
                "split_type": "equal",
                "split_among": ["g_m1", "g_m2", "g_m3", "g_m4"],
                "date": "2026-03-01",
            },
            {
                "id": "g_e2",
                "description": "Fuel",
                "amount": 2000,
                "category": "Fuel",
                "paid_by": "g_m2",
                "split_type": "equal",
                "split_among": ["g_m1", "g_m2", "g_m3", "g_m4"],
                "date": "2026-03-01",
            },
            {
                "id": "g_e3",
                "description": "Dinner",
                "amount": 1500,
                "category": "Food",
                "paid_by": "g_m3",
                "split_type": "equal",
                "split_among": ["g_m3", "g_m4", "g_m2"],
                "date": "2026-03-01",
            },
        ],
    }
    balances = compute_trip_balances(trip, by_name=True)
    payments = settle_minimum(balances)
    return {
        "trip": trip,
        "expected_balances": balances,
        "expected_payments": payments,
    }


def write_settlement_outputs(
    trips_path: Path | None = None,
    output_dir: Path | None = None,
) -> None:
    """Write expected_settlements.json and demo_gate_trip.json."""
    base_dir = Path(__file__).resolve().parent
    out_dir = output_dir or (base_dir / "output")
    out_dir.mkdir(parents=True, exist_ok=True)
    t_path = trips_path or (out_dir / "trips.json")

    with t_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    settlements = []
    for trip in data["trips"]:
        balances = compute_trip_balances(trip, by_name=True)
        payments = settle_minimum(balances)
        settlements.append(
            {
                "trip_id": trip["id"],
                "trip": trip["name"],
                "currency": trip["currency"],
                "balances": balances,
                "minimum_payments_count": len(payments),
                "payments": payments,
            }
        )

    expected_path = out_dir / "expected_settlements.json"
    with expected_path.open("w", encoding="utf-8") as f:
        json.dump({"trips": settlements}, f, indent=2)

    gate_payload = build_demo_gate_trip()
    gate_path = out_dir / "demo_gate_trip.json"
    with gate_path.open("w", encoding="utf-8") as f:
        json.dump(gate_payload, f, indent=2)


if __name__ == "__main__":
    write_settlement_outputs()
    print("Wrote output/expected_settlements.json and output/demo_gate_trip.json")
