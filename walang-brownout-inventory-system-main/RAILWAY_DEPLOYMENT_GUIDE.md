# Deploying Walang Brownout Inventory System to Railway

Backend = Laravel (PHP) + MySQL. Frontend = React/Vite static site. Three Railway services in one project:

```
[ React frontend ]  --HTTPS-->  [ Laravel backend ]  --private network-->  [ MySQL ]
```

Do the steps **in this order**. The backend needs the database first, and the frontend needs the backend's URL.

---

## Step 0. What you need
- A GitHub account and Git installed
- A Railway account (https://railway.com, "Login with GitHub"). Railway gives a trial credit; check their pricing page for current limits.
- The two fixed project folders from the zip files

## Step 1. Put both projects on GitHub (two separate repositories)

The **repo root must contain the project files directly** (`composer.json` for the backend, `package.json` for the frontend). Open the *inner* folder before running git.

Backend:
```bash
cd walang-brownout-inventory-backend-main
git init
git add .
git commit -m "Backend ready for Railway"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/walang-brownout-backend.git
git push -u origin main
```

Frontend (inner folder: the one containing `package.json`):
```bash
cd walang-brownout-inventory-system-frontend-main/walang-brownout-inventory-system-main
git init
git add .
git commit -m "Frontend ready for Railway"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/walang-brownout-frontend.git
git push -u origin main
```
Create the two empty repos on github.com first (no README). `.env`, `vendor/` and `node_modules/` are already git-ignored, so secrets are not uploaded.

## Step 2. Create the Railway project and the database
1. Railway dashboard, **New Project**, **Deploy MySQL** (or *Empty Project*, then **+ New**, **Database**, **Add MySQL**).
2. Wait until the MySQL service shows as active. Note its name (normally `MySQL`). You will reference it below.

## Step 3. Generate an APP_KEY
Laravel needs a secret key. Generate one on your computer.

- Mac/Linux/Git Bash: `echo "base64:$(openssl rand -base64 32)"`
- Windows PowerShell: `"base64:" + [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`

Copy the whole output including `base64:`.

## Step 4. Deploy the backend
1. In the project: **+ New**, **GitHub Repo**, choose your backend repo (authorize Railway on GitHub if asked).
2. Open the new service, **Variables** tab, **Raw Editor**, paste (edit the values):

```
APP_NAME=WalangBrownout
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:PASTE_YOUR_KEY_HERE
LOG_CHANNEL=stderr
DB_CONNECTION=mysql
DATABASE_URL=${{MySQL.MYSQL_URL}}
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_NAME=Your Name
```
   `${{MySQL.MYSQL_URL}}` links to the database. If your database service is not named `MySQL`, use its real name.
3. **Settings**, **Networking**, **Generate Domain**. You get something like `https://walang-backend-production.up.railway.app`.
4. Add this variable (your backend domain):
```
APP_URL=https://walang-backend-production.up.railway.app
```
5. Railway builds and deploys automatically. On every start it runs the database migrations and creates your admin account (only if it does not exist yet).
6. Test it in the browser: `https://YOUR-BACKEND-DOMAIN/api/test-connection` should show:
```json
{"status":"success","message":"Connected to Laravel Backend successfully!"}
```

## Step 5. Deploy the frontend
1. **+ New**, **GitHub Repo**, choose the frontend repo.
2. **Variables**: add
```
VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api
```
   It **must end with `/api`** and use `https://`. Vite bakes this into the build, so if you change it later you must redeploy the frontend.
3. **Settings**, **Networking**, **Generate Domain**, e.g. `https://walang-frontend-production.up.railway.app`.
4. Wait for the deploy to finish (build runs `npm run build`, then the `dist` folder is served as a single-page app).

## Step 6. Allow the frontend to call the backend (CORS)
Go back to the **backend** service, **Variables**, add:
```
FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN
```
No trailing slash. Railway redeploys the backend automatically.

## Step 7. Test everything
1. Open the frontend URL.
2. Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set.
3. Add a product, receive a FIFO batch, open Alerts and Reorder Planner. Refresh the page: your data should still be there (it is saved in MySQL).
4. Refresh on a sub-page such as `/inventory`. It should still load.

## Step 8. Updating later
Push to GitHub (`git add . && git commit -m "change" && git push`). Railway redeploys automatically.

---

## Troubleshooting
| Symptom | Fix |
|---|---|
| Backend deploy fails or `500 Server Error` | Check **Deployments, View Logs**. Most common: `APP_KEY` missing or missing `base64:` prefix. |
| `SQLSTATE ... Connection refused` | `DATABASE_URL` wrong. Use the reference `${{MySQL.MYSQL_URL}}` and make sure the MySQL service name matches. Also set `DB_CONNECTION=mysql`. |
| Browser console: CORS error | `FRONTEND_URL` must be exactly the frontend domain, `https://`, no trailing slash. Redeploy backend after changing. |
| Login shows "Network Error" | `VITE_API_URL` missing, missing `/api`, or you changed it without redeploying the frontend. |
| Refreshing `/inventory` gives 404 | In the frontend service add variable `RAILPACK_SPA_OUTPUT_DIR=dist` and redeploy. |
| Build error about PHP version | The backend requires PHP 8.4 (already set in `composer.json`). Do not lower it. |
| Migrations did not run | Backend service, **Settings, Deploy, Pre-deploy command**: `php artisan migrate --force --seed`. |

## Security checklist before you submit
- Change the default admin password (set `ADMIN_PASSWORD` before the first deploy, or change it in User Management).
- Keep `APP_DEBUG=false` in production.
- Never commit `.env`.
