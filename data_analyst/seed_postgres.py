"""Seed PostgreSQL (dedicated DB_SCHEMA, default trip_data) from output/trips.json."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2 import sql

from settle_oracle import compute_expense_shares

DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/tripsplit"
SCHEMA_NAME_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _validate_schema_name(schema_name: str) -> str:
    if not SCHEMA_NAME_RE.match(schema_name) or schema_name.lower() == "public":
        raise ValueError(
            f"Invalid DB_SCHEMA {schema_name!r}: must be a valid non-public Postgres identifier"
        )
    return schema_name


def _apply_schema(conn: psycopg2.extensions.connection, schema_name: str) -> None:
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    raw_sql = schema_path.read_text(encoding="utf-8")
    ddl = re.sub(r"\btrip_data\b", schema_name, raw_sql)
    with conn:
        with conn.cursor() as cur:
            cur.execute(ddl)


def seed_database() -> int:
    database_url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    schema_name = _validate_schema_name(os.environ.get("DB_SCHEMA", "trip_data"))

    trips_path = Path(__file__).resolve().parent / "output" / "trips.json"
    with trips_path.open("r", encoding="utf-8") as f:
        trips = json.load(f)["trips"]

    conn = psycopg2.connect(database_url)
    try:
        _apply_schema(conn, schema_name)

        for trip in trips:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        sql.SQL("SET LOCAL search_path TO {}").format(sql.Identifier(schema_name))
                    )
                    cur.execute(
                        "INSERT INTO trips (id, name, destination, currency) VALUES (%s, %s, %s, %s)",
                        (trip["id"], trip["name"], trip["destination"], trip["currency"]),
                    )
                    for member in trip["members"]:
                        cur.execute(
                            "INSERT INTO members (id, trip_id, name) VALUES (%s, %s, %s)",
                            (member["id"], trip["id"], member["name"]),
                        )

                    for expense in trip["expenses"]:
                        amount_paise = int(expense["amount"]) * 100
                        shares_paise = compute_expense_shares(expense, multiplier=100)
                        assert sum(shares_paise.values()) == amount_paise, (
                            f"Split sum mismatch for {expense['id']}"
                        )

                        cur.execute(
                            """
                            INSERT INTO expenses (
                                id, trip_id, description, amount_paise,
                                category, paid_by, split_type, spent_on
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                expense["id"],
                                trip["id"],
                                expense["description"],
                                amount_paise,
                                expense["category"],
                                expense["paid_by"],
                                expense["split_type"],
                                expense["date"],
                            ),
                        )
                        for member_id, share_paise in shares_paise.items():
                            cur.execute(
                                """
                                INSERT INTO expense_splits (expense_id, member_id, share_paise)
                                VALUES (%s, %s, %s)
                                """,
                                (expense["id"], member_id, share_paise),
                            )

        # Verify member_balances sums to 0 per trip.
        all_zero = True
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("SET search_path TO {}").format(sql.Identifier(schema_name))
            )
            cur.execute(
                """
                SELECT t.id, t.name, COALESCE(SUM(mb.balance_paise), 0)::BIGINT AS balance_sum
                FROM trips t
                LEFT JOIN member_balances mb ON mb.trip_id = t.id
                GROUP BY t.id, t.name
                ORDER BY t.id
                """
            )
            rows = cur.fetchall()

        print(f"Seeded {len(trips)} trips into schema '{schema_name}'. Balance sum check:")
        for trip_id, trip_name, balance_sum in rows:
            print(f"  - {trip_id} ({trip_name}): balance_sum = {balance_sum} paise")
            if balance_sum != 0:
                all_zero = False

        return 0 if all_zero else 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(seed_database())
