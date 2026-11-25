-- Dedicated schema for Trip Splitter data analyst seed & verification.
-- Every object is schema-qualified so nothing in public can ever be touched or dropped.

CREATE SCHEMA IF NOT EXISTS trip_data;
SET search_path TO trip_data;

DROP VIEW IF EXISTS trip_data.member_balances;
DROP TABLE IF EXISTS trip_data.expense_splits;
DROP TABLE IF EXISTS trip_data.expenses;
DROP TABLE IF EXISTS trip_data.members;
DROP TABLE IF EXISTS trip_data.trips;

CREATE TABLE trip_data.trips (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trip_data.members (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trip_data.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE trip_data.expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trip_data.trips(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    category TEXT NOT NULL,
    paid_by TEXT NOT NULL REFERENCES trip_data.members(id),
    split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'exact')),
    spent_on DATE NOT NULL
);

CREATE TABLE trip_data.expense_splits (
    expense_id TEXT NOT NULL REFERENCES trip_data.expenses(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES trip_data.members(id),
    share_paise BIGINT NOT NULL CHECK (share_paise >= 0),
    PRIMARY KEY (expense_id, member_id)
);

CREATE INDEX idx_members_trip_id ON trip_data.members(trip_id);
CREATE INDEX idx_expenses_trip_id ON trip_data.expenses(trip_id);
CREATE INDEX idx_expense_splits_member_id ON trip_data.expense_splits(member_id);

CREATE VIEW trip_data.member_balances AS
SELECT
    m.trip_id,
    m.id AS member_id,
    m.name,
    COALESCE(p.paid_paise, 0) - COALESCE(s.owed_paise, 0) AS balance_paise
FROM trip_data.members m
LEFT JOIN (
    SELECT paid_by AS member_id, SUM(amount_paise)::BIGINT AS paid_paise
    FROM trip_data.expenses
    GROUP BY paid_by
) p ON p.member_id = m.id
LEFT JOIN (
    SELECT member_id, SUM(share_paise)::BIGINT AS owed_paise
    FROM trip_data.expense_splits
    GROUP BY member_id
) s ON s.member_id = m.id;
