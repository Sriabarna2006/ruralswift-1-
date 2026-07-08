# 🌾 RuralSwift

> Bridging the gap between rural communities and modern e-commerce — fast, simple, and accessible.

---

## What Is This Project?

**RuralSwift** is a full-stack e-commerce web application built to serve rural customers who have limited access to local markets. It provides an intuitive online shopping experience with user authentication, a personal dashboard, and a profile management system — all optimised for simplicity and speed.

The application is composed of two parts running together:

| Part | Technology | URL |
|------|-----------|-----|
| **Frontend** | Angular 22 | `http://localhost:4200` |
| **Backend API** | Node.js + Express 5 | `http://localhost:3000` |

The data is stored in a cloud-hosted **PostgreSQL** database powered by [NeonDB](https://neon.tech).

---

## Why Does It Exist?

Rural populations often face challenges accessing everyday goods due to distance from urban markets, limited transportation, and a lack of digital platforms tailored to their needs. RuralSwift exists to:

- **Reduce dependency on physical travel** for purchasing essential goods
- **Empower local sellers** by providing a platform to reach rural buyers
- **Simplify the shopping experience** with a clean, easy-to-use interface
- **Build a digital bridge** connecting rural communities to the modern supply chain

---

## Features

- 🔐 **User Authentication** — Secure registration and login with JWT tokens and bcrypt-hashed passwords
- 👤 **Profile Management** — View and update personal details (name, email, phone, address, gender)
- 🛒 **Customer Dashboard** — Personalised landing page after login
- 🗺️ **Saved Addresses** — Store multiple delivery addresses with a default selection
- ❤️ **Wishlist** — Save favourite products for later
- 🔔 **Notifications** — In-app notification system
- 🔑 **Forgot Password** — Dedicated password recovery page
- 📱 **Responsive Design** — Works on mobile, tablet, and desktop
- 🔒 **Protected Routes** — API endpoints secured with JWT middleware
- ⚡ **Auto Schema Setup** — Database tables are created automatically on first server start

---

## Installation

### Prerequisites

Make sure the following are installed before you begin:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18+ (LTS) | https://nodejs.org |
| npm | v10+ | Comes with Node.js |
| Angular CLI | v22+ | `npm install -g @angular/cli` |
| Git | Any | https://git-scm.com |

You also need a free **NeonDB** account for the cloud PostgreSQL database: https://neon.tech

---

### Step 1 — Clone the Repository

```bash
git clone <repository-url> ruralswift-venkat
cd ruralswift-venkat
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Configure Environment Variables

Create or edit the `.env` file in the project root:

```env
# NeonDB PostgreSQL connection string (get this from your NeonDB dashboard)
DATABASE_URL=postgresql://your_user:your_password@your_host/your_db?sslmode=require&channel_binding=require

# JWT secret key — use a long, random string in production
JWT_SECRET=your_super_secret_key_here

# Port for the Express API server
PORT=3000
```

> ⚠️ Never commit your `.env` file to Git. It is already listed in `.gitignore`.

### Step 4 — Start the Backend Server

```bash
npm run server
```

On first run, all database tables are created automatically. You should see:

```
✅  Connected to NeonDB (PostgreSQL)
✅  Schema migration complete
🚀  RuralSwift API running at http://localhost:3000
```

### Step 5 — Start the Frontend

Open a **second terminal** and run:

```bash
npm start
```

Then open your browser at **http://localhost:4200**.

---

## Usage

Once both servers are running:

| Action | How |
|--------|-----|
| **View the app** | Open http://localhost:4200 |
| **Register an account** | Click "Get Started" or go to `/register` |
| **Log in** | Go to `/login` |
| **View your profile** | Navigate to `/profile` after login |
| **Access the dashboard** | Navigate to `/dashboard` after login |
| **Test the API** | Visit http://localhost:3000/api/health |
| **Check database tables** | Run `node server/src/scripts/check-db.js` |

### Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Angular frontend (port 4200) |
| `npm run server` | Start the Express backend (port 3000) |
| `npm run server:dev` | Start the backend with auto-restart on file changes (nodemon) |
| `npm run build` | Build the Angular app for production |
| `npm test` | Run unit tests |

### API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `POST` | `/api/auth/register` | No | Create a new account |
| `POST` | `/api/auth/login` | No | Log in and receive a JWT token |
| `GET` | `/api/profile` | ✅ Yes | Fetch the logged-in user's profile |
| `PUT` | `/api/profile` | ✅ Yes | Update the logged-in user's profile |
| `GET` | `/api/health` | No | Server health check |

---

## Technologies Used

### Frontend
| Technology | Purpose |
|-----------|---------|
| [Angular 22](https://angular.dev) | UI framework (component-based, TypeScript) |
| TypeScript 6 | Typed JavaScript for Angular components |
| [Bootstrap 5](https://getbootstrap.com) + Bootstrap Icons | UI components and icons |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first CSS (via CDN) |
| [GSAP](https://gsap.com) | Smooth animations |
| [Poppins](https://fonts.google.com/specimen/Poppins) | Application font (Google Fonts) |
| RxJS | Reactive programming and HTTP observables |

### Backend
| Technology | Purpose |
|-----------|---------|
| [Node.js](https://nodejs.org) | JavaScript runtime for the server |
| [Express 5](https://expressjs.com) | Web framework for the REST API |
| [PostgreSQL](https://www.postgresql.org) | Relational database |
| [NeonDB](https://neon.tech) | Cloud-hosted serverless PostgreSQL |
| [pg (node-postgres)](https://node-postgres.com) | PostgreSQL client for Node.js |
| [bcrypt](https://www.npmjs.com/package/bcrypt) | Password hashing |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | JWT creation and verification |
| [dotenv](https://www.npmjs.com/package/dotenv) | Environment variable management |
| [cors](https://www.npmjs.com/package/cors) | Cross-origin request handling |
| [nodemon](https://nodemon.io) | Auto-restart during development |
| [Prettier](https://prettier.io) | Code formatting |

---

## License

This project is licensed under the **MIT License**.

You are free to use, copy, modify, merge, publish, distribute, and/or sell copies of this software, provided that the original copyright notice and this permission notice are included in all copies or substantial portions of the software.

```
MIT License — Copyright (c) 2024 RuralSwift Team
```

---

## Contributing

This project was built and is maintained by:

| Name | Role |
|------|------|
| **Venkatesh** | Full-Stack Development, Architecture |
| **Sriabrana** | Frontend Development, UI/UX |
| **Ramya** | Backend Development, Database Design |
| **Ashok** | API Integration, Testing |
| **Anusiya** | Frontend Development, Styling |

### How to Contribute

1. **Fork** the repository
2. **Create a feature branch** — `git checkout -b feature/your-feature-name`
3. **Commit your changes** — `git commit -m "Add: your feature description"`
4. **Push to the branch** — `git push origin feature/your-feature-name`
5. **Open a Pull Request** and describe what you've changed

Please ensure your code follows the existing style (run `npm run prettier` to format) and that all existing functionality continues to work.

---

> 📖 For a full learning guide — including architecture deep-dives, file-by-file explanations, database schema, and troubleshooting — see [teachme.md](./teachme.md).
