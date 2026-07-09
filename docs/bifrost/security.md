# Security & Two-Factor Authentication

Bifröst supports Time-based One-Time Password (TOTP) two-factor authentication for admin accounts.

## Enabling MFA

1. Go to **Profile** (`/admin/profile`)
2. Click **Enable two-factor authentication**
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
4. Enter the 6-digit code from your app
5. Click **Verify**

After verification, MFA is active. The page also shows 8 recovery codes — save these in a safe place.

## Recovery Codes

When you set up MFA, you receive 8 one-time recovery codes. Each code can be used once in place of a TOTP code:

- Enter a recovery code instead of the 6-digit code during login
- Each code is single-use — after use, it's removed from the list
- Store codes securely (password manager, printed paper, encrypted file)
- If you run out of codes, disable MFA (requires password) and re-enable to get new ones

## Login with MFA

1. Enter your email and password as usual
2. If MFA is enabled, the login returns `{ requiresMfa: true, mfaToken }` instead of the access token
3. Submit the 6-digit code (or a recovery code) to `POST /api/v1/auth/mfa`
4. Upon verification, you receive your access token and refresh token

## Disabling MFA

1. Go to **Profile** → Two-Factor Authentication section
2. Click **Disable**
3. Enter your password to confirm
4. MFA is removed — you can re-enable at any time

## Admin MFA Reset

Admins can reset MFA for any user from the **Users** page (`/admin/users`):

1. Find the user with MFA enabled (shows "2FA" badge)
2. Click **reset** next to the badge
3. Confirm the action
4. The user's MFA secret and recovery codes are cleared — they can log in with just their password

This is useful when a user loses their phone and all recovery codes.

## API Keys and MFA

API keys (created in Profile → API Keys) bypass MFA entirely. A valid API key authenticates directly — no TOTP challenge is required. This is by design: API keys are intended for programmatic access (scripts, CI/CD, automated backups).

Treat API keys with the same security you'd apply to MFA tokens.

## Security Best Practices

- Set a strong `BIFROST_JWT_SECRET` in production
- Use MFA for all admin accounts
- Store recovery codes securely — not in plain text on your desktop
- Regularly rotate API keys
- Run Bifröst behind a reverse proxy with TLS (nginx, Caddy)
- Keep your Bifröst version up to date
