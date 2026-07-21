# Sinnau

## OAuth Setup (GitHub & Google)

Sinnau supports optional GitHub and Google sign-in. Each provider is **conditional**: it is only wired up when **both** its client ID and client secret are present in the environment. If a provider's credentials are missing, its login/sign-up buttons are hidden and email/password remains the only method. No code or migration changes are needed to toggle a provider on or off — just set or unset its env vars and restart.

### 1. Environment variables

Add the following to your `.env` (copy from `.env.example`). Leave them empty to disable a provider.

```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Both values for a given provider must be set for it to activate.

### 2. Create the OAuth app

#### Google

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (type: Web application).
3. Under **Authorized redirect URIs**, add:
   - `https://<your-domain>/api/auth/callback/google`
   - For local dev: `http://localhost:5173/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

#### GitHub

1. Open [GitHub → Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/developers).
2. Set **Authorization callback URL** to:
   - `https://<your-domain>/api/auth/callback/github`
   - For local dev: `http://localhost:5173/api/auth/callback/github`
3. Copy the **Client ID** and generate a **Client secret**, then set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.

### 3. Restart and verify

Restart the app. On the login and sign-up pages, a "Lanjut dengan Google / GitHub" button appears only for providers whose credentials are configured.

### Behavior notes

- New users can sign up via OAuth; if the provider's verified email matches an existing account, the identities are auto-linked.
- The admin role assignment (`AUTH_ADMIN_EMAILS` / `AUTH_ADMIN_EMAIL_DOMAINS`) applies to OAuth-created accounts as well.
