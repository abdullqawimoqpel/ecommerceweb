import { eq, and, gte, lte, like, desc, asc, sql, inArray, count, sum, avg } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  sellers,
  products,
  categories,
  cartItems,
  wishlistItems,
  addresses,
  orders,
  orderItems,
  reviews,
  browsingHistory,
  loyaltyTransactions,
  promotions,
  analytics,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER QUERIES ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "avatar"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserLoyaltyPoints(userId: number, points: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ loyaltyPoints: sql`loyaltyPoints + ${points}` })
    .where(eq(users.id, userId));
}

// ==================== PRODUCT QUERIES ====================

export async function getProducts(
  limit: number = 20,
  offset: number = 0,
  filters?: {
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    isFeatured?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(products.isActive, true)];

  if (filters?.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }

  if (filters?.minPrice !== undefined) {
    conditions.push(gte(sql`CAST(${products.price} AS DECIMAL(12,2))`, filters.minPrice));
  }

  if (filters?.maxPrice !== undefined) {
    conditions.push(lte(sql`CAST(${products.price} AS DECIMAL(12,2))`, filters.maxPrice));
  }

  if (filters?.search) {
    conditions.push(
      sql`${products.name} LIKE ${`%${filters.search}%`} OR ${products.nameAr} LIKE ${`%${filters.search}%`}`
    );
  }

  if (filters?.isFeatured) {
    conditions.push(eq(products.isFeatured, true));
  }

  return await db
    .select()
    .from(products)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getProductsBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(products)
    .where(eq(products.sellerId, sellerId));
}

export async function searchProducts(query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        sql`${products.name} LIKE ${`%${query}%`} OR ${products.nameAr} LIKE ${`%${query}%`}`
      )
    )
    .limit(limit);
}

// ==================== CATEGORY QUERIES ====================

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.displayOrder));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== CART QUERIES ====================

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
}

export async function addToCart(userId: number, productId: number, quantity: number) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      userId,
      productId,
      quantity,
    });
  }
}

export async function updateCartItem(cartItemId: number, quantity: number) {
  const db = await getDb();
  if (!db) return;

  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  } else {
    await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, cartItemId));
  }
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// ==================== WISHLIST QUERIES ====================

export async function getWishlistItems(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
}

export async function addToWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .limit(1);

  if (!existing.length) {
    await db.insert(wishlistItems).values({
      userId,
      productId,
    });
  }
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
}

// ==================== ADDRESS QUERIES ====================

export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault));
}

export async function addAddress(
  userId: number,
  data: {
    label?: string;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    region?: string;
    postalCode?: string;
    country: string;
    isDefault?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;

  if (data.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
  }

  await db.insert(addresses).values({
    userId,
    ...data,
  });
}

export async function updateAddress(
  addressId: number,
  data: Record<string, any>
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(addresses)
    .set(data)
    .where(eq(addresses.id, addressId));
}

export async function getAddressById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== ORDER QUERIES ====================

export async function createOrder(data: {
  userId: number;
  orderNumber: string;
  subtotal: number | string;
  tax: number | string;
  shippingCost: number | string;
  discount: number | string;
  loyaltyPointsUsed: number;
  total: number | string;
  paymentMethod: "mada" | "creditCard" | "stcPay";
  shippingAddressId: number;
  billingAddressId?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const formattedData = {
    ...data,
    subtotal: typeof data.subtotal === 'number' ? data.subtotal.toString() : data.subtotal,
    tax: typeof data.tax === 'number' ? data.tax.toString() : data.tax,
    shippingCost: typeof data.shippingCost === 'number' ? data.shippingCost.toString() : data.shippingCost,
    discount: typeof data.discount === 'number' ? data.discount.toString() : data.discount,
    total: typeof data.total === 'number' ? data.total.toString() : data.total,
  };

  const result = await db.insert(orders).values(formattedData);
  return result[0];
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserOrders(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(orders)
    .set({ status: status as any })
    .where(eq(orders.id, orderId));
}

export async function addOrderItems(items: Array<{
  orderId: number;
  productId: number;
  sellerId: number;
  quantity: number;
  price: string | number;
  discount: string | number;
  subtotal: string | number;
}>) {
  const db = await getDb();
  if (!db) return;

  const formattedItems = items.map(item => ({
    ...item,
    price: typeof item.price === 'number' ? item.price.toString() : item.price,
    discount: typeof item.discount === 'number' ? item.discount.toString() : item.discount,
    subtotal: typeof item.subtotal === 'number' ? item.subtotal.toString() : item.subtotal,
  }));

  await db.insert(orderItems).values(formattedItems);
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

// ==================== REVIEW QUERIES ====================

export async function getProductReviews(productId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function addReview(data: {
  productId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(reviews).values(data);
}

// ==================== BROWSING HISTORY QUERIES ====================

export async function trackBrowsingHistory(
  userId: number,
  productId: number,
  categoryId: number,
  viewDuration?: number
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(browsingHistory).values({
    userId,
    productId,
    categoryId,
    viewDuration,
  });
}

export async function getUserBrowsingHistory(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(browsingHistory)
    .where(eq(browsingHistory.userId, userId))
    .orderBy(desc(browsingHistory.viewedAt))
    .limit(limit);
}

// ==================== LOYALTY QUERIES ====================

export async function addLoyaltyTransaction(data: {
  userId: number;
  orderId?: number;
  type: "earn" | "redeem" | "bonus" | "adjustment";
  points: number;
  description?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(loyaltyTransactions).values(data);
}

export async function getUserLoyaltyHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, userId))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(limit);
}

// ==================== SELLER QUERIES ====================

export async function getSellerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(sellers)
    .where(eq(sellers.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getSellerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(sellers)
    .where(eq(sellers.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSeller(data: {
  userId: number;
  storeName: string;
  storeDescription?: string;
  storeImage?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  country?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(sellers).values(data);
}

// ==================== ANALYTICS QUERIES ====================

export async function getAnalytics() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(analytics)
    .orderBy(desc(analytics.date))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateAnalytics(date: Date) {
  const db = await getDb();
  if (!db) return;

  const totalOrdersResult = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.paymentStatus, "completed"));

  const totalRevenueResult = await db
    .select({ sum: sum(orders.total) })
    .from(orders)
    .where(eq(orders.paymentStatus, "completed"));

  const totalUsersResult = await db
    .select({ count: count() })
    .from(users);

  const totalProductsResult = await db
    .select({ count: count() })
    .from(products);

  const totalSellersResult = await db
    .select({ count: count() })
    .from(sellers);

  const totalOrders = (totalOrdersResult[0]?.count as unknown as number) || 0;
  const totalRevenueRaw = totalRevenueResult[0]?.sum as unknown as number;
  const totalRevenue = typeof totalRevenueRaw === 'number' ? totalRevenueRaw : 0;
  const totalUsers = (totalUsersResult[0]?.count as unknown as number) || 0;
  const totalProducts = (totalProductsResult[0]?.count as unknown as number) || 0;
  const totalSellers = (totalSellersResult[0]?.count as unknown as number) || 0;

  await db.insert(analytics).values({
    date,
    totalOrders,
    totalRevenue: totalRevenue.toString(),
    totalUsers,
    totalProducts,
    totalSellers,
    averageOrderValue: (totalRevenue / (totalOrders || 1)).toString(),
  });
}
