# Wise Gourmet

Wise Gourmet is a restaurant ordering and operations demo built to feel like a real production product. It covers the full workflow from browsing a live menu, placing and paying for orders, tracking fulfillment, managing support tickets, and coordinating staff, riders, and administrators from the same platform.

## What It Demonstrates

- Mobile-first customer ordering experience with a PWA install flow for Android and iPhone.
- Role-based portals for customers, admins, staff, riders, and support agents.
- Live order and ticket updates through Socket.IO.
- Paystack-backed payment flow with order verification.
- Optional role-specific web push notifications for order, dispatch, and support events.
- Delivery zone management with configurable fee rules.
- Support ticket workflow with threaded messages, attachments, and CSAT rating.

## Product Highlights

- Customer experience: browse categories, manage cart, choose delivery or self-pickup, and track orders in real time.
- Operations workflow: confirm, prepare, assign, pick up, and deliver orders with status timelines.
- Staff workflow: receive paid-order alerts and manage kitchen-side order progression.
- Rider workflow: monitor pickup queue, accept deliveries, and update delivery status.
- Support workflow: create tickets, reply in-thread, and resolve customer issues.
- Admin tooling: manage menu items, categories, team members, delivery zones, seeded data, and summary stats.
- Installable app experience: shared `/install` landing page plus service worker and manifest support.

## Tech Stack

- Frontend: React 19, Vite, React Router, Socket.IO client.
- Backend: Node.js, Express, MongoDB/Mongoose, Socket.IO, JWT authentication.
- Payments: Paystack integration.
- Notifications: Web Push with VAPID keys and per-role delivery.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB Atlas URI or a local MongoDB instance

### Environment Setup

Create the environment files:

1. Copy [server/.env.example](server/.env.example) to [server/.env](server/.env)
2. Copy [client/.env.example](client/.env.example) to [client/.env](client/.env)

Populate [server/.env](server/.env) with at least:

- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `WEB_PUSH_SUBJECT`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`

Populate [client/.env](client/.env) with:

- `VITE_API_BASE_URL`
- `VITE_PAYSTACK_PUBLIC_KEY`

### Install Dependencies

```bash
npm install
npm install --prefix client
npm install --prefix server
```

### Seed Demo Data

```bash
npm run seed
```

The seed script creates demo categories, sample menu items, management users, support examples, and test-ready order data.

### Run Locally

```bash
npm run dev
```

This starts:

- Frontend: http://localhost:5173
- API: http://localhost:5001

## Demo-Ready Flow

1. Open the menu as a guest or sign in as a customer.
2. Add items to the cart and place an order with delivery or self-pickup.
3. Walk the order through payment, kitchen processing, rider pickup, and delivery.
4. Show the support flow by creating a ticket and responding in-thread.
5. Switch into admin, staff, or rider views to show role-specific dashboards and actions.
6. Open the `/install` page to demonstrate the app-like install experience.
7. Enable alerts on a supported device to demonstrate role-specific web push notifications.

## Root Scripts

- `npm run dev` starts client and server together.
- `npm run dev:client` starts only the frontend.
- `npm run dev:server` starts only the backend.
- `npm run seed` seeds demo data in MongoDB.
- `npm run build` builds the frontend for production.

## Backend Scripts

In [server/package.json](server/package.json):

- `npm run dev` starts the API with nodemon.
- `npm run start` starts the API with Node.
- `npm run seed` seeds demo content.
- `npm run vapid:keys` generates Web Push VAPID keys.

## Core APIs

Public:

- `GET /api/health`
- `GET /api/menu`
- `GET /api/menu/categories`
- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated customer:

- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `PATCH /api/auth/change-password`
- `GET /api/cart`
- `POST /api/cart/items`
- `PUT /api/cart/items/:itemId`
- `DELETE /api/cart/items/:itemId`
- `DELETE /api/cart/clear`
- `POST /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`
- `POST /api/orders/:id/payment/initiate`
- `POST /api/orders/:id/payment/verify`
- `POST /api/support/tickets`
- `GET /api/support/tickets/my`

Admin, staff, rider, and support endpoints include order management, rider queue handling, support inbox actions, team management, and notification subscription routes.

## Order Flow

Order statuses move through:

`pending -> confirmed -> preparing -> ready_for_pickup -> picked_up -> on_the_way -> delivered`

Supported cancellation states before dispatch:

- `pending -> cancelled`
- `confirmed -> cancelled`
- `preparing -> cancelled`
- `ready_for_pickup -> cancelled`

Every status change is stored in `statusTimeline` so the order history stays auditable.

## PWA And Push

- The app registers a service worker and ships with a web manifest for installability.
- Android users can install directly from the browser prompt when available.
- iPhone users can use Safari and Add to Home Screen through the `/install` page.
- Push notifications are optional and role-aware.
- Web Push requires valid VAPID keys in the server environment before alerts can be enabled.

## Notes For A Demo Or Proposal

- The app is intentionally structured to show a believable restaurant operations workflow, not just a static storefront.
- The same platform covers customer orders, kitchen operations, delivery dispatch, and support resolution.
- The install and notification features are meant to demonstrate a modern app-like experience on mobile without an app store release.
