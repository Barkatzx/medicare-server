# 🛒 Node.js + TypeScript E-Commerce Backend (Prisma + Supabase + Redis)

A scalable and production-ready e-commerce backend built with **Node.js, Express, TypeScript**, integrated with **Prisma ORM**, **Supabase (PostgreSQL + Storage)**, and **Redis caching** for high-performance API responses.

## 🚀 Features

### 🔐 Authentication & User Management
- Secure signup/login system (JWT + Supabase Auth)
- Role-based access control (Admin / User)
- Protected routes using middleware

### 🛍️ Product Management
- Create, update, delete, and fetch products
- Category-based product organization
- Stock & inventory tracking

### 🛒 Cart & Orders System
- Add/remove items from cart
- Order creation & order history tracking
- Real-time stock validation

### 🖼️ Image & File Storage
- Product image upload via Supabase Storage
- Secure file handling with validation

### ⚡ Redis Caching (Performance Layer)
- In-memory caching for frequently accessed data
- Cached endpoints:
  - Product listings
  - Product details
  - Categories
- Active cache invalidation on data changes (POST/PUT/DELETE)
- Cache stampede protection for high traffic endpoints
- TTL-based expiration for data freshness

👉 Results:
- Up to 90% reduction in database load
- Sub-millisecond API responses for cached data

### 🧠 Database Layer (Prisma ORM)
- Type-safe PostgreSQL queries
- Automated migrations
- Clean and scalable schema design

### 🌐 RESTful API
- Clean and modular API architecture
- Ready for:
  - Flutter mobile app
  - Next.js admin dashboard
  - External integrations

### 📈 Scalability & Performance
- Redis caching layer for high-speed reads
- Optimized Prisma queries
- Middleware-based architecture for extensibility
- Designed for horizontal scaling

## 🧱 Tech Stack

- **Backend:** Node.js, Express
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Cache:** Redis
- **Auth:** JWT + Supabase Auth
- **Storage:** Supabase Storage
- **Validation:** Express Validator
