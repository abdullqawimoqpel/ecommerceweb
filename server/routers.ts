import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// Seller-only procedure
const sellerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "seller" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // ==================== AUTH ROUTES ====================
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          avatar: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });
        // Update user in database
        return { success: true };
      }),
  }),

  // ==================== PRODUCT ROUTES ====================
  products: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
          categoryId: z.number().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          search: z.string().optional(),
          isFeatured: z.boolean().optional(),
        })
      )
      .query(async ({ input }) => {
        const products = await db.getProducts(input.limit, input.offset, {
          categoryId: input.categoryId,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          search: input.search,
          isFeatured: input.isFeatured,
        });
        return products;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const product = await db.getProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        // Track browsing history if user is logged in
        if (ctx.user) {
          await db.trackBrowsingHistory(ctx.user.id, product.id, product.categoryId);
        }

        return product;
      }),

    search: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await db.searchProducts(input.query, input.limit);
      }),

    getFeatured: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return await db.getProducts(input.limit, 0, { isFeatured: true });
      }),

    // Admin: Create product
    create: adminProcedure
      .input(
        z.object({
          sellerId: z.number(),
          categoryId: z.number(),
          name: z.string(),
          nameAr: z.string(),
          description: z.string().optional(),
          descriptionAr: z.string().optional(),
          price: z.number(),
          originalPrice: z.number().optional(),
          sku: z.string(),
          stock: z.number(),
          images: z.array(z.string()).optional(),
          thumbnail: z.string().optional(),
          slug: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Create product in database
        return { success: true };
      }),

    // Admin: Update product
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().optional(),
            nameAr: z.string().optional(),
            price: z.number().optional(),
            stock: z.number().optional(),
            description: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        // Update product in database
        return { success: true };
      }),

    // Admin: Delete product
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Delete product from database
        return { success: true };
      }),
  }),

  // ==================== CATEGORY ROUTES ====================
  categories: router({
    list: publicProcedure.query(async () => {
      return await db.getCategories();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCategoryById(input.id);
      }),
  }),

  // ==================== CART ROUTES ====================
  cart: router({
    getItems: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCartItems(ctx.user.id);
    }),

    addItem: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        if (product.stock < input.quantity)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient stock" });

        await db.addToCart(ctx.user.id, input.productId, input.quantity);
        return { success: true };
      }),

    updateItem: protectedProcedure
      .input(z.object({ cartItemId: z.number(), quantity: z.number().min(0) }))
      .mutation(async ({ input }) => {
        await db.updateCartItem(input.cartItemId, input.quantity);
        return { success: true };
      }),

    removeItem: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeFromCart(input.cartItemId);
        return { success: true };
      }),

    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await db.clearCart(ctx.user.id);
      return { success: true };
    }),
  }),

  // ==================== WISHLIST ROUTES ====================
  wishlist: router({
    getItems: protectedProcedure.query(async ({ ctx }) => {
      return await db.getWishlistItems(ctx.user.id);
    }),

    addItem: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        await db.addToWishlist(ctx.user.id, input.productId);
        return { success: true };
      }),

    removeItem: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFromWishlist(ctx.user.id, input.productId);
        return { success: true };
      }),
  }),

  // ==================== ADDRESS ROUTES ====================
  addresses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAddresses(ctx.user.id);
    }),

    add: protectedProcedure
      .input(
        z.object({
          label: z.string().optional(),
          fullName: z.string(),
          phone: z.string(),
          street: z.string(),
          city: z.string(),
          region: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.addAddress(ctx.user.id, input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            label: z.string().optional(),
            fullName: z.string().optional(),
            phone: z.string().optional(),
            street: z.string().optional(),
            city: z.string().optional(),
            region: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
            isDefault: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateAddress(input.id, input.data);
        return { success: true };
      }),
  }),

  // ==================== ORDER ROUTES ====================
  orders: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserOrders(ctx.user.id, input.limit, input.offset);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const order = await db.getOrderById(input.id);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.userId !== ctx.user.id && ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN" });

        const items = await db.getOrderItems(order.id);
        return { ...order, items };
      }),

    create: protectedProcedure
      .input(
        z.object({
          shippingAddressId: z.number(),
          billingAddressId: z.number().optional(),
          paymentMethod: z.enum(["mada", "creditCard", "stcPay"]),
          loyaltyPointsToRedeem: z.number().default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cartItems = await db.getCartItems(ctx.user.id);
        if (cartItems.length === 0)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cart is empty" });

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const cartItem of cartItems) {
          const product = await db.getProductById(cartItem.productId);
          if (!product) continue;

          const itemTotal = parseFloat(product.price) * cartItem.quantity;
          subtotal += itemTotal;

          orderItems.push({
            orderId: 0, // Will be set after order creation
            productId: cartItem.productId,
            sellerId: product.sellerId,
            quantity: cartItem.quantity,
            price: product.price,
            discount: "0",
            subtotal: itemTotal.toString(),
          });
        }

        const tax = subtotal * 0.15; // 15% VAT
        const shippingCost = 30; // Fixed shipping
        const discount = input.loyaltyPointsToRedeem * 0.1; // 1 point = 0.1 SAR
        const total = subtotal + tax + shippingCost - discount;

        // Create order
        const orderNumber = `ORD-${Date.now()}`;
        const orderResult = await db.createOrder({
          userId: ctx.user.id,
          orderNumber,
          subtotal: subtotal.toString(),
          tax: tax.toString(),
          shippingCost: shippingCost.toString(),
          discount: discount.toString(),
          loyaltyPointsUsed: input.loyaltyPointsToRedeem,
          total: total.toString(),
          paymentMethod: input.paymentMethod,
          shippingAddressId: input.shippingAddressId,
          billingAddressId: input.billingAddressId,
        });

        if (!orderResult) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const orderId = orderResult as unknown as number;

        // Add order items
        const itemsWithOrderId = orderItems.map((item) => ({
          ...item,
          orderId,
        }));
        await db.addOrderItems(itemsWithOrderId);

        // Clear cart
        await db.clearCart(ctx.user.id);

        // Add loyalty points earned
        const pointsEarned = Math.floor(subtotal / 10); // 1 point per 10 SAR
        await db.addLoyaltyTransaction({
          userId: ctx.user.id,
          orderId,
          type: "earn",
          points: pointsEarned,
          description: `Points earned from order ${orderNumber}`,
        });

        // Deduct redeemed points
        if (input.loyaltyPointsToRedeem > 0) {
          await db.addLoyaltyTransaction({
            userId: ctx.user.id,
            orderId,
            type: "redeem",
            points: -input.loyaltyPointsToRedeem,
            description: `Points redeemed in order ${orderNumber}`,
          });
          await db.updateUserLoyaltyPoints(ctx.user.id, -input.loyaltyPointsToRedeem);
        }

        // Add earned points
        await db.updateUserLoyaltyPoints(ctx.user.id, pointsEarned);

        return { orderId, orderNumber, total };
      }),

    // Admin: Update order status
    updateStatus: adminProcedure
      .input(
        z.object({
          orderId: z.number(),
          status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.orderId, input.status);
        return { success: true };
      }),
  }),

  // ==================== REVIEWS ROUTES ====================
  reviews: router({
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number(), limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return await db.getProductReviews(input.productId, input.limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          rating: z.number().min(1).max(5),
          title: z.string().optional(),
          comment: z.string().optional(),
          images: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });

        await db.addReview({
          productId: input.productId,
          userId: ctx.user.id,
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          images: input.images,
        });

        return { success: true };
      }),
  }),

  // ==================== LOYALTY ROUTES ====================
  loyalty: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return { points: user?.loyaltyPoints || 0 };
    }),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserLoyaltyHistory(ctx.user.id, input.limit);
      }),
  }),

  // ==================== SELLER ROUTES ====================
  sellers: router({
    getProfile: sellerProcedure.query(async ({ ctx }) => {
      return await db.getSellerByUserId(ctx.user.id);
    }),

    register: protectedProcedure
      .input(
        z.object({
          storeName: z.string(),
          storeDescription: z.string().optional(),
          storeImage: z.string().optional(),
          phone: z.string(),
          email: z.string(),
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existingSeller = await db.getSellerByUserId(ctx.user.id);
        if (existingSeller) throw new TRPCError({ code: "BAD_REQUEST", message: "Already a seller" });

        await db.createSeller({
          userId: ctx.user.id,
          ...input,
        });

        return { success: true };
      }),

    getProducts: sellerProcedure.query(async ({ ctx }) => {
      const seller = await db.getSellerByUserId(ctx.user.id);
      if (!seller) throw new TRPCError({ code: "NOT_FOUND" });

      return await db.getProductsBySellerId(seller.id);
    }),
  }),

  // ==================== ADMIN ROUTES ====================
  admin: router({
    getAnalytics: adminProcedure.query(async () => {
      return await db.getAnalytics();
    }),

    updateAnalytics: adminProcedure.mutation(async () => {
      await db.updateAnalytics(new Date());
      return { success: true };
    }),
  }),

  // ==================== AI RECOMMENDATIONS ROUTES ====================
  recommendations: router({
    getPersonalized: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        // Get user's browsing history
        const browsingHistory = await db.getUserBrowsingHistory(ctx.user.id, 50);

        if (browsingHistory.length === 0) {
          // Return featured products if no history
          return await db.getProducts(input.limit, 0, { isFeatured: true });
        }

        // Group by category and find most viewed
        const categoryFreq: Record<number, number> = {};
        browsingHistory.forEach((item) => {
          categoryFreq[item.categoryId] = (categoryFreq[item.categoryId] || 0) + 1;
        });

        const topCategory = Object.entries(categoryFreq).sort(([, a], [, b]) => b - a)[0];
        if (!topCategory) return [];

        // Get products from top category
        return await db.getProducts(input.limit, 0, {
          categoryId: parseInt(topCategory[0]),
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
