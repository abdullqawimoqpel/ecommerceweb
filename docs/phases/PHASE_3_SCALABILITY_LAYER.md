# PHASE 3: Scalability Layer - Redis, Queues, CDN, Event-Driven Architecture

## Executive Summary

This phase implements the scalability infrastructure that enables the system to handle 1M+ concurrent users with high throughput, low latency, and distributed processing. Key components include Redis caching, message queues (BullMQ), CDN integration, and event-driven architecture.

**Deliverables:**
1. Redis caching patterns and strategies
2. Message queue system (BullMQ/RabbitMQ)
3. Event-driven architecture with event bus
4. CDN integration for image optimization
5. Rate limiting and circuit breakers
6. Distributed tracing and monitoring
7. Production-ready configuration

---

## 1. Redis Caching Architecture

### 1.1 Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│              CACHING LAYERS                          │
├─────────────────────────────────────────────────────┤
│                                                       │
│  L1: Application Memory Cache (In-Process)          │
│      - Fast, but limited to single instance         │
│      - Used for frequently accessed data            │
│                                                       │
│  L2: Redis Distributed Cache                        │
│      - Shared across all instances                  │
│      - Session storage, user data, products         │
│      - TTL-based expiration                         │
│                                                       │
│  L3: Database (PostgreSQL)                          │
│      - Source of truth                              │
│      - Persistent storage                           │
│                                                       │
│  L4: CDN (CloudFront)                               │
│      - Static assets, images                        │
│      - Global edge locations                        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 1.2 Redis Module Configuration

```typescript
// cache/redis.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';

@Module({
  imports: [
    CacheModule.register<RedisClientOptions>({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ttl: 60 * 60, // 1 hour default
      max: 100, // Maximum number of items in cache
    }),
  ],
})
export class RedisModule {}
```

### 1.3 Cache Keys Strategy

```typescript
// cache/cache-keys.ts
export class CacheKeys {
  // Product caching
  static PRODUCT(id: string) {
    return `product:${id}`;
  }

  static PRODUCTS_CATEGORY(categoryId: string, page: number) {
    return `products:category:${categoryId}:page:${page}`;
  }

  static PRODUCTS_SEARCH(query: string, page: number) {
    return `products:search:${query}:page:${page}`;
  }

  // User caching
  static USER(id: string) {
    return `user:${id}`;
  }

  static USER_CART(userId: string) {
    return `cart:${userId}`;
  }

  static USER_WISHLIST(userId: string) {
    return `wishlist:${userId}`;
  }

  static USER_LOYALTY_POINTS(userId: string) {
    return `loyalty:${userId}`;
  }

  // Session caching
  static SESSION(sessionId: string) {
    return `session:${sessionId}`;
  }

  // Order caching
  static ORDER(orderId: string) {
    return `order:${orderId}`;
  }

  static USER_ORDERS(userId: string, page: number) {
    return `orders:${userId}:page:${page}`;
  }

  // Category caching
  static CATEGORIES = 'categories:all';

  // Seller caching
  static SELLER(id: string) {
    return `seller:${id}`;
  }

  static SELLER_PRODUCTS(sellerId: string, page: number) {
    return `seller:${sellerId}:products:page:${page}`;
  }

  // Analytics caching
  static ANALYTICS_DAILY(date: string) {
    return `analytics:daily:${date}`;
  }

  static ANALYTICS_HOURLY(hour: string) {
    return `analytics:hourly:${hour}`;
  }
}
```

### 1.4 Cache Service Implementation

```typescript
// cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys } from './cache-keys';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || 3600000); // 1 hour default
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.cacheManager.store.getKeys();
      const matchingKeys = keys.filter((key) => key.includes(pattern));
      await Promise.all(matchingKeys.map((key) => this.cacheManager.del(key)));
    } catch (error) {
      console.error(`Cache pattern delete error for pattern ${pattern}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidate(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.del(key)));
  }
}
```

### 1.5 Cache Decorator

```typescript
// cache/cache.decorator.ts
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

export function Cacheable(ttl: number = 3600) {
  return applyDecorators(
    UseInterceptors(CacheInterceptor),
    CacheTTL(ttl),
  );
}
```

---

## 2. Message Queue System (BullMQ)

### 2.1 Queue Architecture

```
┌─────────────────────────────────────────────────────┐
│           MESSAGE QUEUE ARCHITECTURE                 │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Producers (Services)                               │
│      ↓                                               │
│  ┌─────────────────────────────────────────────┐   │
│  │         BullMQ (Redis-backed)               │   │
│  │  - Order Processing Queue                   │   │
│  │  - Payment Processing Queue                 │   │
│  │  - Notification Queue                       │   │
│  │  - Image Processing Queue                   │   │
│  │  - Analytics Queue                          │   │
│  │  - Email Queue                              │   │
│  └─────────────────────────────────────────────┘   │
│      ↓                                               │
│  Consumers (Workers)                                │
│      ↓                                               │
│  Processing Results                                 │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 Queue Configuration

```typescript
// queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrderProcessor } from './processors/order.processor';
import { PaymentProcessor } from './processors/payment.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ImageProcessor } from './processors/image.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue(
      { name: 'orders' },
      { name: 'payments' },
      { name: 'notifications' },
      { name: 'images' },
      { name: 'analytics' },
      { name: 'emails' },
    ),
  ],
  providers: [
    OrderProcessor,
    PaymentProcessor,
    NotificationProcessor,
    ImageProcessor,
    AnalyticsProcessor,
  ],
})
export class QueueModule {}
```

### 2.3 Order Processor Example

```typescript
// queue/processors/order.processor.ts
import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { OrdersService } from '../../modules/orders/orders.service';

@Processor('orders')
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Process('process-order')
  async processOrder(job: Job<{ orderId: string }>) {
    this.logger.log(`Processing order: ${job.data.orderId}`);

    try {
      const order = await this.ordersService.processOrder(job.data.orderId);
      
      // Update progress
      job.progress(50);

      // Validate inventory
      await this.ordersService.validateInventory(order);
      job.progress(75);

      // Reserve inventory
      await this.ordersService.reserveInventory(order);
      job.progress(100);

      return { success: true, orderId: order.id };
    } catch (error) {
      this.logger.error(`Error processing order: ${error.message}`);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
  }
}
```

### 2.4 Queue Producer Service

```typescript
// queue/queue.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('orders') private ordersQueue: Queue,
    @InjectQueue('payments') private paymentsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('images') private imagesQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('emails') private emailsQueue: Queue,
  ) {}

  async addOrderProcessing(orderId: string) {
    return this.ordersQueue.add(
      'process-order',
      { orderId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );
  }

  async addPaymentProcessing(paymentId: string, amount: number) {
    return this.paymentsQueue.add(
      'process-payment',
      { paymentId, amount },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        priority: 10, // High priority
      },
    );
  }

  async addNotification(userId: string, type: string, data: any) {
    return this.notificationsQueue.add(
      'send-notification',
      { userId, type, data },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async addImageProcessing(imageUrl: string, sizes: number[]) {
    return this.imagesQueue.add(
      'process-image',
      { imageUrl, sizes },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async addAnalyticsEvent(event: string, data: any) {
    return this.analyticsQueue.add(
      'track-event',
      { event, data, timestamp: new Date() },
      {
        attempts: 2,
        removeOnComplete: true,
      },
    );
  }

  async addEmail(to: string, subject: string, template: string, data: any) {
    return this.emailsQueue.add(
      'send-email',
      { to, subject, template, data },
      {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
      },
    );
  }
}
```

---

## 3. Event-Driven Architecture

### 3.1 Event System

```typescript
// events/event.bus.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  timestamp: Date;
  data: any;
}

@Injectable()
export class EventBus {
  constructor(private eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    this.eventEmitter.emit(event.eventType, event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>) {
    this.eventEmitter.on(eventType, handler);
  }
}
```

### 3.2 Domain Events

```typescript
// events/domain-events.ts
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
    public readonly items: any[],
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderConfirmedEvent {
  constructor(
    public readonly orderId: string,
    public readonly confirmationNumber: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PaymentProcessedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly status: 'success' | 'failed',
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class InventoryReservedEvent {
  constructor(
    public readonly orderId: string,
    public readonly items: Array<{ productId: string; quantity: number }>,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class OrderShippedEvent {
  constructor(
    public readonly orderId: string,
    public readonly trackingNumber: string,
    public readonly carrier: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class LoyaltyPointsEarnedEvent {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
    public readonly points: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
```

### 3.3 Event Listeners

```typescript
// events/listeners/order.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent, PaymentProcessedEvent, OrderShippedEvent } from '../domain-events';
import { QueueService } from '../../queue/queue.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { LoyaltyService } from '../../modules/loyalty/loyalty.service';

@Injectable()
export class OrderListener {
  private readonly logger = new Logger(OrderListener.name);

  constructor(
    private queueService: QueueService,
    private notificationsService: NotificationsService,
    private loyaltyService: LoyaltyService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(`Order created: ${event.orderId}`);

    // Add to processing queue
    await this.queueService.addOrderProcessing(event.orderId);

    // Send confirmation notification
    await this.notificationsService.sendOrderConfirmation(
      event.userId,
      event.orderId,
    );
  }

  @OnEvent('payment.processed')
  async handlePaymentProcessed(event: PaymentProcessedEvent) {
    this.logger.log(`Payment processed: ${event.paymentId}`);

    if (event.status === 'success') {
      // Award loyalty points
      const points = Math.floor(event.amount);
      await this.loyaltyService.awardPoints(
        event.orderId,
        points,
      );

      // Send payment confirmation
      await this.notificationsService.sendPaymentConfirmation(
        event.orderId,
      );
    } else {
      // Send payment failure notification
      await this.notificationsService.sendPaymentFailure(
        event.orderId,
      );
    }
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(event: OrderShippedEvent) {
    this.logger.log(`Order shipped: ${event.orderId}`);

    // Send shipping notification
    await this.notificationsService.sendShippingNotification(
      event.orderId,
      event.trackingNumber,
      event.carrier,
    );
  }
}
```

---

## 4. CDN Integration (CloudFront)

### 4.1 Image Optimization Service

```typescript
// storage/image-optimization.service.ts
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { S3Service } from './s3.service';

@Injectable()
export class ImageOptimizationService {
  private readonly SIZES = {
    thumbnail: 150,
    small: 300,
    medium: 600,
    large: 1200,
  };

  constructor(private s3Service: S3Service) {}

  async optimizeAndUpload(
    imageBuffer: Buffer,
    originalName: string,
    folder: string,
  ): Promise<{ original: string; optimized: Record<string, string> }> {
    const baseName = originalName.split('.')[0];
    const optimized: Record<string, string> = {};

    // Upload original
    const originalKey = `${folder}/${baseName}-original.webp`;
    const originalWebp = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
    await this.s3Service.uploadFile(originalWebp, originalKey, 'image/webp');

    // Generate and upload optimized sizes
    for (const [size, width] of Object.entries(this.SIZES)) {
      const resizedBuffer = await sharp(imageBuffer)
        .resize(width, width, { fit: 'cover' })
        .webp({ quality: 75 })
        .toBuffer();

      const key = `${folder}/${baseName}-${size}.webp`;
      await this.s3Service.uploadFile(resizedBuffer, key, 'image/webp');
      optimized[size] = this.s3Service.getCdnUrl(key);
    }

    return {
      original: this.s3Service.getCdnUrl(originalKey),
      optimized,
    };
  }

  async generateThumbnail(imageBuffer: Buffer, folder: string, name: string): Promise<string> {
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(150, 150, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();

    const key = `${folder}/${name}-thumb.webp`;
    await this.s3Service.uploadFile(thumbnailBuffer, key, 'image/webp');
    return this.s3Service.getCdnUrl(key);
  }
}
```

### 4.2 S3 + CloudFront Service

```typescript
// storage/s3.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor() {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    this.bucket = process.env.S3_BUCKET || 'ecommerce-bucket';
    this.cdnUrl = process.env.CLOUDFRONT_URL || `https://${this.bucket}.s3.amazonaws.com`;
  }

  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000', // 1 year for immutable assets
    });

    await this.s3Client.send(command);
    return this.getCdnUrl(key);
  }

  async getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  getCdnUrl(key: string): string {
    return `${this.cdnUrl}/${key}`;
  }

  getS3Url(key: string): string {
    return `s3://${this.bucket}/${key}`;
  }
}
```

---

## 5. Rate Limiting & Circuit Breaker

### 5.1 Rate Limiting Guard

```typescript
// common/guards/rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const key = `rate-limit:${userId}`;
    const limit = 100; // requests per minute
    const window = 60; // seconds

    const current = await this.cacheManager.get<number>(key);
    const count = (current || 0) + 1;

    if (count > limit) {
      throw new TooManyRequestsException(
        `Rate limit exceeded. Max ${limit} requests per ${window} seconds`,
      );
    }

    await this.cacheManager.set(key, count, window * 1000);
    return true;
  }
}
```

### 5.2 Circuit Breaker Pattern

```typescript
// common/circuit-breaker/circuit-breaker.ts
import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(
    private readonly failureThreshold = 5,
    private readonly successThreshold = 2,
    private readonly timeout = 60000, // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.log('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
          this.successCount = 0;
          this.logger.log('Circuit breaker is now CLOSED');
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.logger.error('Circuit breaker is now OPEN');
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

---

## 6. Distributed Tracing

### 6.1 Correlation ID Middleware

```typescript
// common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationIdStorage = new AsyncLocalStorage<string>();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    
    correlationIdStorage.run(correlationId, () => {
      res.setHeader('x-correlation-id', correlationId);
      next();
    });
  }
}
```

### 6.2 Distributed Tracing Service

```typescript
// tracing/tracing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { correlationIdStorage } from '../common/middleware/correlation-id.middleware';

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);

  getCorrelationId(): string {
    return correlationIdStorage.getStore() || 'unknown';
  }

  logWithContext(message: string, context?: any) {
    const correlationId = this.getCorrelationId();
    this.logger.log(`[${correlationId}] ${message}`, context);
  }

  errorWithContext(message: string, error?: any, context?: any) {
    const correlationId = this.getCorrelationId();
    this.logger.error(`[${correlationId}] ${message}`, error, context);
  }

  debugWithContext(message: string, context?: any) {
    const correlationId = this.getCorrelationId();
    this.logger.debug(`[${correlationId}] ${message}`, context);
  }
}
```

---

## 7. Monitoring & Observability

### 7.1 Prometheus Metrics

```typescript
// monitoring/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private activeConnections: Gauge;
  private cacheHits: Counter;
  private cacheMisses: Counter;
  private queueJobsProcessed: Counter;
  private queueJobsFailed: Counter;

  constructor() {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['key_pattern'],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['key_pattern'],
    });

    this.queueJobsProcessed = new Counter({
      name: 'queue_jobs_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name'],
    });

    this.queueJobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue_name'],
    });
  }

  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.labels(method, route, status.toString()).observe(duration);
    this.httpRequestTotal.labels(method, route, status.toString()).inc();
  }

  recordCacheHit(keyPattern: string) {
    this.cacheHits.labels(keyPattern).inc();
  }

  recordCacheMiss(keyPattern: string) {
    this.cacheMisses.labels(keyPattern).inc();
  }

  recordQueueJobProcessed(queueName: string) {
    this.queueJobsProcessed.labels(queueName).inc();
  }

  recordQueueJobFailed(queueName: string) {
    this.queueJobsFailed.labels(queueName).inc();
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }
}
```

### 7.2 Health Check Endpoint

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.http.pingCheck('redis', `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`),
    ]);
  }
}
```

---

## 8. Configuration Files

### 8.1 Docker Compose with All Services

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: ecommerce
      POSTGRES_PASSWORD: ecommerce123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ecommerce"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://ecommerce:ecommerce123@postgres:5432/ecommerce
      REDIS_HOST: redis
      REDIS_PORT: 6379
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
      JWT_SECRET: your-secret-key
      AWS_REGION: us-east-1
      S3_BUCKET: ecommerce-bucket
      CLOUDFRONT_URL: https://d123.cloudfront.net
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:
```

---

## 9. Performance Metrics

### Expected Performance with Scalability Layer

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Latency (p99) | 500ms | 150ms | 70% ↓ |
| Cache Hit Rate | 0% | 85% | +85% |
| Throughput | 1,000 req/s | 50,000 req/s | 50x ↑ |
| Database Load | 100% | 20% | 80% ↓ |
| Response Time | 2s | 200ms | 90% ↓ |
| Concurrent Users | 10,000 | 1,000,000 | 100x ↑ |

---

## 10. Implementation Checklist

### Phase 3A: Redis & Caching (Week 1)
- [ ] Redis module setup
- [ ] Cache keys strategy
- [ ] Cache service implementation
- [ ] Cache decorator
- [ ] Cache invalidation patterns

### Phase 3B: Message Queues (Week 2)
- [ ] BullMQ setup
- [ ] Queue processors
- [ ] Queue service
- [ ] Job retry logic
- [ ] Queue monitoring

### Phase 3C: Event-Driven (Week 2)
- [ ] Event bus implementation
- [ ] Domain events
- [ ] Event listeners
- [ ] Event publishing
- [ ] Event sourcing (optional)

### Phase 3D: CDN & Images (Week 3)
- [ ] S3 integration
- [ ] Image optimization
- [ ] CloudFront setup
- [ ] Presigned URLs
- [ ] Image processing queue

### Phase 3E: Monitoring (Week 3)
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Health checks
- [ ] Distributed tracing
- [ ] Rate limiting

### Phase 3F: Testing & Optimization (Week 4)
- [ ] Load testing
- [ ] Cache effectiveness testing
- [ ] Queue performance testing
- [ ] CDN performance testing
- [ ] Optimization tuning

---

## 11. Next Steps

1. **Implement Redis caching layer**
2. **Set up BullMQ message queues**
3. **Create event-driven architecture**
4. **Integrate S3 + CloudFront CDN**
5. **Add rate limiting & circuit breakers**
6. **Set up monitoring & observability**
7. **Performance testing & optimization**
8. **Prepare for Phase 4**

---

**Document Version:** 3.0
**Status:** Ready for Implementation
**Next Phase:** PHASE 4 - Payments & Orders Hardening
