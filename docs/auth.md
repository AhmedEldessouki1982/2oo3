# Authentication

## Flow

1. User registers or logs in via `/api/auth/login` or `/api/auth/register`.
2. Server returns `{ user, accessToken, refreshToken }`.
3. Frontend stores tokens in `localStorage`.
4. Every API request includes `Authorization: Bearer <accessToken>`.
5. On 401, the frontend automatically tries to refresh via `/api/auth/refresh`.
6. If refresh succeeds, the failed request is retried with the new token.
7. If refresh fails, tokens are cleared and the user is redirected to `/login`.

## Token Strategy

| Token          | TTL | Payload                             | Storage     |
|----------------|-----|-------------------------------------|-------------|
| Access token   | 15m | `{ sub, email, role }`              | localStorage |
| Refresh token  | 7d  | `{ sub, type: 'refresh' }`          | localStorage (hashed in DB) |

- Refresh tokens are stored as SHA-256 hashes in the `refresh_tokens` table.
- Each refresh rotates both tokens and revokes the old refresh token.
- Logout revokes the refresh token client-side + server-side.

## Password Policy

Minimum 8 characters, must contain at least:
- One uppercase letter
- One lowercase letter
- One number
- One special character (`!@#$%^&*`)

## Demo Credentials

- Email: `lead.commissioning@example.com`
- Password: `DemoPass1!`
- Role: `LEAD_ENGINEER`

## Testing with curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"lead.commissioning@example.com","password":"DemoPass1!"}'

# Get current user
curl http://localhost:3000/api/auth/me \
  -H 'Authorization: Bearer <accessToken>'

# Refresh tokens
curl -X POST http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'

# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"engineer@example.com","password":"SecurePass1!","displayName":"Nadia Hassan"}'
```

## Troubleshooting

- **401 on /auth/me**: Token expired or missing. Login again.
- **409 on register**: Email already in use.
- **Migration fails**: Ensure docker postgres is running (`npm run db:up`) and `DATABASE_URL` is correct.
- **bcrypt install fails**: If native build fails, switch to `bcryptjs`:
  ```bash
  npm uninstall -w backend bcrypt @types/bcrypt
  npm install -w backend bcryptjs
  npm install -w backend -D @types/bcryptjs
  ```
  Then update imports from `bcrypt` to `bcryptjs`.
