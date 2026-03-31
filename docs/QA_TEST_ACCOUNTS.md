# QA / UAT test accounts (seeded data)

Use these accounts **after** running `npx prisma db seed` in `backend/` (or equivalent deploy seed).  
All accounts belong to **Sunshine Kindergarten** unless you add more schools.

## School code (required at login)

| Field        | Value   |
|-------------|---------|
| **School code** | `SUN001` |

**Base URLs (set your deployment):**

- Frontend: your app URL (e.g. `https://<frontend>/` or `http://localhost:3000`)
- Login flow: role selection → PIN entry (`/pin` or as routed by your build)
- API base: `NEXT_PUBLIC_API_URL` (e.g. `https://<backend>/api`)

---

## Child

| Purpose        | Name (seed) | PIN  | Class        | Notes |
|----------------|-------------|------|--------------|--------|
| Happy path     | Emma        | `1111` | KG 1 Sunflower | Good progress data |
| Second child   | Liam        | `2222` | KG 1 Sunflower | |
| Multi-class ref| Aisha       | `7777` | KG 2 Rainbow   | High AI level |
| At-risk / edge | Noah        | `4444` | KG 1 Sunflower | Low engagement in seed |

**Login:** Role **Child** → school code `SUN001` → child PIN.

---

## Parent

Parents authenticate with the **linked child’s PIN** and role **Parent** (no separate parent PIN in seed).

| Scenario              | Use child | PIN    |
|-----------------------|-----------|--------|
| Parent of Emma        | Emma      | `1111` |
| Parent of Noah        | Noah      | `4444` |
| Parent of Carlos (KG3)| Carlos    | `2233` |

**Login:** Role **Parent** → school code `SUN001` → PIN as above.

---

## Teacher

| Name              | PIN    | Notes (seed)        |
|-------------------|--------|---------------------|
| Ms. Sarah Johnson | `1234` | Primary KG1 teacher |
| Mr. David Chen    | `5678` | KG2                 |
| Ms. Fatima Al-Mansoori | `4321` | KG1 support    |
| Mr. James Okafor  | `8765` | KG3                 |
| Ms. Sofia Reyes   | `1357` | AI specialist       |

**Login:** Role **Teacher** → school code `SUN001` → PIN.

---

## Admin (school oversight)

| Name           | PIN    |
|----------------|--------|
| Priya Sharma   | `8800` |
| Lucas Martin   | `7700` |

**Login:** Role **Admin** → school code `SUN001` → PIN.

---

## Principal

In seed data, the **Principal** user is stored in the same `Admin` table as other admins.

| Name            | PIN    | Notes        |
|-----------------|--------|--------------|
| Omar Al-Rashid  | `9999` | Labeled Principal in seed |

**Login:** Role **Principal** → school code `SUN001` → PIN `9999`.

---

## Negative / security checks (manual QA)

| Test                         | How |
|------------------------------|-----|
| Wrong PIN                    | Correct school `SUN001`, wrong PIN → should reject |
| Wrong school code            | Valid PIN, invalid code → should reject |
| Wrong role for PIN           | e.g. Teacher PIN with Child role → should fail |
| Lockout after failed attempts| After policy limit, expect `429` / lock message |

---

## Data refresh

To reset to these accounts and demo data:

```bash
cd backend
npx prisma db seed
```

For **Railway / production**, use **[SEED_PRODUCTION.md](./SEED_PRODUCTION.md)** (private DB URLs usually require seeding inside the backend container).

---

## Production warning

**Do not** use these PINs in production. They are for **local/staging UAT** only. Production must use school-specific credentials and policies.
