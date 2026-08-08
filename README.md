## Next.js 14 Fullstack NextAuth.js & i18n Example (with MongoDB + TypeScript)
A full-stack authentication demo built with Next.js 14, NextAuth.js v5, MongoDB (via Mongoose), and TypeScript.

Supports both Google OAuth and email/password login, with internationalization (i18n) and comprehensive authentication flows.

## ✨ Features
- Google OAuth Login – Authenticate users via their Google accounts.

- Email & Password Authentication: Sign-in with email and password.

- Email Verification: Ensure account validity by requiring users to confirm their email address.

- Forgot Password Flow: Allow users to reset their password through a email link.

- Two-Factor Authentication (2FA): Login requires a digit verification code sent via email.

- User Account Settings: Let users update their username, change passwords, and enable or disable 2FA.

- Internationalization (i18n) with Auth Integration: Built-in locale routing with authentication middleware support.

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## 🚀 Getting Started

Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚙️ Environment Variables
This project uses separate environment files for local development and production.

### Local Development (`.env.development`)
Create a `.env.development` file in the project root. Next.js automatically uses this when you run `pnpm dev`. It should contain local credentials and use the local app URL:
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# Add your local MongoDB, Auth Secret, Google Client ID, etc. here.
```

### Production / Vercel (`.env.production`)
Create a `.env.production` file for testing production builds locally (via `pnpm build`), or add these variables directly in your **Vercel Project Settings**.
```env
NEXT_PUBLIC_APP_URL="https://restflow.vercel.app"
# Add your production MongoDB, Auth Secret, Google Client ID, etc. here.
```

## 🔐 Getting Google OAuth Credentials

How to obtain GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET

- Go to [Google Cloud Console](https://console.cloud.google.com/) .

- Create a new project.

- Navigate to APIs & Services → Credentials.
  
- Click Create Credentials → OAuth client ID.
  
- Choose Web application.

- Under Authorized JavaScript origins, add: http://localhost:3000 .

- Under Authorized redirect URIs, add: http://localhost:3000/api/auth/callback/google.

- Configure your OAuth consent screen and publish the app.

## 📚 Learn More

Explore these official resources to learn more:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [NextAuth.js Documentation](https://next-auth.js.org) - Learn how to implement secure authentication with OAuth, credentials, JWT, and more.
- [next-intl Documentation](https://next-intl.dev) - A internationalization solution for Next.js.

## ☁️ Deploy to Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
