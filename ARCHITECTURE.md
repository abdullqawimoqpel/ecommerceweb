# Saudi Ecommerce Platform - System Architecture

## Overview

This document outlines the complete system architecture of the Saudi Ecommerce Platform, a full-featured, elegant Arabic e-commerce solution built with React, Node.js, tRPC, and MySQL.

## Technology Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS 4 with RTL support
- **State Management:** React Query (TanStack Query)
- **RPC Client:** tRPC with React hooks
- **Routing:** Wouter
- **UI Components:** shadcn/ui (Radix UI)
- **RTL Support:** Full Arabic language support with proper text direction

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express 4
- **RPC Framework:** tRPC 11
- **Database ORM:** Drizzle ORM
- **Authentication:** Manus OAuth
- **Database:** MySQL/TiDB

### Infrastructure
- **Deployment:** Manus Cloud
- **Storage:** S3 (for images, files, media)
- **API Gateway:** tRPC over HTTP

## Database Schema

### Core Tables

#### Users Table
- Stores user information and authentication data
- Fields: id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn
- Roles: user, admin

#### Products Table
- Product catalog with details
- Fields: id, name, description, price, stock, categoryId, sellerId, rating, reviewCount, imageUrl, createdAt, updatedAt

#### Categories Table
- Product categories for organization
- Fields: id, name, description, imageUrl, createdAt, updatedAt

#### Orders Table
- Customer orders with status tracking
- Fields: id, userId, totalAmount, status, paymentMethod, shippingAddressId, billingAddressId, createdAt, updatedAt

#### OrderItems Table
- Individual items in each order
- Fields: id, orderId, productId, quantity, price, createdAt

#### Cart Table
- Shopping cart items per user
- Fields: id, userId, productId, quantity, createdAt, updatedAt

#### Wishlist Table
- User wishlist items
- Fields: id, userId, productId, createdAt

#### Sellers Table
- Multi-vendor seller information
- Fields: id, userId, storeName, description, rating, totalSales, commissionRate, status, createdAt, updatedAt

#### Addresses Table
- User addresses for shipping and billing
- Fields: id, userId, type, street, city, region, postalCode, phone, isDefault, createdAt, updatedAt

#### LoyaltyPoints Table
- Loyalty points tracking per user
- Fields: id, userId, points, totalEarned, totalRedeemed, lastUpdated

#### LoyaltyHistory Table
- Transaction history for loyalty points
- Fields: id, userId, points, type, description, createdAt

#### BrowsingHistory Table
- User product browsing for recommendations
- Fields: id, userId, productId, viewedAt

#### PurchaseHistory Table
- User purchase history for recommendations
- Fields: id, userId, productId, quantity, purchaseDate

#### Analytics Table
- Platform analytics and metrics
- Fields: id, date, totalOrders, totalRevenue, totalUsers, totalProducts, totalSellers, averageOrderValue, createdAt

## API Architecture

### tRPC Router Structure

```
appRouter
├── auth
│   ├── me (query)
│   └── logout (mutation)
├── products
│   ├── list (query)
│   ├── getById (query)
│   ├── search (query)
│   ├── create (mutation - admin)
│   ├── update (mutation - admin)
│   └── delete (mutation - admin)
├── categories
│   ├── list (query)
│   ├── getById (query)
│   ├── create (mutation - admin)
│   ├── update (mutation - admin)
│   └── delete (mutation - admin)
├── cart
│   ├── getItems (query)
│   ├── addItem (mutation)
│   ├── removeItem (mutation)
│   └── updateQuantity (mutation)
├── wishlist
│   ├── getItems (query)
│   ├── addItem (mutation)
│   └── removeItem (mutation)
├── orders
│   ├── create (mutation)
│   ├── list (query)
│   ├── getById (query)
│   └── updateStatus (mutation - admin)
├── addresses
│   ├── list (query)
│   ├── create (mutation)
│   ├── update (mutation)
│   ├── delete (mutation)
│   └── setDefault (mutation)
├── loyalty
│   ├── getBalance (query)
│   ├── getHistory (query)
│   ├── redeem (mutation)
│   └── earn (mutation)
├── sellers
│   ├── getProfile (query)
│   ├── updateProfile (mutation)
│   ├── getProducts (query)
│   ├── addProduct (mutation)
│   ├── getOrders (query)
│   ├── getSalesMetrics (query)
│   └── getEarnings (query)
├── admin
│   ├── getAnalytics (query)
│   ├── updateAnalytics (mutation)
│   ├── getUsers (query)
│   ├── getUserById (query)
│   ├── updateUserRole (mutation)
│   ├── getOrders (query)
│   ├── updateOrderStatus (mutation)
│   ├── getProducts (query)
│   ├── deleteProduct (mutation)
│   ├── getSellers (query)
│   └── approveSeller (mutation)
├── recommendations
│   ├── getPersonalized (query)
│   ├── trackBrowsing (mutation)
│   └── trackPurchase (mutation)
└── system
    └── notifyOwner (mutation)
```

## Frontend Architecture

### Page Structure

```
client/src/
├── pages/
│   ├── Home.tsx (Landing page with hero, featured products)
│   ├── ProductCatalog.tsx (Product listing with filters)
│   ├── ProductDetail.tsx (Individual product page)
│   ├── Cart.tsx (Shopping cart)
│   ├── Checkout.tsx (Multi-step checkout)
│   ├── OrderTracking.tsx (Order history and tracking)
│   ├── Profile.tsx (User profile management)
│   ├── LoyaltyPoints.tsx (Loyalty program)
│   ├── Wishlist.tsx (Saved items)
│   ├── AdminDashboard.tsx (Admin overview)
│   ├── AdminProducts.tsx (Product management)
│   ├── AdminOrders.tsx (Order management)
│   ├── SellerDashboard.tsx (Seller overview)
│   ├── SellerProducts.tsx (Seller product management)
│   ├── Recommendations.tsx (AI recommendations)
│   └── NotFound.tsx (404 page)
├── components/
│   ├── ui/ (shadcn/ui components)
│   ├── DashboardLayout.tsx (Admin/Seller layout)
│   └── ErrorBoundary.tsx (Error handling)
├── contexts/
│   └── ThemeContext.tsx (Theme management)
├── hooks/
│   └── useAuth.ts (Authentication hook)
├── lib/
│   └── trpc.ts (tRPC client setup)
├── App.tsx (Main routing)
├── main.tsx (React entry point)
└── index.css (Global styles with RTL support)
```

### RTL Support

The platform includes comprehensive RTL (Right-to-Left) support for Arabic:
- CSS utilities for RTL layouts
- Flexbox and Grid adjustments
- Text direction and alignment
- Margin and padding utilities for RTL
- All navigation and UI components properly mirrored

## Authentication Flow

1. User clicks "Login"
2. Redirected to Manus OAuth portal
3. User authenticates with credentials
4. OAuth callback to `/api/oauth/callback`
5. Session cookie created
6. User redirected to app with authenticated session
7. tRPC procedures access `ctx.user` for protected routes

## Payment Flow

### Supported Payment Methods
1. **Mada Card** - Saudi debit card
2. **Credit Card** - International credit cards
3. **STC Pay** - Saudi telecom payment service

### Checkout Process
1. User adds items to cart
2. Proceeds to checkout
3. Selects/adds shipping address
4. Selects billing address
5. Chooses payment method
6. Reviews order summary
7. Applies loyalty points (optional)
8. Confirms order
9. Payment processing
10. Order confirmation

## AI Recommendations Engine

### Data Collection
- **Browsing History:** Tracks product views per user
- **Purchase History:** Records completed purchases
- **User Behavior:** Implicit feedback from interactions

### Recommendation Algorithm
1. Collects user browsing and purchase history
2. Analyzes product categories and attributes
3. Generates personalized recommendations
4. Displays on home page and product detail pages
5. Continuously learns from user interactions

## Loyalty Points System

### Points Earning
- 1 point per 1 SAR spent
- Bonus points for reviews
- Seasonal promotions with multipliers

### Points Redemption
- 100 points = 10 SAR discount
- Redeemable at checkout
- Automatic discount calculation
- Transaction history tracking

## Multi-Vendor Architecture

### Seller Onboarding
1. User registers as seller
2. Provides store information
3. Admin approval required
4. Seller dashboard access granted

### Seller Capabilities
- Create and manage products
- Track inventory
- View sales metrics
- Manage orders
- Track earnings and commissions
- View customer reviews

### Commission Structure
- Configurable per seller
- Automatic calculation on orders
- Transparent earnings dashboard

## Security Features

### Authentication & Authorization
- OAuth 2.0 integration
- Role-based access control (RBAC)
- Protected procedures for sensitive operations
- Session-based authentication

### Data Protection
- HTTPS for all communications
- Secure password storage
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection via React

### Payment Security
- PCI DSS compliance ready
- Secure payment method storage
- Transaction logging
- Fraud detection ready

## Performance Optimizations

### Frontend
- Code splitting with React lazy loading
- Image optimization
- CSS-in-JS optimization
- Caching strategies

### Backend
- Database query optimization
- Connection pooling
- Response compression
- Rate limiting ready

### Infrastructure
- CDN for static assets
- S3 for file storage
- Database indexing
- Query caching

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database replication ready
- Load balancing compatible
- Microservices ready

### Vertical Scaling
- Efficient database queries
- Memory optimization
- CPU-efficient algorithms
- Connection pooling

## Monitoring & Analytics

### Metrics Tracked
- Total orders
- Total revenue
- Active users
- Product count
- Seller count
- Average order value

### Admin Dashboard
- Real-time analytics
- Sales trends
- User growth
- Product performance
- Seller performance

## Deployment Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────┐
│  Manus Cloud Platform   │
│  ┌───────────────────┐  │
│  │  React Frontend   │  │
│  │  (RTL Arabic)     │  │
│  └─────────┬─────────┘  │
│            │ tRPC       │
│  ┌─────────▼─────────┐  │
│  │  Express Backend  │  │
│  │  (Node.js)        │  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │  MySQL Database   │  │
│  │  (TiDB)           │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  S3 Storage       │  │
│  │  (Images/Files)   │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Development Workflow

### Local Development
```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm check

# Format code
pnpm format

# Database migrations
pnpm db:push
```

### Deployment
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Future Enhancements

1. **Mobile App** - Flutter/React Native version
2. **Advanced Analytics** - Machine learning insights
3. **Live Chat** - Real-time customer support
4. **Video Commerce** - Live shopping events
5. **Social Integration** - Share and referral system
6. **Subscription Model** - Premium memberships
7. **Marketplace Expansion** - International sellers
8. **Blockchain** - Supply chain tracking

## Support & Maintenance

- Regular security updates
- Performance monitoring
- Database optimization
- User support system
- Bug tracking and fixes
- Feature requests management

---

**Platform Version:** 1.0.0
**Last Updated:** May 2026
**Status:** Production Ready
