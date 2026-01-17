# Wacka Accessories - Product Requirements Document

## Project Overview
- **App Name**: Wacka Accessories
- **Type**: E-commerce Online Store MVP
- **Tech Stack**: FastAPI (Python) + React + MongoDB
- **Payment**: M-Pesa STK Push (Safaricom Daraja API)
- **Currency**: KES (Kenyan Shillings)

## User Personas

### 1. Customer
- Kenyan consumer shopping for accessories online
- Primarily mobile user (M-Pesa payment)
- Needs: Browse products, add to cart, checkout, pay with M-Pesa, track orders

### 2. Admin
- Store administrator
- Needs: Manage products, inventory, orders, view payments and dashboard stats

## Core Requirements (Implemented)

### Authentication (JWT)
- [x] User registration with email/password
- [x] User login with JWT tokens
- [x] Role-based access (CUSTOMER, ADMIN)
- [x] Protected routes

### Products
- [x] Product catalog with images, prices, categories
- [x] Category filtering and search
- [x] Stock quantity display
- [x] Product detail pages

### Cart
- [x] Add to cart with quantity
- [x] Update quantities
- [x] Remove items
- [x] Stock validation
- [x] Persistent cart (per user)

### Orders
- [x] Create order from cart
- [x] Address capture
- [x] Order status tracking
- [x] Order history

### M-Pesa Payment
- [x] STK Push initiation
- [x] Callback handling
- [x] Payment status polling
- [x] Idempotency for callbacks
- [x] Inventory deduction on payment success

### Admin Dashboard
- [x] Sales statistics
- [x] Orders today count
- [x] Failed payments count
- [x] Low stock alerts
- [x] Recent orders

### Admin Management
- [x] Products CRUD
- [x] Inventory adjustments with logging
- [x] Order status updates
- [x] Payment monitoring

## What's Been Implemented (Jan 6, 2026)

### Backend (FastAPI)
- Full REST API with 30+ endpoints
- MongoDB collections: users, products, inventory, carts, orders, payments, mpesa_transactions
- JWT authentication with bcrypt password hashing
- M-Pesa integration with Safaricom Daraja API (sandbox)
- Inventory management with audit logging
- Order status workflow

### Frontend (React)
- Homepage with hero, categories, featured products
- Products list with filters and search
- Product detail with add to cart
- Shopping cart with quantity controls
- Checkout with address form
- M-Pesa payment page with STK Push
- Order history
- Admin dashboard with stats
- Admin products, inventory, orders, payments pages
- Mobile-responsive design with bottom navigation

### Design
- Professional neutral theme (admin)
- Light grey with green/black tones (customer)
- Manrope + Inter fonts
- Shadcn/UI components
- Emerald green primary color (#10B981)

## API Credentials
- **Admin Email**: admin@wacka.co.ke
- **Admin Password**: admin123
- **M-Pesa**: Sandbox credentials configured

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] User auth
- [x] Product catalog
- [x] Cart
- [x] Orders
- [x] M-Pesa payment
- [x] Admin dashboard

### P1 (Important) - Next
- [ ] Real M-Pesa production credentials integration
- [ ] Email notifications (order confirmation, payment receipt)
- [ ] SMS notifications via Africa's Talking
- [ ] Better image upload (cloud storage)
- [ ] Product variants (size, color)

### P2 (Nice to Have)
- [ ] Wishlists
- [ ] Coupons/discounts
- [ ] Reviews and ratings
- [ ] Related products
- [ ] Analytics dashboard

## Next Tasks
1. Test with real M-Pesa production credentials when available
2. Add email/SMS notifications
3. Implement image upload to cloud storage
4. Add more products and categories
5. Set up production deployment

## Architecture Notes
- Backend: Single server.py with all routes (could split into modules for scale)
- Frontend: Page-based routing with context providers for auth and cart
- Database: MongoDB with proper indexes on key fields
- Payments: M-Pesa STK Push with callback handling
