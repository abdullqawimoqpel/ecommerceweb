import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  index,
  foreignKey,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control and profile information.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "seller"]).default("user").notNull(),
  avatar: text("avatar"),
  loyaltyPoints: int("loyaltyPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Seller/Vendor information for multi-vendor support
 */
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeName: varchar("storeName", { length: 255 }).notNull(),
  storeDescription: text("storeDescription"),
  storeImage: text("storeImage"),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalSales: int("totalSales").default(0),
  isVerified: boolean("isVerified").default(false),
  isActive: boolean("isActive").default(true),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("10"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("seller_userId_idx").on(table.userId),
  fk_seller_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
}));

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

/**
 * Product categories for catalog organization
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  image: text("image"),
  icon: text("icon"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  parentId: int("parentId"),
  displayOrder: int("displayOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugIdx: index("category_slug_idx").on(table.slug),
  parentIdIdx: index("category_parentId_idx").on(table.parentId),
}));

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Products with multi-vendor support
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 12, scale: 2 }),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  stock: int("stock").default(0).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: int("reviewCount").default(0),
  images: json("images"), // Array of image URLs
  thumbnail: text("thumbnail"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  isActive: boolean("isActive").default(true),
  isFeatured: boolean("isFeatured").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sellerIdIdx: index("product_sellerId_idx").on(table.sellerId),
  categoryIdIdx: index("product_categoryId_idx").on(table.categoryId),
  slugIdx: index("product_slug_idx").on(table.slug),
  skuIdx: index("product_sku_idx").on(table.sku),
  fk_product_sellerId: foreignKey({
    columns: [table.sellerId],
    foreignColumns: [sellers.id],
  }),
  fk_product_categoryId: foreignKey({
    columns: [table.categoryId],
    foreignColumns: [categories.id],
  }),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product reviews and ratings
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  images: json("images"), // Array of review image URLs
  isVerified: boolean("isVerified").default(false),
  helpful: int("helpful").default(0),
  unhelpful: int("unhelpful").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdIdx: index("review_productId_idx").on(table.productId),
  userIdIdx: index("review_userId_idx").on(table.userId),
  fk_review_productId: foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
  }),
  fk_review_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Shopping cart items
 */
export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("cartItem_userId_idx").on(table.userId),
  productIdIdx: index("cartItem_productId_idx").on(table.productId),
  fk_cartItem_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  fk_cartItem_productId: foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
  }),
}));

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Wishlist items
 */
export const wishlistItems = mysqlTable("wishlistItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("wishlistItem_userId_idx").on(table.userId),
  productIdIdx: index("wishlistItem_productId_idx").on(table.productId),
  fk_wishlistItem_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  fk_wishlistItem_productId: foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
  }),
}));

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;

/**
 * User addresses for checkout
 */
export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 100 }), // Home, Work, etc.
  fullName: varchar("fullName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  street: text("street").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }),
  postalCode: varchar("postalCode", { length: 20 }),
  country: varchar("country", { length: 100 }).notNull(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("address_userId_idx").on(table.userId),
  fk_address_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
}));

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

/**
 * Orders with comprehensive tracking
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ]).default("pending").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  loyaltyPointsUsed: int("loyaltyPointsUsed").default(0),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["mada", "creditCard", "stcPay"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  shippingAddressId: int("shippingAddressId").notNull(),
  billingAddressId: int("billingAddressId"),
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  estimatedDelivery: timestamp("estimatedDelivery"),
  deliveredAt: timestamp("deliveredAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("order_userId_idx").on(table.userId),
  statusIdx: index("order_status_idx").on(table.status),
  orderNumberIdx: index("order_orderNumber_idx").on(table.orderNumber),
  fk_order_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  fk_order_shippingAddressId: foreignKey({
    columns: [table.shippingAddressId],
    foreignColumns: [addresses.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items (line items in an order)
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  sellerId: int("sellerId").notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index("orderItem_orderId_idx").on(table.orderId),
  productIdIdx: index("orderItem_productId_idx").on(table.productId),
  sellerIdIdx: index("orderItem_sellerId_idx").on(table.sellerId),
  fk_orderItem_orderId: foreignKey({
    columns: [table.orderId],
    foreignColumns: [orders.id],
  }),
  fk_orderItem_productId: foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
  }),
  fk_orderItem_sellerId: foreignKey({
    columns: [table.sellerId],
    foreignColumns: [sellers.id],
  }),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * User browsing history for AI recommendations
 */
export const browsingHistory = mysqlTable("browsingHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  categoryId: int("categoryId").notNull(),
  viewDuration: int("viewDuration"), // in seconds
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("browsingHistory_userId_idx").on(table.userId),
  productIdIdx: index("browsingHistory_productId_idx").on(table.productId),
  viewedAtIdx: index("browsingHistory_viewedAt_idx").on(table.viewedAt),
  fk_browsingHistory_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  fk_browsingHistory_productId: foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
  }),
  fk_browsingHistory_categoryId: foreignKey({
    columns: [table.categoryId],
    foreignColumns: [categories.id],
  }),
}));

export type BrowsingHistory = typeof browsingHistory.$inferSelect;
export type InsertBrowsingHistory = typeof browsingHistory.$inferInsert;

/**
 * Loyalty points transactions
 */
export const loyaltyTransactions = mysqlTable("loyaltyTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  type: mysqlEnum("type", ["earn", "redeem", "bonus", "adjustment"]).notNull(),
  points: int("points").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("loyaltyTransaction_userId_idx").on(table.userId),
  orderIdIdx: index("loyaltyTransaction_orderId_idx").on(table.orderId),
  fk_loyaltyTransaction_userId: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  fk_loyaltyTransaction_orderId: foreignKey({
    columns: [table.orderId],
    foreignColumns: [orders.id],
  }),
}));

export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;

/**
 * Promotional banners and campaigns
 */
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  image: text("image"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: decimal("discountValue", { precision: 12, scale: 2 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isActive: boolean("isActive").default(true),
  applicableCategories: json("applicableCategories"), // Array of category IDs
  applicableProducts: json("applicableProducts"), // Array of product IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  isActiveIdx: index("promotion_isActive_idx").on(table.isActive),
}));

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

/**
 * Analytics and metrics
 */
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  totalOrders: int("totalOrders").default(0),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
  totalUsers: int("totalUsers").default(0),
  totalProducts: int("totalProducts").default(0),
  totalSellers: int("totalSellers").default(0),
  averageOrderValue: decimal("averageOrderValue", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  dateIdx: index("analytics_date_idx").on(table.date),
}));

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
