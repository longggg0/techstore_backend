# TechStore Backend ⚙️

REST API server for the TechStore e-commerce application, built with Node.js, Express, and PostgreSQL.

**Live API:** [techstore-backend-7v9f.onrender.com](https://techstore-backend-7v9f.onrender.com)

---

## Features

- 🔐 **JWT Authentication** — Secure login for customers and admin
- 🛡️ **Auth Middleware** — Protected routes for admin-only operations
- 📦 **Product Management** — CRUD with image upload support
- 🗂️ **Category Management** — Create, update, delete categories
- 👥 **Customer Management** — Register, login, and manage customers
- 📋 **Order Management** — Place and manage orders with stock validation
- 🧾 **Invoice Generation** — Generate `.docx` order invoices using docxtemplater
- 🌐 **CORS Support** — Configured for production frontend

---

## Tech Stack

- Node.js + Express
- Sequelize ORM + PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- express-fileupload
- docxtemplater + pizzip

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL

### Installation

```bash
git clone https://github.com/longggg0/techstore_backend.git
cd techstore_backend
npm install
```

### Database Setup

Update `config/config.json` with your PostgreSQL credentials:

```json
{
  "development": {
    "username": "postgres",
    "password": "your_password",
    "database": "techstore",
    "host": "127.0.0.1",
    "dialect": "postgres"
  }
}
```

Run migrations:

```bash
npx sequelize-cli db:migrate
```

### Run the Server

```bash
node index.js
```

Server runs on `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/customers-auth/register` | Register customer |
| POST | `/api/v1/customers-auth/login` | Login customer |
| GET | `/api/v1/products` | Get all products |
| POST | `/api/v1/products` | Create product (admin) |
| PUT | `/api/v1/products/:id` | Update product (admin) |
| DELETE | `/api/v1/products/:id` | Delete product (admin) |
| GET | `/api/v1/categories` | Get all categories |
| POST | `/api/v1/categories` | Create category (admin) |
| GET | `/api/v1/orders` | Get all orders (admin) |
| POST | `/api/v1/orders` | Place an order |
| GET | `/api/v1/orders/:id/generate-doc` | Download invoice |

---

## Deployment

Deployed on **Render** (Free tier) with **Render PostgreSQL**.

### Environment Variables

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | Set to `production` |

### Run Migrations in Production

```bash
NODE_ENV=production DATABASE_URL=your_db_url npx sequelize-cli db:migrate
```

---

## Project Structure

```
techstore_backend/
├── src/
│   ├── routes/        # Express route handlers
│   ├── middlewares/   # Auth middleware
├── models/            # Sequelize models
├── migrations/        # Database migrations
├── config/            # Database config
├── uploads/           # Product images
└── index.js           # Entry point
```
