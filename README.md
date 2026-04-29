# IEEE Docs Evaluator

An AI-powered, web-based platform for the centralized submission and automated evaluation of software engineering documents — specifically SRS, SDD, STD, and SPMP — built for students and teachers at Cebu Institute of Technology - University.

---

## Overview

IEEE Docs Evaluator consolidates four separate AI-driven document evaluator systems into a single integrated application. It eliminates redundant workflows (e.g., separate logins per system) and provides a unified environment for document submission, AI-powered analysis, and teacher feedback — all in one place.

---

## Features

- Google OAuth 2.0 — Secure role-based login for teachers and students
- Google Drive Integration — Document downloading and rendering for AI analysis
- Google Sheets Integration — Class roster, allowlist verification, and submission tracking
- AI-Powered Evaluation — Document analysis using OpenAI GPT models
- Role-Based Access — Separate dashboards and permissions for teachers and students
- Centralized Submission Portal — Submit and track SRS, SDD, STD, and SPMP documents in one place
- SSE Progress Streaming — Real-time step-by-step evaluation progress shown in the UI
- Annotation System — Teachers can highlight and annotate specific sections of an evaluation report
- Prompt Customization — Per-document-type rubric, diagram, and step overrides configurable by the professor
- Evaluation History and Versioning — Every evaluation is saved as a new version for comparison over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Spring Boot 4 (Java 21) |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth 2.0 via Supabase |
| Storage | Google Drive API |
| Spreadsheet | Google Sheets API |
| AI Provider | OpenAI API |
| PDF Rendering | Apache PDFBox |
| Text Extraction | Apache Tika |

---

## Project Structure

```
IEEE-Docs-Evaluator/
├── Frontend/               # React + Vite application
└── Backend/
    └── docs-evaluator/     # Spring Boot application
```

---

## Getting Started

### Prerequisites

- Node.js (v20+) and npm
- Java 21+
- Maven
- A Google Cloud project with the following APIs enabled:
  - Google OAuth 2.0
  - Google Drive API
  - Google Sheets API
- An OpenAI API key
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

For local development, create `Backend/docs-evaluator/src/main/resources/application-secrets.properties` and fill in real values:

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

# CORS
app.cors.allowed-origins=http://localhost:5173
app.openrouter.http-referer=http://localhost:5173
app.openrouter.app-title=IEEE Docs Evaluator (Local)

# Optional logging
spring.jpa.show-sql=false
```

### Local Development Workflow

This project is deployment-configured, but local development is fully supported.

1. Do not edit deployment files for local secrets.
2. Put local backend secrets only in `Backend/docs-evaluator/src/main/resources/application-secrets.properties` (already git-ignored).
3. Put local frontend secrets only in `Frontend/.env.local` (already git-ignored).
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

---

## Deployment (Render + Vercel)

### Backend on Render

1. Create a Render Web Service from this repository.
2. Set the backend root directory to `Backend/docs-evaluator`.
3. Deploy via Blueprint using `render.yaml` at the repo root.
4. Configure the following environment variables in Render:

| Key | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | Supabase pooler JDBC connection string |
| `SPRING_DATASOURCE_USERNAME` | Supabase database username |
| `SPRING_DATASOURCE_PASSWORD` | Supabase database password |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins (include your Vercel URL) |
| `GOOGLE_SHEET_ID` | Google Spreadsheet ID for roster and submissions |
| `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | Google service account credentials (provide one) |
| `OPENROUTER_HTTP_REFERER` | Your frontend URL |
| `OPENROUTER_APP_TITLE` | Application title shown in API requests |

AI provider credentials (OpenAI API key and model) are stored in the database via the System Settings panel in the teacher dashboard — they do not need to be set as environment variables.

### Frontend on Vercel

1. Import the repository in Vercel.
2. Set the project root directory to `Frontend`.
3. Build settings:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Configure the following environment variables in Vercel:

| Key | Description |
|---|---|
| `VITE_API_BASE_URL` | Your Render backend URL, e.g. `https://<service>.onrender.com/api` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Pre-deploy verification

```bash
# Frontend
cd Frontend
npm ci
npm run lint
npm run build

# Backend
cd Backend/docs-evaluator
./mvnw test
./mvnw clean package
```

---

## User Roles

### Teacher

- View all student submissions synced from Google Sheets
- Run AI evaluation on any submission using an OpenAI model
- Configure the evaluation rubric, diagram analysis instructions, and prompt steps per document type
- Edit and annotate AI-generated evaluation reports
- Send evaluation results to the student dashboard
- Manage system settings including the OpenAI API key and model selection

### Student

- View AI evaluation reports sent by the professor
- See inline annotation comments left by the professor
- Filter evaluations by document type (SRS, SDD, SPMP, STD)

---

## Supported Document Types

| Type | Standard |
|---|---|
| SRS | IEEE 830 — Software Requirements Specification |
| SDD | IEEE 1016 — Software Design Description |
| SPMP | IEEE 1058 — Software Project Management Plan |
| STD | IEEE 829 — Software Test Documentation |

---

## Proponents

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

Adviser: Sir Ralph P. Laviste

---

## License

This project is developed as an academic requirement for IT411 at Cebu Institute of Technology - University. All rights reserved by the respective proponents.
