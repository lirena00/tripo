# RED Trip Splitter

A Splitwise-style backend for group trips built with Next.js 15 (App Router), TypeScript, Prisma, and custom JWT auth.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via Prisma ORM
- **Validation**: Zod
- **Testing**: Vitest
- **Auth**: Custom HS256 JWT with `jose` (demo credentials), swappable for Google OAuth

## Project Structure

```
src/
├── lib/
│   ├── splits.ts        # Pure split computation (equal/exact/percent)
│   ├── balances.ts      # Pure balance computation from expenses
│   ├── settle.ts        # Pure greedy + optimal settlement algorithms
│   ├── insights.ts      # Pure spending insights
│   ├── nudges.ts        # Pure UPI deep link generation
│   ├── db.ts            # Prisma client singleton
│   ├── auth.ts          # Custom JWT + requireUser/requireTripMember
│   ├── errors.ts        # ApiError class + error response helper
│   └── validators.ts    # Zod schemas for API validation
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── demo-login/route.ts    # POST {name, email?} → JWT + cookie
│   │   │   ├── logout/route.ts        # POST clears cookie
│   │   │   └── (me is at /api/me)     # GET current user
│   │   └── trips/
│   │       ├── route.ts                    # GET/POST trips
│   │       ├── [id]/route.ts               # GET trip detail
│   │       ├── [id]/members/route.ts       # POST member
│   │       ├── [id]/expenses/route.ts      # POST expense
│   │       ├── [id]/expenses/[eid]/route.ts # DELETE expense
│   │       ├── [id]/balances/route.ts      # GET balances
│   │       ├── [id]/settlements/route.ts   # GET settlements
│   │       ├── [id]/payments/route.ts      # POST payment
│   │       ├── [id]/insights/route.ts      # GET insights
│   │       └── [id]/nudges/route.ts        # GET nudges
│   ├── layout.tsx
│   ├── page.tsx            # Trivial test page
│   └── globals.css
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── tests/
    ├── splits.test.ts
    ├── balances.test.ts
    ├── settle.test.ts
    ├── insights.test.ts
    ├── nudges.test.ts
    ├── property.test.ts
    └── validation.test.ts
```

## Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values:
# DATABASE_URL="file:./dev.db"
# AUTH_SECRET="your-super-secret-key-at-least-32-chars-long"

# Initialize database
npx prisma db push
npx tsx prisma/seed.ts

# Run tests
npm test

# Start development server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite file path (e.g., `file:./dev.db`) |
| `AUTH_SECRET` | Yes | Secret for HS256 JWT signing (32+ chars) |

## API Endpoints

All endpoints return JSON. Protected endpoints require authentication via:
- `Authorization: Bearer <token>` header, OR
- `red_token` httpOnly cookie (set by demo-login)

### Auth
- `POST /api/auth/demo-login` - Sign in `{name, email?}` → `{accessToken, user}` + sets `red_token` cookie
- `POST /api/auth/logout` - Clears cookie
- `GET /api/me` - Returns current user `{id, name, email}`

### Trips
- `GET /api/trips` - List trips for current user
- `POST /api/trips` - Create trip `{name}`
- `GET /api/trips/[id]` - Get trip with members & expenses
- `POST /api/trips/[id]/members` - Add member `{name, email?, upiId?}`
- `POST /api/trips/[id]/expenses` - Add expense
  ```json
  {
    "paidBy": "memberId",
    "amountPaise": 100000,
    "category": "food",
    "description": "Optional",
    "splitType": "equal|exact|percent",
    "splitAmong": ["memberId1", "memberId2"],
    "splitValues": {"memberId1": 60000, "memberId2": 40000} // for exact/percent
  }
  ```
- `DELETE /api/trips/[id]/expenses/[eid]` - Delete expense
- `GET /api/trips/[id]/balances` - Get member balances `[{memberId, name, netPaise}]`
- `GET /api/trips/[id]/settlements?mode=optimal|greedy` - Get settlement plan
  ```json
  {
    "mode": "optimal",
    "payments": [{from: "m1", to: "m2", amountPaise: 50000}],
    "paymentCount": 1,
    "greedyCount": 1,
    "naivePairwiseCount": 3
  }
  ```
- `POST /api/trips/[id]/payments` - Record settlement `{fromMemberId, toMemberId, amountPaise}`
- `GET /api/trips/[id]/insights` - Get spending insights
- `GET /api/trips/[id]/nudges` - Get payment nudges with UPI links

## Money Handling

All amounts are **integer paise** (100 paise = ₹1). No floating point anywhere.

- API accepts/returns paise
- `lib/splits.ts` computes exact integer shares
- `lib/balances.ts` recomputes from expenses on every request
- `lib/settle.ts` operates on integer nets

## Settlement Algorithms

### Greedy (`greedySettle`)
Repeatedly match largest creditor with largest debtor. Maximum n-1 payments.

### Optimal (`optimalSettle`)
Bitmask DP to find maximum zero-sum groups, then settle each group greedily.
- True minimum payments = non-zero people - max zero-sum groups
- Falls back to greedy for n > 15

### Naive Pairwise
Count of non-zero pairwise nets (for comparison).

## Gate Test Scenario (curl walkthrough)

```bash
# 1. Demo login → get token + cookie
curl -s -X POST http://localhost:3000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"name": "Test User"}'
# → { "accessToken": "...", "user": { "id": "...", "name": "Test User" } }

# 2. Create trip (use cookie or Bearer token)
curl -s -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Gate Test Trip"}'
# → { "id": "<TRIP_ID>", "name": "Gate Test Trip", ... }

# 3. Add 4 members
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/members \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Aman"}'
# → { "id": "<AMAN_ID>", ... }
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/members \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Bhavna"}'
# → { "id": "<BHAVNA_ID>", ... }
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/members \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Chirag"}'
# → { "id": "<CHIRAG_ID>", ... }
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/members \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name": "Divya"}'
# → { "id": "<DIVYA_ID>", ... }

# 4. Add 3 expenses
# Hotel 600000 paid by Aman, split among all 4
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/expenses \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"paidBy":"<AMAN_ID>","amountPaise":600000,"category":"stay","splitType":"equal","splitAmong":["<AMAN_ID>","<BHAVNA_ID>","<CHIRAG_ID>","<DIVYA_ID>"]}'

# Fuel 180000 paid by Bhavna, split among Aman, Bhavna, Chirag
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/expenses \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"paidBy":"<BHAVNA_ID>","amountPaise":180000,"category":"fuel","splitType":"equal","splitAmong":["<AMAN_ID>","<BHAVNA_ID>","<CHIRAG_ID>"]}'

# Dinner 120000 paid by Chirag, split among all 4
curl -s -X POST http://localhost:3000/api/trips/<TRIP_ID>/expenses \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"paidBy":"<CHIRAG_ID>","amountPaise":120000,"category":"food","splitType":"equal","splitAmong":["<AMAN_ID>","<BHAVNA_ID>","<CHIRAG_ID>","<DIVYA_ID>"]}'

# 5. Check balances
curl -s -b cookies.txt http://localhost:3000/api/trips/<TRIP_ID>/balances
# Expected:
# [
#   { "memberId": "<AMAN_ID>", "name": "Aman", "netPaise": 360000 },
#   { "memberId": "<BHAVNA_ID>", "name": "Bhavna", "netPaise": -60000 },
#   { "memberId": "<CHIRAG_ID>", "name": "Chirag", "netPaise": -120000 },
#   { "memberId": "<DIVYA_ID>", "name": "Divya", "netPaise": -180000 }
# ]

# 6. Get optimal settlements
curl -s -b cookies.txt "http://localhost:3000/api/trips/<TRIP_ID>/settlements?mode=optimal"
# Expected: { "mode": "optimal", "paymentCount": 3, "payments": [...], "greedyCount": 3, "naivePairwiseCount": 5 }
# All 3 payments go TO Aman

# 7. Get nudges with UPI links
curl -s -b cookies.txt http://localhost:3000/api/trips/<TRIP_ID>/nudges
# → [{ from: "...", to: "<AMAN_ID>", amountPaise: 60000, message: "Bhavna owes Aman ₹600.00", upiLink: "upi://pay?pa=..." }, ...]

# 8. Test 401 without token
curl -s http://localhost:3000/api/trips/<TRIP_ID>/balances
# → { "error": "Unauthorized" }

# 9. Test 403 for non-member (create another user, login, try to access trip)
curl -s -X POST http://localhost:3000/api/auth/demo-login \
  -H "Content-Type: application/json" -c cookies2.txt \
  -d '{"name": "Outsider"}'
curl -s -b cookies2.txt http://localhost:3000/api/trips/<TRIP_ID>/balances
# → { "error": "Not a member of this trip" }
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Watch mode
npm run test:watch
```

### Test Coverage

1. **Gate case**: Aman/Bhavna/Chirag/Divya - optimal = 3 payments to Aman
2. **Greedy vs Optimal**: +7,+5,+4,-9,-7 → greedy=4, optimal=3
3. **10000 paise ÷ 3** = shares sum to exactly 10000
4. **All square** → empty settlement list
5. **Apply settlements** → zeros every balance
6. **Property test**: 200 random trips, balances sum to 0, optimal ≤ greedy ≤ n-1
7. **Validation**: bad percent sum, exact mismatch, empty splitAmong, non-member, amount ≤ 0 → 400
8. **Auth**: no token → 401, non-member → 403

## Switching to Google OAuth

In `src/lib/auth.ts`:
1. Replace the demo-login handler (`app/api/auth/demo-login/route.ts`) with a Google ID-token verification endpoint that:
   - Verifies the Google ID token using `google-auth-library`
   - Upserts User by `googleSub` (or by email if `googleSub` not set)
   - Issues the same JWT via `signToken(userId)` and sets the `red_token` cookie
2. Keep `requireUser()` returning the same `User` shape (`id`, `name`, `email`).

**No other files need to change** - all route handlers use `requireUser(request)`.

## License

MIT