# PHASE 4: Payments & Orders Hardening - Robust Transaction System & Inventory Management

## Executive Summary

This phase implements production-grade payment processing and order management systems that guarantee data consistency, prevent duplicate transactions, handle failures gracefully, and maintain inventory accuracy even under extreme load (1M+ concurrent users).

**Key Principles:**
- **Idempotency:** Same request always produces same result
- **ACID Compliance:** Atomicity, Consistency, Isolation, Durability
- **Eventual Consistency:** Distributed transactions with reconciliation
- **Failure Recovery:** Automatic retry with exponential backoff
- **Audit Trail:** Complete transaction history for compliance

**Deliverables:**
1. Idempotent payment processing
2. Order state machine with saga pattern
3. Inventory management with locking
4. Transaction reconciliation service
5. Payment provider integrations (Mada, STC Pay, Stripe)
6. Refund handling system
7. Fraud detection
8. Comprehensive error handling

---

## 1. Idempotent Payment Processing

### 1.1 Idempotency Key Pattern

```typescript
// payments/idempotency/idempotency-key.ts
import { v4 as uuidv4 } from 'uuid';

export class IdempotencyKey {
  private static readonly IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
  private static readonly IDEMPOTENCY_KEY_REGEX = /^[a-f0-9-]{36}$/;

  static generate(): string {
    return uuidv4();
  }

  static validate(key: string): boolean {
    return this.IDEMPOTENCY_KEY_REGEX.test(key);
  }

  static extract(headers: Record<string, string>): string | null {
    const key = headers[this.IDEMPOTENCY_KEY_HEADER];
    return key && this.validate(key) ? key : null;
  }
}
```

### 1.2 Idempotency Store

```typescript
// payments/idempotency/idempotency.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('idempotency_keys')
@Index(['idempotencyKey'], { unique: true })
@Index(['createdAt'])
export class IdempotencyKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 50 })
  method: string;

  @Column({ type: 'jsonb' })
  requestData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  responseData: Record<string, any>;

  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'completed' | 'failed';

  @Column({ type: 'varchar', length: 255, nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;
}
```

### 1.3 Idempotency Middleware

```typescript
// payments/idempotency/idempotency.middleware.ts
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKey } from './idempotency-key';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private idempotencyService: IdempotencyService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only apply to POST/PUT/PATCH requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Only apply to payment endpoints
    if (!req.path.includes('/payments')) {
      return next();
    }

    const idempotencyKey = IdempotencyKey.extract(req.headers as Record<string, string>);
    
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // Check if request was already processed
    const existingResult = await this.idempotencyService.getResult(idempotencyKey);
    
    if (existingResult) {
      res.status(200).json(existingResult);
      return;
    }

    // Store idempotency key
    await this.idempotencyService.storeKey(idempotencyKey, req);

    // Intercept response
    const originalSend = res.send;
    res.send = function (data: any) {
      this.idempotencyService.storeResult(idempotencyKey, data);
      return originalSend.call(this, data);
    };

    next();
  }
}
```

### 1.4 Idempotency Service

```typescript
// payments/idempotency/idempotency.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKeyEntity } from './idempotency.entity';
import { Request } from 'express';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private idempotencyRepository: Repository<IdempotencyKeyEntity>,
  ) {}

  async storeKey(key: string, req: Request): Promise<void> {
    await this.idempotencyRepository.save({
      idempotencyKey: key,
      endpoint: req.path,
      method: req.method,
      requestData: req.body,
      status: 'pending',
    });
  }

  async storeResult(key: string, responseData: any): Promise<void> {
    await this.idempotencyRepository.update(
      { idempotencyKey: key },
      {
        responseData,
        status: 'completed',
        completedAt: new Date(),
      },
    );
  }

  async storeError(key: string, error: Error): Promise<void> {
    await this.idempotencyRepository.update(
      { idempotencyKey: key },
      {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    );
  }

  async getResult(key: string): Promise<any> {
    const record = await this.idempotencyRepository.findOne({
      where: { idempotencyKey: key },
    });

    if (!record) {
      return null;
    }

    if (record.status === 'pending') {
      throw new Error('Request is still being processed');
    }

    if (record.status === 'failed') {
      throw new Error(record.errorMessage);
    }

    return record.responseData;
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.idempotencyRepository.delete({
      createdAt: { $lt: cutoffDate },
    });

    return result.affected || 0;
  }
}
```

---

## 2. Order State Machine with Saga Pattern

### 2.1 Order State Definitions

```typescript
// orders/order-state.ts
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  INVENTORY_FAILED = 'INVENTORY_FAILED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_PROCESSING]: [OrderStatus.PAYMENT_COMPLETED, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PAYMENT_COMPLETED]: [OrderStatus.INVENTORY_RESERVED, OrderStatus.REFUNDED],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.CANCELLED],
  [OrderStatus.INVENTORY_RESERVED]: [OrderStatus.PROCESSING, OrderStatus.INVENTORY_FAILED],
  [OrderStatus.INVENTORY_FAILED]: [OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};
```

### 2.2 Order Saga Orchestrator

```typescript
// orders/saga/order.saga.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventBus } from '../../events/event.bus';
import { OrdersService } from '../orders.service';
import { PaymentsService } from '../../payments/payments.service';
import { InventoryService } from '../../inventory/inventory.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-state';

@Injectable()
export class OrderSaga {
  private readonly logger = new Logger(OrderSaga.name);

  constructor(
    private eventBus: EventBus,
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
  ) {}

  async executeOrderCreation(order: Order): Promise<void> {
    try {
      this.logger.log(`Starting order saga for order ${order.id}`);

      // Step 1: Confirm order
      await this.ordersService.updateStatus(order.id, OrderStatus.CONFIRMED);
      this.logger.log(`Order ${order.id} confirmed`);

      // Step 2: Process payment
      await this.processPayment(order);

      // Step 3: Reserve inventory
      await this.reserveInventory(order);

      // Step 4: Mark as processing
      await this.ordersService.updateStatus(order.id, OrderStatus.PROCESSING);
      this.logger.log(`Order ${order.id} is now processing`);

      // Publish success event
      await this.eventBus.publish({
        aggregateId: order.id,
        eventType: 'order.completed',
        timestamp: new Date(),
        data: { orderId: order.id },
      });
    } catch (error) {
      this.logger.error(`Order saga failed for order ${order.id}: ${error.message}`);
      await this.compensate(order, error);
    }
  }

  private async processPayment(order: Order): Promise<void> {
    try {
      await this.ordersService.updateStatus(order.id, OrderStatus.PAYMENT_PROCESSING);

      const payment = await this.paymentsService.processPayment(
        order.id,
        order.totalAmount,
        order.paymentMethod,
      );

      if (payment.status === 'COMPLETED') {
        await this.ordersService.updateStatus(order.id, OrderStatus.PAYMENT_COMPLETED);
        this.logger.log(`Payment completed for order ${order.id}`);
      } else {
        throw new Error(`Payment failed: ${payment.errorMessage}`);
      }
    } catch (error) {
      await this.ordersService.updateStatus(order.id, OrderStatus.PAYMENT_FAILED);
      throw error;
    }
  }

  private async reserveInventory(order: Order): Promise<void> {
    try {
      await this.ordersService.updateStatus(order.id, OrderStatus.INVENTORY_RESERVED);

      for (const item of order.items) {
        await this.inventoryService.reserve(item.productId, item.quantity, order.id);
      }

      this.logger.log(`Inventory reserved for order ${order.id}`);
    } catch (error) {
      await this.ordersService.updateStatus(order.id, OrderStatus.INVENTORY_FAILED);
      throw error;
    }
  }

  private async compensate(order: Order, error: Error): Promise<void> {
    this.logger.warn(`Compensating order ${order.id} due to: ${error.message}`);

    try {
      // Refund payment if completed
      if (order.paymentStatus === 'COMPLETED') {
        await this.paymentsService.refund(order.id);
        this.logger.log(`Refund initiated for order ${order.id}`);
      }

      // Release inventory reservations
      await this.inventoryService.releaseReservations(order.id);
      this.logger.log(`Inventory reservations released for order ${order.id}`);

      // Update order status
      await this.ordersService.updateStatus(order.id, OrderStatus.CANCELLED);

      // Send notification
      await this.notificationsService.sendOrderCancelled(order.id);
    } catch (compensationError) {
      this.logger.error(
        `Compensation failed for order ${order.id}: ${compensationError.message}`,
      );
      // Log for manual intervention
    }
  }
}
```

---

## 3. Inventory Management with Locking

### 3.1 Inventory Entity

```typescript
// inventory/inventory.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('inventory')
@Index(['productId'], { unique: true })
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'int', default: 0 })
  availableStock: number;

  @Column({ type: 'int', default: 0 })
  reservedStock: number;

  @Column({ type: 'int', default: 0 })
  damagedStock: number;

  @Column({ type: 'varchar', length: 50, default: 'unlocked' })
  lockStatus: 'locked' | 'unlocked';

  @Column({ type: 'uuid', nullable: true })
  lockedBy: string; // Order ID that locked it

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Product)
  product: Product;

  getTotalStock(): number {
    return this.availableStock + this.reservedStock + this.damagedStock;
  }

  getAvailableForSale(): number {
    return this.availableStock - this.reservedStock;
  }
}
```

### 3.2 Inventory Service with Pessimistic Locking

```typescript
// inventory/inventory.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Inventory } from './inventory.entity';
import { InventoryReservation } from './inventory-reservation.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryReservation)
    private reservationRepository: Repository<InventoryReservation>,
  ) {}

  async reserve(
    productId: string,
    quantity: number,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<InventoryReservation> {
    const repo = queryRunner?.manager.getRepository(Inventory) || this.inventoryRepository;

    // Use pessimistic locking to prevent race conditions
    const inventory = await repo.findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      throw new BadRequestException(`Product ${productId} not found in inventory`);
    }

    if (inventory.availableStock < quantity) {
      throw new ConflictException(
        `Insufficient stock. Available: ${inventory.availableStock}, Requested: ${quantity}`,
      );
    }

    // Create reservation
    const reservation = this.reservationRepository.create({
      productId,
      orderId,
      quantity,
      status: 'reserved',
    });

    // Update inventory
    inventory.availableStock -= quantity;
    inventory.reservedStock += quantity;

    await repo.save(inventory);
    return this.reservationRepository.save(reservation);
  }

  async release(
    productId: string,
    quantity: number,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repo = queryRunner?.manager.getRepository(Inventory) || this.inventoryRepository;

    const inventory = await repo.findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      throw new BadRequestException(`Product ${productId} not found in inventory`);
    }

    // Update inventory
    inventory.availableStock += quantity;
    inventory.reservedStock -= quantity;

    await repo.save(inventory);

    // Update reservation
    await this.reservationRepository.update(
      { orderId, productId, status: 'reserved' },
      { status: 'released' },
    );
  }

  async confirm(
    productId: string,
    quantity: number,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repo = queryRunner?.manager.getRepository(Inventory) || this.inventoryRepository;

    const inventory = await repo.findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      throw new BadRequestException(`Product ${productId} not found in inventory`);
    }

    // Update inventory
    inventory.reservedStock -= quantity;

    await repo.save(inventory);

    // Update reservation
    await this.reservationRepository.update(
      { orderId, productId, status: 'reserved' },
      { status: 'confirmed' },
    );
  }

  async releaseReservations(orderId: string): Promise<void> {
    const reservations = await this.reservationRepository.find({
      where: { orderId, status: 'reserved' },
    });

    for (const reservation of reservations) {
      await this.release(
        reservation.productId,
        reservation.quantity,
        orderId,
      );
    }
  }

  async getAvailableStock(productId: string): Promise<number> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
    });

    return inventory?.getAvailableForSale() || 0;
  }
}
```

---

## 4. Payment Provider Integrations

### 4.1 Payment Provider Interface

```typescript
// payments/providers/payment-provider.interface.ts
export interface PaymentProvider {
  processPayment(
    paymentId: string,
    amount: number,
    currency: string,
    metadata: Record<string, any>,
  ): Promise<PaymentResult>;

  refund(
    transactionId: string,
    amount: number,
  ): Promise<RefundResult>;

  verify(
    transactionId: string,
  ): Promise<VerificationResult>;
}

export interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  redirectUrl?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface VerificationResult {
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
}
```

### 4.2 Mada Provider Implementation

```typescript
// payments/providers/mada.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PaymentProvider, PaymentResult, RefundResult } from './payment-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class MadaProvider implements PaymentProvider {
  private readonly logger = new Logger(MadaProvider.name);
  private readonly apiUrl = process.env.MADA_API_URL || 'https://api.mada.com.sa/v1';
  private readonly merchantId = process.env.MADA_MERCHANT_ID;
  private readonly apiKey = process.env.MADA_API_KEY;

  async processPayment(
    paymentId: string,
    amount: number,
    currency: string,
    metadata: Record<string, any>,
  ): Promise<PaymentResult> {
    try {
      this.logger.log(`Processing Mada payment: ${paymentId}`);

      const signature = this.generateSignature(paymentId, amount, currency);

      const response = await axios.post(
        `${this.apiUrl}/payments`,
        {
          merchantId: this.merchantId,
          paymentId,
          amount: Math.round(amount * 100), // Convert to fils
          currency,
          description: metadata.description || 'Order Payment',
          orderId: metadata.orderId,
          customerEmail: metadata.customerEmail,
          customerPhone: metadata.customerPhone,
          callbackUrl: `${process.env.APP_URL}/payments/mada/callback`,
          signature,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        transactionId: response.data.transactionId,
        status: response.data.status === 'approved' ? 'success' : 'pending',
        redirectUrl: response.data.redirectUrl,
      };
    } catch (error) {
      this.logger.error(`Mada payment failed: ${error.message}`);
      return {
        transactionId: paymentId,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    try {
      this.logger.log(`Processing Mada refund: ${transactionId}`);

      const response = await axios.post(
        `${this.apiUrl}/refunds`,
        {
          merchantId: this.merchantId,
          transactionId,
          amount: Math.round(amount * 100),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        refundId: response.data.refundId,
        status: response.data.status === 'approved' ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Mada refund failed: ${error.message}`);
      return {
        refundId: transactionId,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  async verify(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return {
        transactionId,
        status: response.data.status === 'approved' ? 'completed' : 'pending',
        amount: response.data.amount / 100,
      };
    } catch (error) {
      this.logger.error(`Mada verification failed: ${error.message}`);
      throw error;
    }
  }

  private generateSignature(paymentId: string, amount: number, currency: string): string {
    const data = `${this.merchantId}${paymentId}${amount}${currency}${this.apiKey}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

### 4.3 STC Pay Provider Implementation

```typescript
// payments/providers/stc-pay.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PaymentProvider, PaymentResult, RefundResult } from './payment-provider.interface';

@Injectable()
export class StcPayProvider implements PaymentProvider {
  private readonly logger = new Logger(StcPayProvider.name);
  private readonly apiUrl = process.env.STC_PAY_API_URL || 'https://api.stcpay.com.sa/v1';
  private readonly clientId = process.env.STC_PAY_CLIENT_ID;
  private readonly clientSecret = process.env.STC_PAY_CLIENT_SECRET;

  async processPayment(
    paymentId: string,
    amount: number,
    currency: string,
    metadata: Record<string, any>,
  ): Promise<PaymentResult> {
    try {
      this.logger.log(`Processing STC Pay payment: ${paymentId}`);

      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiUrl}/payments/create`,
        {
          paymentId,
          amount: Math.round(amount * 100),
          currency,
          description: metadata.description || 'Order Payment',
          orderId: metadata.orderId,
          customerMsisdn: metadata.customerPhone,
          callbackUrl: `${process.env.APP_URL}/payments/stc-pay/callback`,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        transactionId: response.data.transactionId,
        status: response.data.status === 'INITIATED' ? 'pending' : 'success',
        redirectUrl: response.data.redirectUrl,
      };
    } catch (error) {
      this.logger.error(`STC Pay payment failed: ${error.message}`);
      return {
        transactionId: paymentId,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    try {
      this.logger.log(`Processing STC Pay refund: ${transactionId}`);

      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiUrl}/payments/refund`,
        {
          transactionId,
          amount: Math.round(amount * 100),
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        refundId: response.data.refundId,
        status: response.data.status === 'SUCCESS' ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`STC Pay refund failed: ${error.message}`);
      return {
        refundId: transactionId,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  async verify(transactionId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiUrl}/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      );

      return {
        transactionId,
        status: response.data.status === 'COMPLETED' ? 'completed' : 'pending',
        amount: response.data.amount / 100,
      };
    } catch (error) {
      this.logger.error(`STC Pay verification failed: ${error.message}`);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    const response = await axios.post(
      `${this.apiUrl}/auth/token`,
      {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      },
    );

    return response.data.accessToken;
  }
}
```

---

## 5. Transaction Reconciliation Service

### 5.1 Reconciliation Entity

```typescript
// reconciliation/reconciliation.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('reconciliation_records')
@Index(['paymentId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class ReconciliationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'matched' | 'mismatched' | 'resolved';

  @Column({ type: 'jsonb' })
  internalData: Record<string, any>;

  @Column({ type: 'jsonb' })
  externalData: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  discrepancy: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;
}
```

### 5.2 Reconciliation Service

```typescript
// reconciliation/reconciliation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ReconciliationRecord } from './reconciliation.entity';
import { PaymentsService } from '../payments/payments.service';
import { MadaProvider } from '../payments/providers/mada.provider';
import { StcPayProvider } from '../payments/providers/stc-pay.provider';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationRecord)
    private reconciliationRepository: Repository<ReconciliationRecord>,
    private paymentsService: PaymentsService,
    private madaProvider: MadaProvider,
    private stcPayProvider: StcPayProvider,
  ) {}

  async reconcilePayment(paymentId: string): Promise<void> {
    this.logger.log(`Starting reconciliation for payment ${paymentId}`);

    const payment = await this.paymentsService.getPayment(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // Get external data from provider
    const externalData = await this.getExternalPaymentData(payment);

    // Create reconciliation record
    const record = await this.reconciliationRepository.save({
      paymentId,
      orderId: payment.orderId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      internalData: {
        status: payment.status,
        amount: payment.amount,
        timestamp: payment.createdAt,
      },
      externalData,
      status: 'pending',
    });

    // Compare data
    if (this.matchPayments(payment, externalData)) {
      record.status = 'matched';
      this.logger.log(`Payment ${paymentId} reconciliation matched`);
    } else {
      record.status = 'mismatched';
      record.discrepancy = this.generateDiscrepancyReport(payment, externalData);
      this.logger.warn(`Payment ${paymentId} reconciliation mismatched: ${record.discrepancy}`);
    }

    await this.reconciliationRepository.save(record);
  }

  async reconcileBatch(paymentMethod: string, batchSize: number = 100): Promise<void> {
    this.logger.log(`Starting batch reconciliation for ${paymentMethod}`);

    const payments = await this.paymentsService.getPendingReconciliation(
      paymentMethod,
      batchSize,
    );

    for (const payment of payments) {
      try {
        await this.reconcilePayment(payment.id);
      } catch (error) {
        this.logger.error(`Reconciliation failed for payment ${payment.id}: ${error.message}`);
      }
    }
  }

  async resolveMismatches(): Promise<void> {
    this.logger.log('Resolving payment mismatches');

    const mismatches = await this.reconciliationRepository.find({
      where: { status: 'mismatched' },
    });

    for (const mismatch of mismatches) {
      try {
        // Attempt automatic resolution
        const resolved = await this.attemptAutoResolution(mismatch);

        if (resolved) {
          mismatch.status = 'resolved';
          mismatch.resolvedAt = new Date();
          await this.reconciliationRepository.save(mismatch);
          this.logger.log(`Mismatch ${mismatch.id} auto-resolved`);
        }
      } catch (error) {
        this.logger.error(`Failed to resolve mismatch ${mismatch.id}: ${error.message}`);
      }
    }
  }

  private async getExternalPaymentData(payment: any): Promise<Record<string, any>> {
    try {
      const provider = this.getProvider(payment.paymentMethod);
      return await provider.verify(payment.transactionId);
    } catch (error) {
      this.logger.error(`Failed to fetch external payment data: ${error.message}`);
      return {};
    }
  }

  private matchPayments(internal: any, external: any): boolean {
    return (
      internal.status === external.status &&
      internal.amount === external.amount &&
      internal.transactionId === external.transactionId
    );
  }

  private generateDiscrepancyReport(internal: any, external: any): string {
    const discrepancies = [];

    if (internal.status !== external.status) {
      discrepancies.push(`Status mismatch: ${internal.status} vs ${external.status}`);
    }

    if (internal.amount !== external.amount) {
      discrepancies.push(`Amount mismatch: ${internal.amount} vs ${external.amount}`);
    }

    return discrepancies.join('; ');
  }

  private async attemptAutoResolution(mismatch: ReconciliationRecord): Promise<boolean> {
    // Implement auto-resolution logic based on discrepancy type
    // For example: if amount is off by rounding, accept it
    // If status is pending externally but completed internally, wait for external update

    return false; // Default: requires manual review
  }

  private getProvider(paymentMethod: string): any {
    switch (paymentMethod.toLowerCase()) {
      case 'mada':
        return this.madaProvider;
      case 'stc_pay':
        return this.stcPayProvider;
      default:
        throw new Error(`Unknown payment method: ${paymentMethod}`);
    }
  }

  async cleanupOldRecords(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.reconciliationRepository.delete({
      createdAt: LessThan(cutoffDate),
      status: 'matched',
    });

    return result.affected || 0;
  }
}
```

---

## 6. Refund Handling System

### 6.1 Refund Entity

```typescript
// refunds/refund.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('refunds')
@Index(['orderId'])
@Index(['paymentId'])
@Index(['status'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  paymentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  reason: string;

  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;
}
```

### 6.2 Refund Service

```typescript
// refunds/refund.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from './refund.entity';
import { PaymentsService } from '../payments/payments.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private readonly MAX_REFUND_DAYS = 90;

  constructor(
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    private paymentsService: PaymentsService,
    private queueService: QueueService,
  ) {}

  async initiateRefund(
    orderId: string,
    amount: number,
    reason: string,
    notes?: string,
  ): Promise<Refund> {
    this.logger.log(`Initiating refund for order ${orderId}`);

    const payment = await this.paymentsService.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new BadRequestException(`No payment found for order ${orderId}`);
    }

    // Validate refund eligibility
    this.validateRefundEligibility(payment, amount);

    // Create refund record
    const refund = this.refundRepository.create({
      orderId,
      paymentId: payment.id,
      amount,
      reason,
      notes,
      status: 'pending',
    });

    const savedRefund = await this.refundRepository.save(refund);

    // Queue refund processing
    await this.queueService.addRefundProcessing(savedRefund.id);

    return savedRefund;
  }

  async processRefund(refundId: string): Promise<void> {
    const refund = await this.refundRepository.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new BadRequestException(`Refund ${refundId} not found`);
    }

    try {
      refund.status = 'processing';
      await this.refundRepository.save(refund);

      const payment = await this.paymentsService.getPayment(refund.paymentId);
      const result = await this.paymentsService.refund(
        payment.transactionId,
        refund.amount,
      );

      if (result.status === 'success') {
        refund.status = 'completed';
        refund.transactionId = result.refundId;
        refund.completedAt = new Date();
        this.logger.log(`Refund ${refundId} completed`);
      } else {
        throw new Error(result.errorMessage);
      }
    } catch (error) {
      refund.status = 'failed';
      refund.retryCount++;
      this.logger.error(`Refund ${refundId} failed: ${error.message}`);

      // Retry if under limit
      if (refund.retryCount < 3) {
        await this.queueService.addRefundProcessing(refundId, refund.retryCount);
      }
    }

    await this.refundRepository.save(refund);
  }

  private validateRefundEligibility(payment: any, amount: number): void {
    // Check if payment is completed
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed payments');
    }

    // Check refund amount
    if (amount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // Check refund window
    const daysSincePayment = Math.floor(
      (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSincePayment > this.MAX_REFUND_DAYS) {
      throw new BadRequestException(
        `Refunds only allowed within ${this.MAX_REFUND_DAYS} days of payment`,
      );
    }
  }
}
```

---

## 7. Fraud Detection

### 7.1 Fraud Detection Service

```typescript
// fraud/fraud-detection.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private cacheService: CacheService) {}

  async analyzeTransaction(transaction: any): Promise<FraudScore> {
    const score = new FraudScore();

    // Check 1: Velocity analysis
    score.add(await this.checkVelocity(transaction), 'velocity');

    // Check 2: Amount analysis
    score.add(this.checkAmount(transaction), 'amount');

    // Check 3: Geographic analysis
    score.add(await this.checkGeography(transaction), 'geography');

    // Check 4: Device fingerprint
    score.add(await this.checkDeviceFingerprint(transaction), 'device');

    // Check 5: Email/Phone verification
    score.add(await this.checkContactInfo(transaction), 'contact');

    this.logger.log(`Transaction ${transaction.id} fraud score: ${score.total}`);

    return score;
  }

  private async checkVelocity(transaction: any): Promise<number> {
    const key = `fraud:velocity:${transaction.userId}`;
    const recentTransactions = (await this.cacheService.get<number>(key)) || 0;

    if (recentTransactions > 5) {
      return 30; // High velocity
    }

    // Increment counter
    await this.cacheService.set(key, recentTransactions + 1, 3600); // 1 hour

    return 0;
  }

  private checkAmount(transaction: any): number {
    // Check if amount is unusually high
    if (transaction.amount > 10000) {
      return 20;
    }

    return 0;
  }

  private async checkGeography(transaction: any): Promise<number> {
    // Check if location is unusual for user
    const key = `fraud:location:${transaction.userId}`;
    const lastLocation = await this.cacheService.get<string>(key);

    if (lastLocation && lastLocation !== transaction.location) {
      return 15; // Location changed
    }

    await this.cacheService.set(key, transaction.location, 86400); // 24 hours

    return 0;
  }

  private async checkDeviceFingerprint(transaction: any): Promise<number> {
    // Check if device is new
    const key = `fraud:device:${transaction.userId}`;
    const knownDevices = (await this.cacheService.get<string[]>(key)) || [];

    if (!knownDevices.includes(transaction.deviceId)) {
      return 10; // New device
    }

    return 0;
  }

  private async checkContactInfo(transaction: any): Promise<number> {
    // Verify email and phone
    if (!transaction.emailVerified) {
      return 15;
    }

    if (!transaction.phoneVerified) {
      return 10;
    }

    return 0;
  }
}

class FraudScore {
  private scores: Map<string, number> = new Map();

  add(score: number, category: string): void {
    this.scores.set(category, score);
  }

  get total(): number {
    return Array.from(this.scores.values()).reduce((a, b) => a + b, 0);
  }

  get isSuspicious(): boolean {
    return this.total > 50;
  }

  get breakdown(): Record<string, number> {
    return Object.fromEntries(this.scores);
  }
}
```

---

## 8. Implementation Checklist

### Phase 4A: Idempotency (Week 1)
- [ ] Idempotency key generation
- [ ] Idempotency store setup
- [ ] Idempotency middleware
- [ ] Idempotency service

### Phase 4B: Order State Machine (Week 1)
- [ ] State definitions
- [ ] Order saga orchestrator
- [ ] Compensation logic
- [ ] Event publishing

### Phase 4C: Inventory Management (Week 2)
- [ ] Inventory entity
- [ ] Pessimistic locking
- [ ] Reservation system
- [ ] Release/confirm logic

### Phase 4D: Payment Providers (Week 2)
- [ ] Mada provider
- [ ] STC Pay provider
- [ ] Stripe provider
- [ ] Provider abstraction

### Phase 4E: Reconciliation (Week 3)
- [ ] Reconciliation entity
- [ ] Reconciliation service
- [ ] Batch reconciliation
- [ ] Mismatch resolution

### Phase 4F: Refunds & Fraud (Week 3)
- [ ] Refund entity
- [ ] Refund service
- [ ] Fraud detection
- [ ] Fraud scoring

### Phase 4G: Testing (Week 4)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load testing
- [ ] Failure scenarios

---

## 9. Performance Targets

| Metric | Target |
|--------|--------|
| Payment Processing Time | < 5 seconds |
| Refund Processing Time | < 2 hours |
| Inventory Lock Duration | < 100ms |
| Reconciliation Accuracy | 99.99% |
| Fraud Detection Accuracy | 95%+ |
| Transaction Failure Rate | < 0.1% |

---

**Document Version:** 4.0
**Status:** Ready for Implementation
**Next Phase:** PHASE 5 - DevOps & CI/CD
