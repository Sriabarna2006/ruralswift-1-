# 📚 RuralSwift — Complete Learning Guide (`teachme.md`)

> **Who is this for?**
> This guide is written for someone who has **never built a full-stack web app** before and may be new to JavaScript, TypeScript, Angular, or Node.js. Every concept is explained from first principles. By the end, you will be able to replicate this entire project on your own, from a blank folder to a running application.

---

## Table of Contents

1. [What Is RuralSwift?](#1-what-is-ruralswift)
2. [Technology Stack — Plain English](#2-technology-stack--plain-english)
3. [Prerequisites — What You Need Before You Start](#3-prerequisites--what-you-need-before-you-start)
4. [Step-by-Step Installation](#4-step-by-step-installation)
5. [Project File Structure — Every Folder and File Explained](#5-project-file-structure--every-folder-and-file-explained)
6. [The Backend (Server) — How It Works](#6-the-backend-server--how-it-works)
7. [The Database — NeonDB and PostgreSQL](#7-the-database--neondb-and-postgresql)
8. [The Frontend (Angular) — How It Works](#8-the-frontend-angular--how-it-works)
9. [How the Frontend and Backend Talk to Each Other](#9-how-the-frontend-and-backend-talk-to-each-other)
10. [Authentication — Login, Register, and JWT Tokens](#10-authentication--login-register-and-jwt-tokens)
11. [Running the Project](#11-running-the-project)
12. [Rebuilding the Project from Scratch](#12-rebuilding-the-project-from-scratch)
13. [Common Issues and Troubleshooting](#13-common-issues-and-troubleshooting)
14. [Glossary — Key Terms Explained](#14-glossary--key-terms-explained)

---

## 1. What Is RuralSwift?

RuralSwift is a **full-stack e-commerce web application** designed to serve rural customers. It currently includes:

- A **home page** (landing / marketing page)
- A **registration page** for creating a new account
- A **login page** for signing in
- A **customer dashboard** after login
- A **profile page** where users can view and update their personal details
- A **forgot-password page**

The application is split into two separate but connected programs that run at the same time:

| Part | What it does | Where it runs |
|------|-------------|---------------|
| **Frontend** (Angular) | What the user sees in the browser | `http://localhost:4200` |
| **Backend** (Express / Node.js) | Handles data, logic, and the database | `http://localhost:3000` |

Think of it like a restaurant: the **frontend** is the dining room where customers sit, and the **backend** is the kitchen where food is actually made.

---

## 2. Technology Stack — Plain English

Here is every technology used and what it does:

| Technology | Plain English Explanation |
|-----------|--------------------------|
| **Angular 22** | A JavaScript framework for building the user interface (the pages you see). It's like a very structured way to write HTML + JavaScript together. |
| **TypeScript** | A version of JavaScript that adds "types" (rules about what kind of data a variable holds). Angular is written in TypeScript. |
| **Node.js** | A way to run JavaScript outside a browser — used here to run the back-end server. |
| **Express 5** | A mini web server framework for Node.js. It listens for web requests and sends back responses. |
| **PostgreSQL** | A powerful, free, open-source database. Stores all the user, product, and order data. |
| **NeonDB** | A cloud-hosted PostgreSQL service. You don't run a database on your computer; instead, NeonDB hosts it for you in the cloud. |
| **`pg` (node-postgres)** | The Node.js library that lets the Express server talk to the PostgreSQL database. |
| **JWT (JSON Web Token)** | A small, secure ticket that proves a user is logged in. Given at login, sent with every protected request. |
| **bcrypt** | A library that scrambles (hashes) passwords before saving them. Even the database can't read what the original password was. |
| **dotenv** | Reads a `.env` file and loads secret values (like database passwords) into the running app without hardcoding them in code. |
| **Bootstrap 5 + Bootstrap Icons** | Pre-made CSS styles and icons to make pages look professional quickly. |
| **Tailwind CSS** | Another CSS utility framework loaded via CDN for rapid styling. |
| **GSAP** | A JavaScript animation library for smooth visual effects. |
| **Poppins (Google Font)** | The font used throughout the application. |
| **nodemon** | A development tool that automatically restarts the server every time you save a file. |
| **Prettier** | A code formatter that keeps code consistently styled. |

---

## 3. Prerequisites — What You Need Before You Start

Before you can run anything, you need to install the following tools on your computer. Think of them as the "ingredients" you need before you can cook.

### 3.1 Node.js and npm

Node.js is the engine that runs JavaScript on your computer. `npm` (Node Package Manager) comes with it and is used to install libraries.

**Check if already installed:**
```bash
node --version   # Should print something like v20.x.x
npm --version    # Should print something like 10.x.x
```

**If not installed:**
1. Go to https://nodejs.org
2. Download the **LTS (Long-Term Support)** version
3. Run the installer and follow the steps

> **Tip:** This project uses `npm@11`. After installing Node, you can update npm by running: `npm install -g npm@latest`

### 3.2 Angular CLI

The Angular CLI (Command Line Interface) is a tool that helps create, serve, and build Angular projects.

**Install it:**
```bash
npm install -g @angular/cli
```

**Check if installed:**
```bash
ng version
```

### 3.3 Git (Optional but Recommended)

Git lets you download (clone) this project and track your own changes.

**Check if installed:**
```bash
git --version
```

**If not installed:** Go to https://git-scm.com and download the installer.

### 3.4 A Code Editor

We recommend **Visual Studio Code** (VS Code):
- Download from https://code.visualstudio.com
- Recommended extensions: ESLint, Prettier, Angular Language Service

### 3.5 A NeonDB Account (for the Database)

NeonDB is used for the cloud PostgreSQL database.

1. Go to https://neon.tech
2. Create a free account
3. Create a new project
4. Copy the **Connection String** — it looks like:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```
   You will need this later.

---

## 4. Step-by-Step Installation

Follow these steps in order. Don't skip any.

### Step 1 — Get the Project Files

**Option A: Clone with Git**
```bash
git clone <your-repository-url> ruralswift-venkat
cd ruralswift-venkat
```

**Option B: Download as ZIP**
- Download the ZIP file of the project
- Extract it to a folder (e.g., `D:\ruralswift-venkat`)
- Open a terminal and navigate to that folder

### Step 2 — Install All Dependencies

This single command reads the `package.json` file and installs every library the project needs (both frontend and backend).

```bash
npm install
```

> This may take a few minutes. It will create a `node_modules` folder with hundreds of files — that is normal.

### Step 3 — Set Up Environment Variables

Environment variables are secret values that the app needs but that you never want to commit to Git (like database passwords).

1. There is already a `.env` file in the project root. **Open it.**
2. It contains:
   ```env
   # NeonDB Connection String
   DATABASE_URL=postgresql://your_user:your_password@your_host/your_db?sslmode=require&channel_binding=require

   # JWT Secret - change this to a strong random string in production
   JWT_SECRET=ruralswift_jwt_secret_2024_change_in_production

   # Server Port
   PORT=3000
   ```
3. Replace the `DATABASE_URL` value with **your own NeonDB connection string** from Step 3.5 above.
4. Optionally, change `JWT_SECRET` to a long random string for security.

> **What is a JWT Secret?** It's a secret "password" used to sign and verify login tokens. Never share it publicly.

### Step 4 — Verify the Database Connection

Run this diagnostic script to make sure the app can connect to your database:

```bash
node server/src/scripts/check-db.js
```

If it connects successfully, you'll see a list of database tables. If not, see [Troubleshooting](#13-common-issues-and-troubleshooting).

### Step 5 — Start the Backend Server

Open a **new terminal window** (keep it open) and run:

```bash
npm run server
```

You should see output like:
```
✅  Connected to NeonDB (PostgreSQL)
✅  Schema migration complete
    → Existing tables updated (users, orders, products)
    → New tables: addresses, wishlist, notifications

🚀  RuralSwift API running at http://localhost:3000
📋  Routes:
    POST  /api/auth/register
    POST  /api/auth/login
    GET   /api/profile
    PUT   /api/profile
    GET   /api/health
```

> The database tables are **automatically created** when the server starts. You don't need to run any SQL manually.

### Step 6 — Start the Frontend (Angular)

Open a **second terminal window** (keep both terminals open) and run:

```bash
npm start
```

Angular will compile and start. You'll see:
```
✔ Browser application bundle generation complete.
Local:   http://localhost:4200/
```

Open your browser and go to **http://localhost:4200** to see the app.

---

## 5. Project File Structure — Every Folder and File Explained

Here is the complete map of the project. Understanding this is crucial.

```
ruralswift-venkat/
│
├── .env                        ← Secret environment variables (DB URL, JWT secret)
├── .gitignore                  ← Files Git should ignore (node_modules, .env, etc.)
├── .prettierrc                 ← Code formatting rules
├── .editorconfig               ← Editor settings (tabs, line endings, etc.)
├── angular.json                ← Angular build configuration
├── package.json                ← Project metadata + list of all dependencies
├── package-lock.json           ← Exact versions of every installed package (auto-generated)
├── tsconfig.json               ← TypeScript compiler settings
├── tsconfig.app.json           ← TypeScript settings specific to the Angular app
├── tsconfig.spec.json          ← TypeScript settings for tests
├── README.md                   ← Basic project info
├── teachme.md                  ← THIS FILE — the complete learning guide
│
├── public/                     ← Static assets served by Angular (favicon, images)
│
├── src/                        ← ALL Angular frontend source code lives here
│   ├── index.html              ← The single HTML page Angular renders into
│   ├── main.ts                 ← Angular's starting point — bootstraps the app
│   ├── styles.css              ← Global CSS styles for the entire frontend
│   └── app/                   ← The core Angular application
│       ├── app.ts              ← Root component (the shell wrapping every page)
│       ├── app.html            ← Root component's HTML template
│       ├── app.css             ← Root component styles
│       ├── app.config.ts       ← App-level configuration (routing, HTTP client)
│       ├── app.routes.ts       ← URL routing — maps URLs to page components
│       ├── app.spec.ts         ← Tests for the root component
│       │
│       ├── services/           ← Code that talks to the backend API
│       │   └── api.service.ts  ← Single service handling all HTTP requests
│       │
│       └── pages/              ← Each folder = one page of the app
│           ├── home/           ← Landing page (/)
│           │   ├── home.ts
│           │   ├── home.html
│           │   └── home.css
│           ├── login/          ← Login page (/login)
│           │   ├── login.ts
│           │   ├── login.html
│           │   ├── login.css
│           │   └── login.spec.ts
│           ├── register/       ← Registration page (/register)
│           │   ├── register.ts
│           │   ├── register.html
│           │   └── register.css
│           ├── customer-dashboard/ ← Dashboard after login (/dashboard)
│           │   ├── customer-dashboard.ts
│           │   ├── customer-dashboard.html
│           │   └── customer-dashboard.css
│           ├── profile/        ← User profile page (/profile)
│           │   ├── profile.ts
│           │   ├── profile.html
│           │   └── profile.css
│           └── forgot-password/ ← Forgot password page (/forgot-password)
│               ├── forgot-password.ts
│               ├── forgot-password.html
│               └── forgot-password.css
│
└── server/                     ← ALL backend (Node.js/Express) code lives here
    ├── index.js                ← Entry point: `npm run server` starts here
    └── src/
        ├── server.js           ← Starts the Express server, runs DB schema setup
        ├── app.js              ← Configures Express (middleware, routes, error handlers)
        │
        ├── config/             ← Configuration files
        │   ├── env.js          ← Loads and exports .env variables
        │   ├── db.js           ← Creates the database connection pool
        │   └── schema.js       ← Creates/updates database tables on startup
        │
        ├── routes/             ← URL routing for the backend API
        │   ├── user.routes.js  ← Routes: /api/auth/register, /api/auth/login, /api/profile
        │   └── profile.routes.js ← Routes: /api/profile (GET and PUT)
        │
        ├── controllers/        ← Handle incoming requests; validate input; call services
        │   ├── user.controller.js
        │   └── profile.controller.js
        │
        ├── services/           ← Business logic (passwords, tokens, data transformations)
        │   ├── user.service.js
        │   └── profile.service.js
        │
        ├── repositories/       ← All SQL database queries live here
        │   ├── user.repository.js
        │   └── profile.repository.js
        │
        ├── middleware/         ← Code that runs BETWEEN receiving a request and handling it
        │   ├── auth.middleware.js   ← Checks if the user is logged in (JWT verification)
        │   └── error.middleware.js  ← Catches unexpected errors and sends a clean response
        │
        ├── utils/              ← Small helper functions
        │   └── response.js     ← sendSuccess() and sendError() helper functions
        │
        └── scripts/            ← One-off utility scripts
            ├── check-db.js     ← Checks what tables exist in the database
            └── reset-password.js ← Manually reset a user's password
```

---

## 6. The Backend (Server) — How It Works

The backend is built with **Node.js** and **Express**. It's a web server that listens for requests from the Angular frontend and responds with data from the database.

### 6.1 How a Request Flows Through the Backend

When Angular calls `POST /api/auth/login`, here is the journey that request takes:

```
Browser (Angular)
    │
    ▼  HTTP POST /api/auth/login  { email, password }
server/index.js         ← entry point, just loads server.js
    │
    ▼
server/src/server.js    ← starts Express and runs DB schema setup
    │
    ▼
server/src/app.js       ← Express app with middleware and routes registered
    │ (CORS check passes, JSON body is parsed)
    ▼
server/src/routes/user.routes.js  ← finds the matching route: POST /auth/login
    │
    ▼
server/src/controllers/user.controller.js  ← validates input (email present?)
    │
    ▼
server/src/services/user.service.js  ← business logic: check password with bcrypt, generate JWT
    │
    ▼
server/src/repositories/user.repository.js  ← runs SQL: SELECT * FROM users WHERE email = $1
    │
    ▼
NeonDB (PostgreSQL)     ← actual database
    │
    ▼ (response travels back up the chain)
Browser receives: { success: true, token: "...", user: { ... } }
```

### 6.2 Key Backend Files Explained in Detail

#### `server/index.js` — The Starting Point

```js
require('./src/server');
```
That's the entire file. When you run `npm run server`, Node.js executes this file. It simply loads `server.js`.

#### `server/src/server.js` — The Server Launcher

```js
const app = require('./app');
const env = require('./config/env');
const createTables = require('./config/schema');

createTables().then(() => {
  app.listen(env.port, () => {
    console.log(`🚀  RuralSwift API running at http://localhost:${env.port}`);
  });
});
```

**What this does:**
1. Calls `createTables()` — this runs all the SQL to create/update database tables
2. Only **after** the tables are ready does it start listening on port 3000
3. If the schema setup fails, the server stops (`process.exit(1)`) — this protects you from running with a broken database

#### `server/src/app.js` — The Express Application

```js
const app = express();

app.use(cors({ origin: ['http://localhost:4200', ...] }));
app.use(express.json());

app.use('/api', userRoutes);
app.use('/api/profile', profileRoutes);

app.use(errorMiddleware);
```

**What each line does:**
- `cors(...)` — Allows the Angular app (on port 4200) to make requests to this server (on port 3000). Without this, the browser would block cross-origin requests.
- `express.json()` — Tells Express to read incoming request bodies as JSON.
- `app.use('/api', userRoutes)` — All routes defined in `user.routes.js` will be prefixed with `/api`.
- `app.use(errorMiddleware)` — A global catch-all for any uncaught errors.

#### `server/src/config/env.js` — Reading the `.env` File

```js
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

module.exports = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET
};
```

**Why this matters:** Instead of hardcoding `'postgres://user:pass@host/db'` in your code (a security risk), you put it in `.env` and load it here. Any file that needs these values imports this module.

#### `server/src/config/db.js` — The Database Connection

```js
const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: { rejectUnauthorized: false }
});
```

A **pool** is a collection of pre-made database connections that are reused across requests (instead of opening and closing a fresh connection for every single request, which would be very slow).

`ssl: { rejectUnauthorized: false }` is required for NeonDB because the connection goes over the internet and must be encrypted.

#### `server/src/config/schema.js` — Auto-Creating Database Tables

This file runs every time the server starts. It uses `CREATE TABLE IF NOT EXISTS` — a SQL command that creates a table **only if it doesn't already exist**. This means it's safe to run repeatedly.

**Tables created:**

| Table | Purpose |
|-------|---------|
| `users` | Stores user accounts (email, hashed password, name, phone, etc.) |
| `products` | Product catalog |
| `orders` | Customer orders |
| `addresses` | Saved delivery addresses per user |
| `wishlist` | Items users have favourited |
| `notifications` | In-app notifications per user |

#### `server/src/middleware/auth.middleware.js` — Protecting Routes

```js
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: 'Access denied.' });

  const decoded = jwt.verify(token, env.jwtSecret);
  req.user = decoded; // { id, email }
  next();
}
```

**How this works:**
1. The browser sends: `Authorization: Bearer eyJhbGciOiJ...`
2. The middleware extracts the token (the part after `Bearer `)
3. It decodes and verifies the token using the secret key
4. If valid, `req.user` is set (containing the user's `id` and `email`) and the route handler runs
5. If invalid or missing, a `401 Unauthorized` response is returned immediately

This middleware is applied to **protected routes** like `GET /api/profile`. Public routes like `POST /api/auth/login` do not use it.

#### The Controller → Service → Repository Pattern

This is the most important architectural concept in the backend. Every feature follows this three-layer pattern:

```
Controller (what)  →  Service (how)  →  Repository (where)
```

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Controller** | Receives the HTTP request, validates basic input, sends the HTTP response | "Check email is present; call service; return 200" |
| **Service** | Business logic — the rules of the app | "Hash the password; check if email exists; generate JWT token" |
| **Repository** | Database access — SQL queries only | "Run `SELECT * FROM users WHERE email = $1`" |

**Why separate them?**
- If you switch from PostgreSQL to MongoDB, you only change the **repositories** — the controllers and services stay the same.
- Testing is easier: you can test the service logic without a real database.
- Code stays organized and readable.

#### `server/src/utils/response.js` — Consistent Responses

```js
const sendSuccess = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({ success: true, message, ...data });
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};
```

Every API response uses these two helper functions. This ensures every response looks the same:
- **Success:** `{ success: true, message: "...", ...extraData }`
- **Error:** `{ success: false, message: "..." }`

---

## 7. The Database — NeonDB and PostgreSQL

### 7.1 What Is PostgreSQL?

PostgreSQL (often called "Postgres") is a **relational database**. Data is stored in tables, like spreadsheets. Tables have rows (records) and columns (fields). Tables can be linked using **foreign keys** (references to rows in other tables).

### 7.2 What Is NeonDB?

NeonDB is a cloud-hosted PostgreSQL service. Instead of installing PostgreSQL on your own computer, NeonDB runs it in the cloud and gives you a connection string to access it. This is great for beginners because you don't need to configure a database server yourself.

### 7.3 The Database Schema (Table Definitions)

Here is a plain-English explanation of each table:

#### `users` — User Accounts
```sql
user_id     SERIAL PRIMARY KEY    -- Auto-incrementing unique ID (1, 2, 3, ...)
name        VARCHAR(150)          -- Full name (e.g., "John Smith")
email       VARCHAR(255) UNIQUE   -- Email address, must be unique across all users
phone       VARCHAR(20)           -- Phone number
password    TEXT                  -- Hashed password (NEVER stored as plain text)
address     TEXT                  -- Home address
gender      VARCHAR(20)           -- Gender
avatar_url  TEXT                  -- URL to profile picture
date_of_birth DATE                -- Date of birth
created_at  TIMESTAMP             -- When the account was created
updated_at  TIMESTAMP             -- When the account was last updated
```

#### `products` — Product Catalog
```sql
product_id  SERIAL PRIMARY KEY
name        VARCHAR(255)          -- Product name
description TEXT                  -- Product description
price       NUMERIC(10,2)         -- Selling price (e.g., 49.99)
mrp         NUMERIC(10,2)         -- Original/marked retail price
stock       INT                   -- How many units are in stock
category    VARCHAR(100)          -- Product category (e.g., "Vegetables")
unit        VARCHAR(50)           -- Unit of measure (e.g., "kg", "piece")
image_url   TEXT                  -- URL to product image
is_active   BOOLEAN               -- Whether product is visible to customers
created_at  TIMESTAMP
```

#### `orders` — Customer Orders
```sql
order_id         SERIAL PRIMARY KEY
user_id          INT → references users(user_id)  -- Which user placed the order
status           VARCHAR(50)       -- 'pending', 'confirmed', 'delivered', etc.
total            NUMERIC(10,2)     -- Order total amount
delivery_address TEXT              -- Where to deliver
notes            TEXT              -- Special instructions
delivered_at     TIMESTAMP         -- When it was delivered
created_at       TIMESTAMP
```

#### `addresses` — Saved Delivery Addresses
```sql
id            SERIAL PRIMARY KEY
user_id       INT → references users(user_id)
label         VARCHAR(50)          -- e.g., "Home", "Office"
full_name     VARCHAR(150)
phone         VARCHAR(20)
address_line1 TEXT
address_line2 TEXT
city          VARCHAR(100)
state         VARCHAR(100)
pincode       VARCHAR(10)
is_default    BOOLEAN              -- Is this the user's default address?
created_at    TIMESTAMP
```

#### `wishlist` — Saved/Favourited Products
```sql
id         SERIAL PRIMARY KEY
user_id    INT → references users(user_id)
product_id INT → references products(product_id)
added_at   TIMESTAMP
UNIQUE(user_id, product_id)         -- A user can only save a product once
```

#### `notifications` — In-App Notifications
```sql
id         SERIAL PRIMARY KEY
user_id    INT → references users(user_id)
title      VARCHAR(255)
message    TEXT
type       VARCHAR(50)              -- 'info', 'warning', 'success', etc.
is_read    BOOLEAN                  -- Has the user read this notification?
created_at TIMESTAMP
```

### 7.4 How the Database Connection Works

```
.env file
  └─ DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
       │
       ▼
server/src/config/env.js     (loads .env and exports variables)
       │
       ▼
server/src/config/db.js      (creates a Pool of connections)
       │
       ▼
server/src/repositories/*.js (run SQL queries using pool.query())
```

### 7.5 Connecting to Your Own NeonDB

1. Log in to https://console.neon.tech
2. Open your project → **Dashboard**
3. Under **Connection Details**, copy the **Connection string** (pooled version is recommended)
4. Paste it as the `DATABASE_URL` in your `.env` file
5. Restart the server — tables are auto-created

### 7.6 Useful Scripts

**Check what tables exist:**
```bash
node server/src/scripts/check-db.js
```

**Manually reset a user's password:**
```bash
node server/src/scripts/reset-password.js
```

---

## 8. The Frontend (Angular) — How It Works

Angular is a **component-based** JavaScript framework. The entire UI is broken into small, reusable pieces called **components**. Each component has:
- A **TypeScript file** (`.ts`) — the logic and data
- An **HTML file** (`.html`) — the template/structure
- A **CSS file** (`.css`) — the styles

### 8.1 How Angular Starts Up

```
Browser opens http://localhost:4200
       │
       ▼
src/index.html          ← the one HTML file; contains <app-root></app-root>
       │
       ▼
src/main.ts             ← bootstraps the Angular app
       │
       ▼
src/app/app.config.ts   ← sets up routing, HTTP client
       │
       ▼
src/app/app.ts          ← root component, rendered into <app-root>
       │
       ▼
src/app/app.html        ← contains <router-outlet> — where pages are inserted
       │
       ▼
src/app/app.routes.ts   ← decides which page component to show based on the URL
```

### 8.2 `src/index.html` — The Shell

```html
<html>
  <head>
    <!-- Poppins font from Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins..." rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/.../bootstrap-icons.min.css">
    <!-- Tailwind CSS (utility classes) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- GSAP animation library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  </head>
  <body>
    <app-root></app-root>  <!-- Angular renders the entire app here -->
  </body>
</html>
```

This HTML file never changes — Angular dynamically fills in `<app-root>`.

### 8.3 `src/main.ts` — Bootstrapping

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig);
```

This is Angular's "engine start." It tells Angular: "Start the app using the `App` component as the root, and use `appConfig` for settings."

### 8.4 `src/app/app.config.ts` — App Configuration

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),  // Catches global errors
    provideRouter(routes),                 // Enables page routing
    provideHttpClient(withInterceptorsFromDi())  // Enables HTTP requests
  ]
};
```

This registers three important services:
1. **Router** — handles navigation between pages
2. **HttpClient** — lets Angular make HTTP requests to the Express backend
3. **Global error listeners** — catches unhandled errors

### 8.5 `src/app/app.routes.ts` — Page Routing

```typescript
export const routes: Routes = [
  { path: '',                component: HomeComponent },           // http://localhost:4200/
  { path: 'login',          component: LoginComponent },          // .../login
  { path: 'register',       component: RegisterComponent },       // .../register
  { path: 'dashboard',      component: CustomerDashboardComponent }, // .../dashboard
  { path: 'profile',        component: ProfileComponent },        // .../profile
  { path: 'forgot-password', component: ForgotPasswordComponent } // .../forgot-password
];
```

**How routing works:** When a user types a URL or clicks a link, Angular looks at this table, finds the matching `path`, and renders the corresponding `component` inside `<router-outlet>`.

### 8.6 `src/app/services/api.service.ts` — The Communication Layer

This is the only file that makes HTTP requests to the backend. It acts as the "translator" between Angular and Express.

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  // Session management (localStorage)
  saveSession(token: string, user: UserProfile): void { ... }
  getToken(): string | null { ... }
  getStoredUser(): UserProfile | null { ... }
  clearSession(): void { ... }

  // Auth calls
  login(email, password): Observable<AuthResponse> {
    return this.http.post(`${this.baseUrl}/auth/login`, { email, password });
  }

  register(data): Observable<AuthResponse> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  // Profile calls (require login token)
  getProfile(): Observable<{ user: UserProfile }> {
    return this.http.get(`${this.baseUrl}/profile`, { headers: this.authHeaders() });
  }

  updateProfile(data): Observable<{ message, user }> {
    return this.http.put(`${this.baseUrl}/profile`, data, { headers: this.authHeaders() });
  }
}
```

**Key concept — `localStorage`:** The browser has a small storage area called `localStorage`. After login, the JWT token and user data are saved here. When the browser is refreshed, the data is still there (unlike regular JavaScript variables that reset).

**Key concept — `Observable`:** Angular's HTTP calls return Observables. You `.subscribe()` to them to get the result:
```typescript
this.api.login(email, password).subscribe({
  next: (response) => { /* success */ },
  error: (err)      => { /* failure */ }
});
```

### 8.7 A Page Component — Example: Login

Each page follows the same structure. Here's how `LoginComponent` works:

**`login.ts` (TypeScript logic):**
```typescript
export class LoginComponent {
  email        = '';     // bound to the email input field
  password     = '';     // bound to the password input field
  isLoading    = false;  // shows a spinner while waiting for server
  errorMessage = '';     // shows error text if login fails

  constructor(private router: Router, private api: ApiService) {
    // If already logged in, skip the login page
    if (this.api.getToken()) this.router.navigate(['/dashboard']);
  }

  login() {
    this.api.login(this.email, this.password).subscribe({
      next: (res) => {
        this.api.saveSession(res.token, res.user); // save to localStorage
        this.router.navigate(['/dashboard']);       // redirect
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Login failed.';
      }
    });
  }
}
```

**`login.html` (Template):**
Uses Angular's **two-way data binding** with `[(ngModel)]`:
```html
<input [(ngModel)]="email" type="email" placeholder="Email">
<input [(ngModel)]="password" type="password" placeholder="Password">
<button (click)="login()">Sign In</button>
<p *ngIf="errorMessage">{{ errorMessage }}</p>
```
- `[(ngModel)]="email"` — the input field and the `email` variable stay in sync
- `(click)="login()"` — calls the `login()` method when the button is clicked
- `*ngIf="errorMessage"` — only shows the paragraph if `errorMessage` is not empty

---

## 9. How the Frontend and Backend Talk to Each Other

The complete request/response cycle for a **login** looks like this:

```
FRONTEND (Angular, port 4200)
    │
    │  User types email + password, clicks "Sign In"
    │  LoginComponent.login() is called
    │
    ▼
ApiService.login(email, password)
    │  Sends HTTP POST to http://localhost:3000/api/auth/login
    │  Body: { "email": "user@example.com", "password": "mypassword" }
    │
    │  ─────────── network boundary ───────────
    │
BACKEND (Express, port 3000)
    │
    ▼
app.js → CORS allows port 4200 ✓ → express.json() parses body
    │
    ▼
user.routes.js → matches POST /auth/login → calls UserController.login()
    │
    ▼
UserController.login()
    │  Validates: email and password must be present
    │  Calls userService.loginUser(email, password)
    │
    ▼
UserService.loginUser()
    │  Calls userRepository.findByEmail(email)
    │
    ▼
UserRepository.findByEmail()
    │  Runs SQL: SELECT user_id, name, email, password FROM users WHERE email = $1
    │
    ▼
NeonDB returns the matching row (or nothing)
    │
    ▼
UserService (continued)
    │  bcrypt.compare(enteredPassword, hashedPasswordFromDB)
    │  If match: generates JWT token (expires in 7 days)
    │  Returns: { token: "eyJ...", user: { id, name, email, ... } }
    │
    ▼
UserController: sendSuccess(res, 200, 'Login successful.', result)
    │
    │  Response: { "success": true, "message": "Login successful.",
    │              "token": "eyJ...", "user": { ... } }
    │
    │  ─────────── network boundary ───────────
    │
FRONTEND
    │
    ▼
ApiService.login().subscribe({ next: (res) => ... })
    │  api.saveSession(res.token, res.user) → saves to localStorage
    │  router.navigate(['/dashboard'])
    │
    ▼
User sees the Dashboard page
```

---

## 10. Authentication — Login, Register, and JWT Tokens

### 10.1 How Registration Works

1. User fills in first name, last name, email, phone, password, confirm password
2. Angular validates locally (passwords match, email not empty, password ≥ 6 characters)
3. Angular calls `POST /api/auth/register` with the data
4. The server checks if the email already exists in the database
5. If new: bcrypt hashes the password (e.g., `"secret123"` → `"$2b$10$abcxyz..."`)
6. The hashed password and user details are inserted into the `users` table
7. A JWT token is generated and returned along with the user data
8. Angular saves the token + user to `localStorage`
9. User is redirected to `/dashboard`

### 10.2 How Login Works

1. User enters email and password
2. Angular calls `POST /api/auth/login`
3. Server looks up the user by email
4. `bcrypt.compare()` checks if the entered password matches the stored hash
5. If match: JWT token is generated, returned to Angular
6. Angular saves the token, redirects to dashboard

### 10.3 What Is a JWT Token?

A **JSON Web Token** (JWT) is a string that looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNjk4...
```

It has three parts, separated by dots:
1. **Header** — algorithm used (e.g., HS256)
2. **Payload** — data stored inside (user ID, email, expiry time)
3. **Signature** — cryptographic signature using the `JWT_SECRET`

Anyone can _read_ the payload (it's Base64-encoded, not encrypted), but **only someone who knows the secret key can create a valid token**. This is how the server knows the token wasn't forged.

### 10.4 How Protected Routes Work

For any route marked with `authenticateToken` middleware (like `GET /api/profile`):

1. Angular sends the request with: `Authorization: Bearer eyJhbGciOiJ...`
2. The middleware extracts the token
3. `jwt.verify(token, jwtSecret)` checks the signature and expiry
4. If valid: `req.user = { id: 1, email: "user@example.com" }` is set and the route handler runs
5. If invalid: `403 Forbidden` is returned

**Token storage in Angular:**
```
localStorage.setItem('token', 'eyJ...')   // saved at login
localStorage.getItem('token')             // retrieved for each protected request
localStorage.removeItem('token')          // cleared at logout
```

---

## 11. Running the Project

### Running Both Servers (Normal Development)

You need **two terminal windows** open simultaneously:

**Terminal 1 — Backend:**
```bash
npm run server
```
Runs: `node server/index.js` on port 3000.

**Terminal 2 — Frontend:**
```bash
npm start
```
Runs: `ng serve` on port 4200.

Then open: **http://localhost:4200**

### Development Mode (Auto-Restart Backend)

If you want the server to automatically restart when you edit backend files:
```bash
npm run server:dev
```
This uses `nodemon` to watch for file changes.

### Building for Production

To create an optimised, minified build of the Angular app:
```bash
npm run build
```
Output goes to the `dist/` folder. This is what you would deploy to a web hosting service.

### Available npm Scripts Summary

| Command | What it does |
|---------|-------------|
| `npm start` | Start Angular dev server on port 4200 |
| `npm run server` | Start Express backend server on port 3000 |
| `npm run server:dev` | Start Express backend with auto-restart (nodemon) |
| `npm run build` | Build Angular for production |
| `npm test` | Run unit tests |
| `npm run watch` | Build Angular in watch mode (rebuilds on file change) |

---

## 12. Rebuilding the Project from Scratch

This section walks you through creating the entire project from nothing. It assumes you understand the concepts above.

### Phase 1: Create the Angular App

```bash
# Create a new Angular 22 project
npx -y @angular/cli@latest new ruralswift --style=css --routing=true

cd ruralswift
```

### Phase 2: Install All Required Packages

```bash
npm install express cors dotenv pg bcrypt jsonwebtoken body-parser bootstrap bootstrap-icons

npm install --save-dev nodemon prettier
```

### Phase 3: Create the Backend Folder Structure

```bash
mkdir -p server/src/config server/src/controllers server/src/services
mkdir -p server/src/repositories server/src/routes server/src/middleware
mkdir -p server/src/utils server/src/scripts
```

Create `server/index.js`:
```js
require('./src/server');
```

### Phase 4: Create the `.env` File

In the project root:
```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST/YOUR_DB?sslmode=require&channel_binding=require
JWT_SECRET=your_very_long_random_secret_string_here
PORT=3000
```

### Phase 5: Build the Config Layer

Create `server/src/config/env.js`:
```js
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

module.exports = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET
};
```

Create `server/src/config/db.js`:
```js
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) console.error('❌ DB error:', err.message);
  else { console.log('✅ Connected to NeonDB'); release(); }
});

module.exports = pool;
```

Create `server/src/config/schema.js` with all the `CREATE TABLE IF NOT EXISTS` statements (see [Section 7.3](#73-the-database-schema-table-definitions)).

### Phase 6: Build Repositories, Services, Controllers, Routes

Follow the pattern: **Repository** (SQL) → **Service** (business logic) → **Controller** (HTTP handling) → **Route** (URL mapping).

See Section 6.2 for the full implementation of each layer.

### Phase 7: Wire Up the Express App

Create `server/src/app.js` and `server/src/server.js` (see Section 6.2).

### Phase 8: Build the Angular Pages

For each page, generate the component:
```bash
ng generate component pages/home
ng generate component pages/login
ng generate component pages/register
ng generate component pages/customer-dashboard
ng generate component pages/profile
ng generate component pages/forgot-password
```

Generate the API service:
```bash
ng generate service services/api
```

Then fill in the logic, templates, and styles for each component following the patterns in Section 8.

### Phase 9: Update `src/app/app.routes.ts`

Map each URL path to its component (see Section 8.5).

### Phase 10: Test Everything

1. Start the backend: `npm run server`
2. Start the frontend: `npm start`
3. Open http://localhost:4200
4. Try registering an account
5. Try logging in
6. Try updating your profile

---

## 13. Common Issues and Troubleshooting

### ❌ `Cannot connect to database` / `ECONNREFUSED`

**Cause:** The `DATABASE_URL` in `.env` is wrong or missing.

**Fix:**
1. Open `.env` and check the `DATABASE_URL` value
2. Make sure it starts with `postgresql://` (not `postgres://`)
3. Make sure the NeonDB project is active (not sleeping/paused — check the NeonDB dashboard)
4. Run `node server/src/scripts/check-db.js` to test the connection

---

### ❌ `npm start` fails with `ng: command not found`

**Cause:** Angular CLI is not installed globally.

**Fix:**
```bash
npm install -g @angular/cli
```

---

### ❌ `CORS error` in the browser console

**Cause:** The Angular frontend (port 4200) is blocked from talking to the backend (port 3000).

**Fix:** Open `server/src/app.js` and make sure `http://localhost:4200` is in the `cors` origins list:
```js
app.use(cors({
  origin: ['http://localhost:4200'],
  ...
}));
```

---

### ❌ `Invalid or expired token` error after refresh

**Cause:** The JWT token in `localStorage` has expired (tokens expire after 7 days), or was never saved correctly.

**Fix:**
1. Open browser DevTools → Application → Local Storage → `http://localhost:4200`
2. Delete the `token` entry
3. Log in again

---

### ❌ `Port 3000 is already in use`

**Cause:** Another process is running on port 3000.

**Fix (Windows):**
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill it (replace 12345 with the actual PID)
taskkill /PID 12345 /F
```

Then start the server again: `npm run server`

---

### ❌ `An account with this email already exists` when registering

**Cause:** You already registered with this email.

**Fix:** Use a different email address, or log in instead of registering.

---

### ❌ Angular shows a blank page or `404 Not Found`

**Cause:** The route you're accessing doesn't exist in `app.routes.ts`.

**Fix:** Check that the URL you're visiting matches a path defined in `src/app/app.routes.ts`.

---

### ❌ Changes to backend files don't take effect

**Cause:** You need to restart the backend manually when not using `nodemon`.

**Fix:** Stop the server (Ctrl+C) and restart with `npm run server`. Or, use `npm run server:dev` during development for auto-restart.

---

### ❌ `npm install` fails with permission errors (Windows)

**Fix:** Run your terminal as Administrator, or use:
```bash
npm install --legacy-peer-deps
```

---

## 14. Glossary — Key Terms Explained

| Term | Explanation |
|------|------------|
| **API** | Application Programming Interface — a way for two programs to talk to each other. Here, it's the set of URLs the Express server exposes. |
| **Async/Await** | A way to write code that waits for something slow (like a database query) without freezing the program. `async function foo() { const result = await doSomething(); }` |
| **bcrypt** | A hashing algorithm for passwords. Transforms "mypassword123" into a long scrambled string. Irreversible — you can't get the original back. |
| **CORS** | Cross-Origin Resource Sharing — a browser security feature. Prevents one website from making requests to another without permission. |
| **Component (Angular)** | A self-contained UI piece with its own HTML, CSS, and TypeScript. Like a reusable LEGO brick. |
| **Controller** | In the backend, the code that handles an incoming HTTP request and sends the response. |
| **Dependency Injection** | Angular's system for automatically providing services (like `ApiService`) to components that need them. |
| **dotenv** | A Node.js package that reads a `.env` file and makes its values available as `process.env.VARIABLE_NAME`. |
| **Express** | A minimal Node.js web framework. Handles incoming HTTP requests and lets you define routes. |
| **Frontend** | The part of the application the user sees and interacts with in the browser. |
| **Backend** | The server-side code that processes data, handles business logic, and talks to the database. |
| **HTTP** | HyperText Transfer Protocol — the language browsers and servers use to communicate. |
| **HTTP Methods** | The "verb" of an HTTP request: GET (read), POST (create), PUT (update), DELETE (remove). |
| **JWT** | JSON Web Token — a signed, compact token used to prove a user is authenticated. |
| **localStorage** | A browser feature that stores small amounts of data persistently (survives page refreshes). |
| **Middleware (Express)** | A function that runs between receiving a request and sending a response. Examples: CORS, JSON parsing, auth checking. |
| **Module** | In Node.js, a file that exports functions/values for other files to use via `require()`. |
| **ngModel** | Angular's two-way data binding directive. Keeps an input field and a TypeScript variable in sync. |
| **npm** | Node Package Manager — used to install JavaScript libraries. |
| **Observable (RxJS)** | An Angular pattern for handling asynchronous data streams. Similar to a Promise but more powerful. |
| **ORM** | Object-Relational Mapper — a library that lets you write database queries as regular code instead of SQL. This project uses raw SQL instead of an ORM. |
| **Pool (pg)** | A set of pre-made database connections shared across requests for efficiency. |
| **PostgreSQL** | A powerful, open-source relational database system. |
| **Promise** | A JavaScript object representing the eventual result of an asynchronous operation. |
| **Repository** | In this project, a class containing all SQL database queries for a particular entity (e.g., `UserRepository`). |
| **Route** | A mapping between a URL path (like `/api/auth/login`) and the code that handles it. |
| **Service (Angular)** | A class that contains shared logic (like API calls) and is injected into components. |
| **Service (Express)** | A class containing business logic, sitting between the Controller and the Repository. |
| **SQL** | Structured Query Language — the language used to talk to relational databases. |
| **SSL** | Secure Sockets Layer — encrypts data sent over the internet. Required for NeonDB connections. |
| **TypeScript** | A superset of JavaScript with static typing. Compiles to JavaScript. Used by Angular. |
| **`@Injectable`** | An Angular decorator that marks a class as available for dependency injection. |
| **`@Component`** | An Angular decorator that marks a class as a component and provides its template and style file paths. |
| **Standalone Component** | A modern Angular component that imports its own dependencies directly, without needing an `NgModule`. All components in this project are standalone. |

---

> 💡 **You've reached the end!** If you've read through this guide carefully, you now have everything you need to understand, set up, and replicate the RuralSwift project from scratch. Don't be afraid to experiment — break things, fix them, and learn. That's the fastest way to become confident.

---

*Last updated: June 2026*
