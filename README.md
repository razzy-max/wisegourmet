# Wise Gourmet

Restaurant food ordering demo app (customer + admin/staff + rider workflow) using React (Vite) and Express/MongoDB.

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB Atlas URI (or local MongoDB)

## 1. Environment Setup

Create env files:

1. Copy `server/.env.example` to `server/.env`
2. Copy `client/.env.example` to `client/.env`

Set required values in `server/.env`:

- `MONGO_URI`
- `JWT_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`

## 2. Install

```bash
npm install
npm install --prefix client
npm install --prefix server
```

## 3. Seed Demo Data

```bash
npm run seed
```

Seed creates:

- Categories: Burger, Shawarma, Pizza, Drinks
- Sample menu items
- Demo management users (admin/staff/rider)

## 4. Run App

```bash
npm run dev
```

Services:

- Frontend: http://localhost:5173
- API: http://localhost:5001

## Root Scripts

- `npm run dev` : start client + server
- `npm run dev:client` : start client only
- `npm run dev:server` : start server only
- `npm run seed` : seed categories, menu items, and demo users
- `npm run build` : build frontend

## Phase 1 API Endpoints

Public:

- `GET /api/health`
- `GET /api/menu`
- `GET /api/menu/categories`
- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated customer:

- `GET /api/auth/me`
- `GET /api/cart`
- `POST /api/cart/items`
- `PUT /api/cart/items/:itemId`
- `DELETE /api/cart/items/:itemId`
- `DELETE /api/cart/clear`
- `POST /api/orders`
- `GET /api/orders/my`

Admin/staff/rider:

- `GET /api/orders`
- `PATCH /api/orders/:id/status`

Admin or staff menu operations:

- `POST /api/menu`
- `PUT /api/menu/:id`

Admin-only operations:

- `DELETE /api/menu/:id`
- `POST /api/menu/categories`
- `PUT /api/menu/categories/:id`
- `DELETE /api/menu/categories/:id`

## Order Status Flow

`pending -> confirmed -> preparing -> ready_for_pickup -> picked_up -> on_the_way -> delivered`

Cancellation allowed before dispatch:

- `pending -> cancelled`
- `confirmed -> cancelled`
- `preparing -> cancelled`
- `ready_for_pickup -> cancelled`

All status changes are stored in `statusTimeline` on each order.
