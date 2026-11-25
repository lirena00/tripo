# Trip Splitter — Data Analyst Workspace

Synthetic dataset generation, pitch analytics, PostgreSQL seed (dedicated `trip_data` schema), and exact bitmask-DP settlement oracle for **Trip Splitter**.

All monetary values in JSON/CSV outputs are integer **INR rupees**; all monetary values in PostgreSQL are integer **paise** (`INR 1 = 100`). Floats are never used for money.

## Quickstart (Run in Order)

```bash
cd data_analyst
python -m venv .venv
source .venv/bin/activate
pip install psycopg2-binary

python generate_trips.py
python analyze_trips.py
python test_data.py

createdb tripsplit
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tripsplit python seed_postgres.py
```

Optional: re-generate only the oracle outputs (`output/expected_settlements.json` and `output/demo_gate_trip.json`):

```bash
python settle_oracle.py
```

## Outputs (`data_analyst/output/`)

- `trips.json`: 5 realistic Indian group trips (`trip1`–`trip5`), 151 expenses total, following the Team API Contract.
- `expenses.csv`: Spreadsheet-friendly export with `paid_by` names and `|`-joined `split_among` names.
- `insights.json`: Overall and per-trip analytics including top categories, payer rankings, partial-split percentages, and minimum vs. naive settlement counts.
- `INSIGHTS.md`: 6-line plain-English pitch summary.
- `expected_settlements.json`: Exact per-trip balances and minimum-payment transfers from the bitmask-DP oracle.
- `demo_gate_trip.json`: Judge live-test fixture (`Asha`, `Bilal`, `Chitra`, `Dhruv`) with expected balances and 3 optimal payments.

## PostgreSQL Schema (`trip_data` by default, configurable via `DB_SCHEMA`)

`schema.sql` creates all objects inside a dedicated `trip_data` schema so it never collides with or drops anything in `public`.

- `trips(id, name, destination, currency, created_at)`
- `members(id, trip_id, name)` — `ON DELETE CASCADE`
- `expenses(id, trip_id, description, amount_paise, category, paid_by, split_type, spent_on)` — `amount_paise > 0`, `split_type IN ('equal', 'exact')`
- `expense_splits(expense_id, member_id, share_paise)` — `share_paise >= 0`, `PRIMARY KEY (expense_id, member_id)`
- Indexes on `members(trip_id)`, `expenses(trip_id)`, `expense_splits(member_id)`
- View `member_balances(trip_id, member_id, name, balance_paise)` — `SUM(paid) - SUM(shares)`; positive = is owed, negative = owes.

## 3 Useful SQL Queries

### 1. Spend by Category (INR)
```sql
SELECT
    category,
    COUNT(*) AS expense_count,
    SUM(amount_paise) / 100 AS total_inr
FROM trip_data.expenses
GROUP BY category
ORDER BY total_inr DESC;
```

### 2. Who Pays Most Often
```sql
SELECT
    t.name AS trip,
    m.name AS member,
    COUNT(e.id) AS expenses_paid,
    COALESCE(SUM(e.amount_paise), 0) / 100 AS paid_inr
FROM trip_data.members m
JOIN trip_data.trips t ON t.id = m.trip_id
LEFT JOIN trip_data.expenses e ON e.paid_by = m.id
GROUP BY t.name, m.id, m.name
ORDER BY expenses_paid DESC, paid_inr DESC;
```

### 3. Member Balances for a Trip (`trip1`)
```sql
SELECT
    member_id,
    name,
    balance_paise / 100 AS balance_inr
FROM trip_data.member_balances
WHERE trip_id = 'trip1'
ORDER BY balance_paise DESC;
```
