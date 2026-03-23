# IEEE-Docs-Evaluator

An AI-powered, web-based platform for the centralized submission and automated evaluation of software engineering documents — specifically **SRS**, **SDD**, **STD**, and **SPMP** — built for students and teachers at Cebu Institute of Technology - University.

---

## 📌 Overview

IEEE Docs Evaluator consolidates four separate AI-driven document evaluator systems into a single integrated application. It eliminates redundant workflows (e.g., separate logins per system) and provides a unified environment for document submission, AI-powered analysis, and teacher feedback — all in one place.

---

## ✨ Features

- **Google OAuth 2.0** — Secure role-based login for teachers and students
- **Google Drive Integration** — Class folder creation and document storage
- **Google Sheets Integration** — Automated recording of submissions, AI results, and teacher feedback
- **AI-Powered Evaluation** — Document analysis using Gemini, OpenAI GPT, or OpenRouter models
- **Role-Based Access** — Separate dashboards and permissions for teachers and students
- **Centralized Submission Portal** — Submit and track SRS, SDD, STD, and SPMP documents in one place

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite |
| Backend | Spring Boot (Java) |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth 2.0 + JWT |
| Storage | Google Drive API |
| Spreadsheet | Google Sheets API |
| AI Providers | Gemini API, OpenAI API, OpenRouter API |
| PDF Parsing | Apache PDFBox |
| HTTP Client | Axios |

---

## 📁 Project Structure

```
IEEE-Docs-Evaluator/
├── Frontend/          # React.js + Vite application
└── Backend/
    └── docs-evaluator/ # Spring Boot application
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+) and npm
- Java 21+
- Maven
- A Google Cloud project with the following APIs enabled:
  - Google OAuth 2.0
  - Google Drive API
  - Google Sheets API
- API keys for at least one AI provider (Gemini, OpenAI, or OpenRouter)
- A Supabase project (PostgreSQL)

---

### Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

Create a `.env.local` file in the `Frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

For deployment, start from `Frontend/.env.example`.

---

### Backend Setup

```bash
cd Backend/docs-evaluator
mvn spring-boot:run
```

For deployment, start from `Backend/docs-evaluator/.env.render.example` and map each key into Render environment variables.
For local teammate setup, create `Backend/docs-evaluator/src/main/resources/application-secrets.properties` and fill in real values:

```properties
# Database (Supabase Pooler)
spring.datasource.url=jdbc:postgresql://<project-host>.pooler.supabase.com:6543/postgres?sslmode=require
spring.datasource.username=postgres.<project-ref>
spring.datasource.password=<db-password>

# Google integrations
app.google.spreadsheet-id=<google-sheet-id>
# Provide ONE only:
app.google.service-account-json=
app.google.service-account-json-base64=<base64-service-account-json>

# Local runtime behavior
app.cors.allowed-origins=http://localhost:5173
app.openrouter.http-referer=http://localhost:5173
app.openrouter.app-title=IEEE Docs Evaluator (Local)

# Optional logging
spring.jpa.show-sql=false
```

### Local Teammate Workflow (Safe for Render/Vercel)

This project is deployment-configured, but local development remains fully supported.

1. **Do not edit** deployment files for local secrets.
2. Put local backend secrets only in:
  - `Backend/docs-evaluator/src/main/resources/application-secrets.properties` (already git-ignored)
3. Put local frontend secrets only in:
  - `Frontend/.env.local` (already git-ignored by `*.local`)
4. Start services locally:

```bash
# Terminal 1
cd Backend/docs-evaluator
./mvnw spring-boot:run

# Terminal 2
cd Frontend
npm install
npm run dev
```

This local workflow does not affect Render/Vercel configuration.

---

## ☁️ Deployment (Render + Vercel)

### Backend → Render

1. Create a Render Web Service from this repository.
2. Use the backend root directory: `Backend/docs-evaluator`.
3. Deploy via Blueprint using `render.yaml` at repo root.
4. If Render reports `invalid runtime java`, keep using Blueprint and Docker mode (already configured in `render.yaml`).
5. Configure these environment variables in Render:
  - `SPRING_DATASOURCE_URL`
  - `SPRING_DATASOURCE_USERNAME`
  - `SPRING_DATASOURCE_PASSWORD`
  - `CORS_ALLOWED_ORIGINS` (include your Vercel URL, optionally localhost)
  - `GOOGLE_SHEET_ID`
  - `GOOGLE_SERVICE_ACCOUNT_JSON` **or** `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
  - `OPENROUTER_HTTP_REFERER` (recommended: your frontend URL)
  - `OPENROUTER_APP_TITLE`

The backend now uses non-interactive service-account credentials for Google APIs (Render-safe) and centralized CORS via `CORS_ALLOWED_ORIGINS`.

### Frontend → Vercel

1. Import the same repository in Vercel.
2. Set project root directory to `Frontend`.
3. Vercel build settings:
  - Install command: `npm ci`
  - Build command: `npm run build`
  - Output directory: `dist`
4. Configure these environment variables in Vercel:
  - `VITE_API_BASE_URL` (e.g. `https://<render-service>.onrender.com/api`)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GOOGLE_CLIENT_ID`

### Local verification before deploy

Frontend:

```bash
cd Frontend
npm ci
npm run lint
npm run build
```

Backend:

```bash
cd Backend/docs-evaluator
./mvnw test
./mvnw clean package
```

---

## 👥 User Roles

### Teacher
- Upload a class list (CSV/XLSX) to register students
- Create and manage Google Drive folders per document type
- View all student submissions and their AI evaluation results
- Provide manual scores and written feedback

### Student
- Submit documents (SRS, SDD, STD, SPMP) via Google Drive link
- Trigger AI evaluation on submitted documents
- View AI evaluation results (scores, strengths, weaknesses, feedback)
- View teacher scores and feedback

---


## 👨‍💻 Proponents

Groups 2, 3, 6, and 11 — IT411 Capstone and Research 2 (G01 + G02)
College of Computer Studies, Cebu Institute of Technology - University
AY 2025–2026, 2nd Semester

| Name |
|---|
| Bustamante, William |
| Cantiller, Christian Jayson |
| Diva, Justin Andry |
| Dy, Jivonz |
| Flores, E.J. Boy |
| Fuentes, Japeth Luke |
| Gabiana, Nicolo Francis |
| Go, Felix Christian |
| Lada, Nathan Xander |
| Laborada, John Joseph |
| Lapure, Jessie Noel |
| Lawas, Jose Raphael |
| Mendoza, Jenelyn |
| Oswa, Yusuf |
| Pepito, John Patrick |
| Perales, Clint |
| Saniel, Mitchel Gabrielle |
| Verano, Joel |
| Ygot, Dante |

**Adviser:** Sir Ralph P. Laviste

---

## 📄 License

This project is developed as an academic requirement for IT411 at Cebu Institute of Technology - University. All rights reserved by the respective proponents.