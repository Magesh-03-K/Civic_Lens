# CivicLens

> **Transparent Civic Grievance & Infrastructure Triage Platform**  
> *Developed for the IDEA//FORGE Online Hackathon (Madurai, Tamil Nadu, India context).*

[![Live Web Application](https://img.shields.io/badge/Live%20App-civiclens.vercel.app-2563eb?style=for-the-badge&logo=vercel)](https://civiclens-powgrfqmj-magesh-k.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Civic__Lens-181717?style=for-the-badge&logo=github)](https://github.com/Magesh-03-K/Civic_Lens)

🌐 **Live Application URL:** [https://civiclens-powgrfqmj-magesh-k.vercel.app](https://civiclens-powgrfqmj-magesh-k.vercel.app)

---

## 📌 Project Summary

CivicLens transforms traditional, slow, and opaque civic complaint portals into a real-time, explainable, and accountable municipal response system tailored for Madurai, Tamil Nadu. 

Citizens report infrastructure hazards—such as deep road potholes, snapped electrical cables, raw sewage overflows, open manholes, drinking water pipe bursts, and garbage mounds—in seconds using photos or voice notes in Tamil or English. The platform operates with **zero personal data collection** (no citizen names, phone numbers, or emails required) and automatically strips sensitive EXIF GPS metadata client-side before upload.

### Core Breakthroughs:
1. **Multimodal AI Vision & Audio Triage:** Powered by Google Gemini 2.5 Flash, evidence is evaluated across 10 categories and rated on 4 objective severity factors (Safety Risk, Population Impact, Urgency/Spread, Location Sensitivity). If AI is unreachable, an intelligent deterministic keyword fallback classifies and scores the incident safely.
2. **Deterministic 0–100 Severity Scoring:** Removes human bias and opaque prioritization through an open mathematical formula with strict SLA timeframes: P1 (24 Hours), P2 (72 Hours), P3 (7 Days), and P4 (14 Days). A built-in time decay multiplier dynamically escalates neglected tickets so issues never rot in backlog.
3. **50-Meter Spatial Deduplication:** When multiple citizens photograph the same pothole or hazard within 50 meters, CivicLens automatically merges the submissions into a single ticket, boosting its community priority signal rather than creating duplicate work orders.
4. **Automated Municipal Routing:** Tickets are dispatched immediately to 6 Madurai Corporation and state agency departments with full dispatch audit trails.
5. **Closed-Loop Resolution Verification:** Authorities upload a post-repair "After" photo, which Gemini vision compares against the original "Before" photo to verify that the defect was genuinely fixed at the same coordinates before allowing the ticket to close.

---

## Key Features

- **Multimodal Citizen Reporting (Mobile-First):**
  - Instant camera capture with client-side canvas resizing (max 1600px, JPEG 0.8) and automatic EXIF GPS stripping to protect citizen privacy.
  - In-browser voice notes in Tamil or English resampled to 16kHz mono PCM WAV via Web Audio API.
  - Interactive Leaflet map with high-accuracy GPS positioning and draggable pin placement.
  - Direct signed uploads straight to Supabase Storage, bypassing server payload limits.

- **Objective 0–100 Severity Scoring & Dynamic Aging:**
  - Open, mathematically explainable formula weighting Safety Risk (35%), Population Impact (25%), Urgency & Spread (15%), Location Sensitivity (10%), Community Signal (10%), and Ticket Age (5%).
  - Real-time time-decay multiplier that escalates neglected tickets automatically over time.
  - Strict Service Level Agreements (SLAs): P1 (24 Hours), P2 (72 Hours), P3 (7 Days), and P4 (14 Days).

- **50-Meter Spatial Deduplication:**
  - Automated bounding box query and Haversine distance verification merges duplicate reports submitted within 50 meters into a single ticket.
  - Increments community signal without dispatching redundant field crews.

- **Automated Municipal Department Routing:**
  - Intelligent routing to 6 Madurai Corporation and Tamil Nadu state divisions:
    1. Madurai Corporation – Roads & Engineering (`roads`)
    2. Water Supply & Drainage (TWAD / Corporation) (`water`)
    3. Solid Waste Management – Madurai Corporation (`swm`)
    4. Tamil Nadu Pollution Control Board (`pcb`)
    5. Tamil Nadu Electricity Board (`elec`)
    6. Madurai Corporation – General Grievance Cell (`general`)
  - Automated simulated dispatch notifications sent to a dedicated demo inbox.

- **Closed-Loop AI Fix Verification & Authority Portal:**
  - Passcode-secured municipal authority interface protected with timing-safe checks and HMAC-SHA256 session cookies.
  - Post-repair "After" photo uploads evaluated by Gemini vision to confirm that the exact physical defect was repaired at the identical coordinates.
  - Full audit-logged manual human override requiring staff justification if AI flags uncertainty.

- **Public Transparency Dashboard:**
  - Real-time Leaflet map colored by priority (P1 Red, P2 Orange, P3 Yellow, P4 Green).
  - SLA compliance charts and department resolution analytics built with Recharts.
  - Full public ticket tracking pages with live countdown timers, factor breakdowns, and Before/After verification views.

---

## System Architecture

```
[ Citizen Reporter (Mobile/Web) ]
       │
       ├─ Direct Storage Upload (Signed URL) ──> [ Supabase S3 Storage (civic-media) ]
       │
       └─ Report Submission (JSON) ──> [ Next.js App Router API Route (/api/reports) ]
                                              │
                      ┌───────────────────────┴────────────────────────┐
                      ▼                                                ▼
         [ Gemini 2.5 Flash Multimodal ]                    [ PostgreSQL Database ]
         - Visual / Audio Defect Analysis                   - 50m Deduplication Bounding Box
         - Factor Scoring (Safety, Population, etc.)        - Report Ingestion & Merging
         - Rule-Based Fallback if Quota Exceeded            - Row Level Security (RLS)
                      │                                                │
                      └───────────────────────┬────────────────────────┘
                                              ▼
                                 [ Severity & Routing Engine ]
                                 - 0–100 Weighted Score (P1–P4)
                                 - Department Resolution
                                 - SLA Due Date Calculation
                                              │
                                              ▼
                                  [ Simulated Dispatch Log ]
                                  - Resend API -> DEMO_INBOX_EMAIL
```

---

## The Severity Scoring Formula

Unlike proprietary municipal triage black-boxes, CivicLens computes ticket priority through an open, transparent formula:

$$\text{Score} = 10 \times \Big( 0.35 \times \text{Safety} + 0.25 \times \text{Population} + 0.15 \times \text{Urgency} + 0.10 \times \text{Location} + 0.10 \times \text{Community} + 0.05 \times \text{Age} \Big)$$

### Factor Weights

| Factor | Weight | Range | Evaluation Rules |
| :--- | :---: | :---: | :--- |
| **Safety Risk** | 35% | 0–10 | Direct danger to human life, vehicular collision hazard, electrocution, or open drain falls. |
| **Population Impact** | 25% | 0–10 | Foot traffic volume, arterial transit corridors (e.g. Periyar Bus Stand), or commercial density. |
| **Urgency & Spread** | 15% | 0–10 | Rate of defect escalation (e.g. pressurized pipe burst vs. static asphalt wear). |
| **Location Sensitivity** | 10% | 0–10 | Proximity to schools, hospitals, transit terminals, or heritage sites (e.g. Meenakshi Temple). |
| **Community Signal** | 10% | 0–10 | Computed from merged reports: $\min(10, 2.5 \times (\text{report\_count} - 1))$. |
| **Age of Ticket** | 5% | 0–10 | Scaled over 14 days open: $\min(10, \frac{10 \times \text{daysOpen}}{14})$. Prevents neglected tickets from rotting. |

### Priority Bands & SLAs

| Priority | Score Range | SLA Deadline | Classification |
| :---: | :---: | :---: | :--- |
| **P1** | 80 – 100 | **24 Hours** | Critical emergency (Immediate threat to life or arterial transit shutdown). |
| **P2** | 60 – 79 | **72 Hours** | High priority (Severe disruption, sanitation contamination, major main burst). |
| **P3** | 40 – 59 | **7 Days** (168h) | Moderate civic issue (Unlit streetlights, surface potholes, localized waste). |
| **P4** | 0 – 39 | **14 Days** (336h) | Low priority (Minor cosmetic defects, garden trimmings, loose curbstones). |

---

## 50-Meter Deduplication Engine

When a new report is submitted:
1. A spatial bounding box query ($\approx \pm 0.001^\circ$ lat/lng) scans open tickets in the same category.
2. The Haversine formula calculates the exact spherical distance between the new report and nearby incidents:
   $$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
3. If $d \le 50\text{ meters}$, the report is merged into the existing ticket:
   - `report_count` increases by 1.
   - The photo is added to `report_media`.
   - Dynamic severity score is recalculated with the increased community signal.
   - SLA deadline automatically adjusts if the priority band increases.
   - The user is notified with the existing ticket ID and status.

---

## Environment Variables

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base public domain URL | `https://civiclens.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project REST URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Yes | Supabase Client Anonymous API Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Administrative Service Key | `eyJhbGciOi...` |
| `SUPABASE_BUCKET` | No | Supabase Storage Bucket name | `civic-media` |
| `GEMINI_API_KEY` | Yes | Google GenAI API Key | `AIzaSy...` |
| `GEMINI_MODEL` | No | Primary Gemini multimodal model | `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL` | No | Fallback Gemini model | `gemini-1.5-flash` |
| `RESEND_API_KEY` | Yes | Resend Email API Key | `re_...` |
| `DEMO_INBOX_EMAIL` | Yes | Safe destination for simulated dispatch | `demo@example.com` |
| `AUTHORITY_PASSCODE` | Yes | Passcode for municipal staff portal | `Madurai@Admin2026` |
| `SESSION_SECRET` | Yes | HMAC-SHA256 cookie signing secret (32+ chars) | `your-cryptographic-secret` |

---

## Local Development & Setup

### 1. Prerequisites
- Node.js 20+ or 22+
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/Magesh-03-K/Civic_Lens.git
cd Civic_Lens
npm install
```

### 3. Environment Setup
Copy the example environment file and add your credentials:
```bash
cp .env.example .env.local
```

### 4. Database Setup
1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project and open the **SQL Editor**.
3. Run the complete schema script located at [`supabase/schema.sql`](supabase/schema.sql).
4. Create a public storage bucket named `civic-media` under Storage.

### 5. Verify Gemini Connection
Verify your Gemini API key and active model endpoints:
```bash
npx tsx scripts/check-gemini.ts
```

### 6. Seed Realistic Demonstration Data
Populate 28 realistic Madurai civic incidents across categories, wards, and SLA statuses:
```bash
npm run seed
```

### 7. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view CivicLens.

---

## Testing & Quality Assurance

CivicLens enforces complete test coverage, type safety, and zero secret leakage:

```bash
# Run Vitest test suite (48 tests across 11 test suites)
npm test

# Run ESLint static analysis
npm run lint

# Compile production build
npm run build

# Run automated acceptance verification suite (24 tests)
npx tsx scripts/verify-acceptance.ts

# Verify zero server secrets in browser bundles
npx tsx scripts/verify-no-secrets.ts
```

---

## Deployment to Vercel

CivicLens is optimized for Vercel deployment with edge proximity to India:
1. Push this repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Configure all environment variables listed in `.env.example`.
4. The repository includes [`vercel.json`](vercel.json) pinning execution to Mumbai (`bom1`) for low latency.

---

## Privacy by Design & Safety Disclosures

- **Zero Citizen PII:** No names, phone numbers, or email addresses are requested or saved.
- **Client-Side EXIF GPS Stripping:** User images are re-drawn to canvas before transmission, stripping device identifiers and EXIF GPS tags.
- **Data Isolation:** Citizen raw free-form text is stored securely server-side and is never exposed through public read APIs.
- **AI-Assisted Notice:** All machine learning outputs are labelled as "AI-Assisted" with confidence metrics; low confidence scores or API faults trigger human-review flags.
- **Simulated Dispatch:** In accordance with hackathon safety, municipal notifications are delivered to `DEMO_INBOX_EMAIL`.
- **Sample Watermarks:** Seeded demonstration reports feature prominent `★ SAMPLE SEED MEDIA` indicators.

---

## Technology Stack & Credits

- **Google Gemini 2.5 Flash:** Multimodal image, audio, and Before/After verification AI.
- **Supabase & PostgreSQL:** Relational database with Row Level Security and S3-compatible media storage.
- **Next.js 16 (App Router & Turbopack):** Modern React 19 server components and server actions.
- **Tailwind CSS v4:** Modern styling and responsive mobile layout.
- **Leaflet & OpenStreetMap:** High-accuracy interactive mapping and spatial deduplication.
- **Recharts:** SLA analytics and departmental compliance charting.
- **Resend:** Transactional email delivery for municipal dispatch alerts.
- **Google Antigravity:** Full-stack agentic architecture and autonomous software development.

---

## License

MIT License. Developed for the IDEA//FORGE Online Hackathon 2026.
