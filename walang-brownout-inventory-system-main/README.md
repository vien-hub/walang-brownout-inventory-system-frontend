# Walang Brownout Inventory System (Frontend)

React 19 + Vite + Tailwind. Talks to the Laravel backend through `VITE_API_URL`.

## Features (mapped to the project rubric)
| Rubric criterion | Where |
|---|---|
| Problem analysis (seasonal stockouts, overstock, discrepancies, filter expiry) | `ReorderPlanner`, `Alerts`, `FifoBacktracking` |
| Reliability / tested | `tests/inventory.test.js` (`npm test`) |
| Inventory data (item ID, category, batch, arrival date, physical, allocated, ATP) | `Inventory`, `ProductDetails`, `FifoBacktracking` |
| Control logic (ABC, FIFO, expiry, reorder point = demand x lead time + safety stock) | `src/utils/inventory.js` |
| Usability and code quality | shared `Navbar`/`Header`, one logic file, ESLint clean |

## Run locally
```bash
cp .env.example .env     # set VITE_API_URL
npm install
npm run dev              # http://localhost:5173
npm test                 # unit tests for the inventory logic
npm run build            # production build in dist/
```

## Deploy
See `RAILWAY_DEPLOYMENT_GUIDE.md`. `VITE_API_URL` is read at **build time**, so redeploy after changing it.
