# Load Tests

These k6 scripts exercise the 2oo3 API under simulated user load.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed
- Backend running (`npm run start:dev` in `backend/`)
- A test user registered (or use the demo credentials)

## Running

```bash
# Basic smoke test (1 user, short duration)
k6 run --vus 1 --duration 30s smoke-test.js

# Load test (ramp up to 20 concurrent users)
k6 run --vus 20 --duration 3m load-test.js

# Stress test (ramp up to 100 concurrent users)
k6 run --vus 100 --duration 5m stress-test.js
```

Override the target URL:
```bash
k6 run -e BASE_URL=http://localhost:3000/api -e USER_EMAIL=test@example.com -e USER_PASSWORD=password123 smoke-test.js
```

## Scenarios

| Script | Description | Thresholds |
|---|---|---|
| `smoke-test.js` | Single user performs the full flow once | p95 < 2s, failures < 1% |
| `load-test.js` | Ramp 0→20→0 users across 3 min | p95 < 3s, failures < 5% |
| `stress-test.js` | Ramp 0→100→0 users across 5 min | p95 < 5s, failures < 10% |

## Key Metrics Tracked

- Request duration (p50, p90, p95, p99)
- Error rate per endpoint
- Token acquisition success rate
- Conversation creation throughput
- Message send throughput
