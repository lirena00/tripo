# Data Analyst Prompt & Error Log

| Prompt | What the AI got wrong | Fix |
| --- | --- | --- |
| Generate 5 realistic Indian group trips with Stay, Food, Drinks, Fuel, Transport, Activities, Groceries, Shopping | First run booked too many hotels so Stay was 49% of spend | Fixed by limiting to 1 or 2 Stay expenses per trip |
| Model organizer, driver, and forgetful friend payer behaviors | Organizer paid too often on small trips | Fixed by lowering the payer weight to 1.3x |
| Tune category amounts so Stay lands in 30–40% of total spend | First run with `rng.random() ** 1.15` for non-Stay and moderate Stay values gave Stay at 23.8% (INR 127,000 / 534,200), failing the 30–40% test | Skewed non-Stay amounts (`rng.random() ** 1.75`) and adjusted Stay ranges within INR 9,000–36,000 so Stay landed at 32.3% (INR 167,500 / 517,930) |
| Ensure `schema.sql` never drops anything in `public` | Unqualified `DROP TABLE IF EXISTS` / `CREATE TABLE` statements relied solely on `SET search_path` | Schema-qualified every `DROP` and `CREATE` object in `schema.sql` with `trip_data.` and updated `seed_postgres.py` to substitute `DB_SCHEMA` using a word-boundary regex |
| Seed local PostgreSQL database via `seed_postgres.py` | Local machine / sandbox has no PostgreSQL server installed or running on `localhost:5432` (`psycopg2.OperationalError: Connection refused`) | Left global system packages untouched per rules; documented exact `createdb` and `seed_postgres.py` commands in `README.md` and flagged PostgreSQL server absence as a blocker |
