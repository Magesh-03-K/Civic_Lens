# CivicLens Deployment Guide (Vercel & Supabase)

This guide walks you through deploying **CivicLens** to production on **Vercel** with a **Supabase** backend.

---

## 1. Prerequisites Checklist

Before deploying, ensure you have:
1. **GitHub Repository**: The codebase is already synced to [https://github.com/Magesh-03-K/Civic_Lens.git](https://github.com/Magesh-03-K/Civic_Lens.git).
2. **Supabase Account**: A Supabase project created (preferably in the **South Asia / Mumbai** region).
3. **Google AI Studio Key**: A Gemini API key from [Google AI Studio](https://aistudio.google.com/).
4. **Resend Account**: An API key from [Resend](https://resend.com/) for simulated dispatch emails.
5. **Vercel Account**: An account on [Vercel](https://vercel.com/) linked to your GitHub.

---

## 2. Supabase Backend Setup

### Step 2.1: Run Database Schema
1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **SQL Editor** in the left sidebar -> **New Query**.
3. Open `supabase/schema.sql` in this repo, copy all SQL statements, paste them into the editor, and click **Run**.
4. Confirm that the following 6 tables are created under **Table Editor**:
   - `departments` (with 6 initial seed departments)
   - `reports`
   - `report_media`
   - `status_events`
   - `resolutions`
   - `dispatches`
   *(All tables have Row Level Security enabled with no public access).*

### Step 2.2: Create Storage Bucket
1. In the Supabase sidebar, click **Storage**.
2. Click **New Bucket**.
3. Set **Bucket Name** to: `civic-media`
4. **Toggle "Public bucket" to ON** (citizens and authorities must be able to view uploaded photos/audio via public URLs).
5. Click **Save**.

### Step 2.3: Retrieve API Keys
Go to **Project Settings** -> **API** and copy:
- **Project URL** (`https://<project-ref>.supabase.co`)
- **anon / public key**
- **service_role key** *(Keep this secret; it is used only server-side by Next.js)*

---

## 3. Deploying to Vercel

### Step 3.1: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Find your GitHub repository `Magesh-03-K/Civic_Lens` and click **Import**.
4. In the configuration screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### Step 3.2: Configure Environment Variables
Expand the **Environment Variables** section on Vercel and add the following keys (set for both **Production** and **Preview**):

| Variable Name | Value / Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Your live Vercel production URL | `https://civiclens.vercel.app` (or temporary `https://<project>.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret key | `eyJhbGciOi...` |
| `SUPABASE_BUCKET` | Name of storage bucket | `civic-media` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Target Gemini Model | `gemini-flash-latest` |
| `GEMINI_FALLBACK_MODEL` | Fallback model (optional) | *(leave empty or set alternative)* |
| `RESEND_API_KEY` | Resend API Key | `re_123456...` |
| `DEMO_INBOX_EMAIL` | Verified email address for demo alerts | `your-email@example.com` |
| `AUTHORITY_PASSCODE` | Passcode for municipal authority portal | `civic-admin-secret-2026` |
| `SESSION_SECRET` | 32+ character random string for auth cookie | `e9f8a3c2b1d0...` |

> [!IMPORTANT]
> If you do not know your final Vercel domain yet:
> 1. Set `NEXT_PUBLIC_SITE_URL` to `https://localhost:3000` temporarily.
> 2. Complete deployment.
> 3. Once Vercel gives you the assigned domain (e.g., `https://civic-lens-xyz.vercel.app`), go to **Project Settings** -> **Environment Variables**, update `NEXT_PUBLIC_SITE_URL` with that URL, and trigger a **Redeploy**.

### Step 3.3: Disable Deployment Protection (Crucial for Public Access)
Since CivicLens is a public civic platform for citizens and hackathon evaluators:
1. In your Vercel Project, go to **Settings** -> **Deployment Protection**.
2. Ensure **Vercel Authentication** is **Disabled** (Off) so the site is accessible to anyone without requiring a Vercel login.

### Step 3.4: Deploy!
Click **Deploy**. Vercel will compile the Next.js App Router project using Turbopack and deploy to Mumbai (`bom1`) edge as defined in `vercel.json`.

---

## 4. Post-Deployment Verification

1. **Verify Health Endpoint**:
   Visit: `https://<your-vercel-domain>/api/health`
   You should see:
   ```json
   {
     "ok": true,
     "service": "CivicLens API",
     "milestone": "M0",
     "timestamp": "...",
     "environmentReady": true,
     "missingEnvKeys": []
   }
   ```
   If `environmentReady` is `false`, check `missingEnvKeys` and ensure all required variables are set in the Vercel dashboard.

2. **Verify Public Homepage**:
   Visit: `https://<your-vercel-domain>/`
   Verify that the page renders cleanly on both desktop and mobile viewports.

---

## 5. Ongoing Updates

Every time you push commits to GitHub:
```bash
git push origin main
```
Vercel will automatically build and deploy the update with zero downtime.
