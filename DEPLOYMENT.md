# CivicLens Deployment Guide (Vercel & Render)

This guide walks you through deploying **CivicLens** to production on **Vercel** (recommended by the hackathon spec) or **Render** with a **Supabase** backend.

---

## Which Platform Should You Choose?

| Feature | Vercel (Recommended) | Render |
| :--- | :--- | :--- |
| **Hackathon Spec** | Explicitly specified in the project prompt | Works, but not the default hackathon target |
| **Next.js App Router** | Native zero-config support (built by Vercel) | Runs via Node server (`npm start`) |
| **Cold Starts (Free Tier)** | **Zero cold starts** (Serverless functions) | **Spins down after 15 min** (takes 50s+ to wake up for judges) |
| **Best For** | Instant response, optimal performance | Standard Docker / Node container hosting |

---

## 1. Prerequisites Checklist

Before deploying, ensure you have:
1. **GitHub Repository**: The codebase is already synced to [https://github.com/Magesh-03-K/Civic_Lens.git](https://github.com/Magesh-03-K/Civic_Lens.git).
2. **Supabase Account**: A Supabase project created (preferably in the **South Asia / Mumbai** region).
3. **Google AI Studio Key**: A Gemini API key from [Google AI Studio](https://aistudio.google.com/).
4. **Resend Account**: An API key from [Resend](https://resend.com/) for simulated dispatch emails.
5. **Hosting Account**: Either [Vercel](https://vercel.com/) or [Render](https://render.com/).

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

## 3A. Option A: Deploy to Vercel (Recommended)

### Step 3A.1: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Find your GitHub repository `Magesh-03-K/Civic_Lens` and click **Import**.
4. In the configuration screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### Step 3A.2: Configure Environment Variables
Expand the **Environment Variables** section on Vercel and add the keys (see table in Section 4 below).

### Step 3A.3: Disable Deployment Protection (Crucial for Public Access)
1. In your Vercel Project, go to **Settings** -> **Deployment Protection**.
2. Ensure **Vercel Authentication** is **Disabled** (Off) so the site is accessible to anyone without requiring a Vercel login.

### Step 3A.4: Deploy!
Click **Deploy**.

---

## 3B. Option B: Deploy to Render

If you prefer deploying on Render:

### Step 3B.1: Create a Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub account and select `Magesh-03-K/Civic_Lens`.
4. Configure the service settings:
   - **Name**: `civiclens` (or your choice)
   - **Region**: Singapore or nearest
   - **Branch**: `main`
   - **Root Directory**: Leave blank (default `./`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Step 3B.2: Configure Environment Variables on Render
Under the **Environment Variables** section on Render, add the environment variables listed in Section 4 below. Note: Set `NEXT_PUBLIC_SITE_URL` to `https://<your-service-name>.onrender.com`.

### Step 3B.3: Node Version
Add this environment variable so Render uses Node 20+:
- Key: `NODE_VERSION`
- Value: `20.18.0` (or `22`)

### Step 3B.4: Deploy!
Click **Create Web Service**. Render will install packages, run the Next.js build, and start the service.

---

## 4. Environment Variables Reference

Add these variables to either Vercel or Render:

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Your live production URL | `https://civiclens.vercel.app` or `https://civiclens.onrender.com` |
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

---

## 5. Post-Deployment Verification

1. **Verify Health Endpoint**:
   Visit: `https://<your-deployed-domain>/api/health`
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
2. **Verify Public Homepage**:
   Visit: `https://<your-deployed-domain>/`

