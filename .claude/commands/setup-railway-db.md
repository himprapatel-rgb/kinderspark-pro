# Setup Railway PostgreSQL Database

Automate provisioning a PostgreSQL database on Railway and wiring it to the backend service.

## Steps

1. **Check Railway CLI is authenticated**

Run:
```bash
railway whoami
```
If not logged in, run `railway login` first.

2. **Link to the Railway project** (if not already linked)

```bash
railway link
```
Select the KinderSpark Pro project and the backend service when prompted.

3. **Add PostgreSQL plugin to the project**

```bash
railway add --plugin postgresql
```
Wait for provisioning to complete.

4. **Get the DATABASE_URL from Railway**

```bash
railway variables --service postgresql | grep DATABASE_URL
```
Or retrieve it programmatically:
```bash
DB_URL=$(railway variables --service postgresql --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('DATABASE_URL',''))")
echo "DATABASE_URL=$DB_URL"
```

5. **Set DATABASE_URL on the backend service**

```bash
railway variables set DATABASE_URL="$DB_URL" --service kinderspark-backend
```

6. **Set it as a GitHub Actions secret** so CI/CD also has it

```bash
gh secret set DATABASE_URL --body "$DB_URL" --repo himprapatel-rgb/kinderspark-pro
```

7. **Trigger a fresh deploy of the backend**

```bash
railway up --service kinderspark-backend --detach
```

8. **Tail logs to confirm the app started**

```bash
railway logs --service kinderspark-backend
```
Look for `Server running on port 4000` and `Prisma migrations applied`.

## Done ✓

KinderSpark backend is now connected to PostgreSQL.
Run `/setup-railway-db` again any time you need to re-provision.
