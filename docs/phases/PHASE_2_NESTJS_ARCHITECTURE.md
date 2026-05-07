# PHASE 2: NestJS Backend Refactoring - Clean Architecture Implementation

## Executive Summary

This phase transforms the monolithic tRPC backend into a modular, scalable NestJS application following Clean Architecture principles. The result is a production-grade backend capable of handling 1M+ users with independent service scaling.

**Deliverables:**
1. Complete NestJS project structure
2. Clean Architecture implementation
3. Repository Pattern with TypeORM
4. Service layer with business logic
5. API controllers with validation
6. Database schema (PostgreSQL optimized)
7. Docker configuration
8. Comprehensive documentation

---

## 1. Project Structure

### 1.1 Directory Layout

```
ecommerce-backend/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   ├── config/                          # Configuration
│   │   ├── database.config.ts
│   │   ├── cache.config.ts
│   │   ├── queue.config.ts
│   │   └── env.validation.ts
│   ├── common/                          # Shared utilities
│   │   ├── decorators/
│   │   │   ├── auth.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── api-response.decorator.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── validation.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── rate-limit.guard.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── error.interceptor.ts
│   │   ├── middleware/
│   │   │   ├── request-logger.middleware.ts
│   │   │   └── correlation-id.middleware.ts
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-uuid.pipe.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       ├── crypto.ts
│   │       └── helpers.ts
│   ├── modules/                         # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── refresh-token.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts
│   │   │   └── tests/
│   │   │       ├── auth.service.spec.ts
│   │   │       └── auth.controller.spec.ts
│   │   ├── products/
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-product.dto.ts
│   │   │   │   ├── update-product.dto.ts
│   │   │   │   └── search-product.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── product.entity.ts
│   │   │   │   └── category.entity.ts
│   │   │   ├── repositories/
│   │   │   │   ├── product.repository.ts
│   │   │   │   └── category.repository.ts
│   │   │   └── tests/
│   │   ├── cart/
│   │   │   ├── cart.module.ts
│   │   │   ├── cart.controller.ts
│   │   │   ├── cart.service.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── tests/
│   │   ├── orders/
│   │   │   ├── orders.module.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── tests/
│   │   ├── payments/
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── mada.provider.ts
│   │   │   │   ├── stc-pay.provider.ts
│   │   │   │   └── stripe.provider.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── tests/
│   │   ├── sellers/
│   │   ├── loyalty/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   └── recommendations/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 1000-create-users.ts
│   │   │   ├── 1001-create-products.ts
│   │   │   └── ...
│   │   └── seeds/
│   │       ├── seed-users.ts
│   │       ├── seed-products.ts
│   │       └── seed-categories.ts
│   └── health/
│       ├── health.controller.ts
│       └── health.service.ts
├── test/
│   ├── jest-e2e.json
│   └── e2e/
│       ├── auth.e2e-spec.ts
│       ├── products.e2e-spec.ts
│       └── orders.e2e-spec.ts
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── docker-compose.yml
├── kubernetes/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   └── ingress.yaml
├── .env.example
├── .env.development
├── .env.production
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── package.json
├── package-lock.json
└── README.md
```

---

## 2. Clean Architecture Layers

### 2.1 Architecture Diagram

```
┌────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                     │
│  (Controllers, DTOs, HTTP Handlers)                │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              APPLICATION LAYER                     │
│  (Services, Use Cases, Business Logic)            │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              DOMAIN LAYER                          │
│  (Entities, Value Objects, Domain Rules)          │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              INFRASTRUCTURE LAYER                  │
│  (Repositories, Database, External Services)      │
└────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

#### Presentation Layer
- HTTP request/response handling
- Input validation (DTOs)
- Authentication/Authorization
- API documentation (Swagger)

#### Application Layer
- Business logic implementation
- Use case orchestration
- Transaction management
- Event publishing

#### Domain Layer
- Entity definitions
- Business rules
- Value objects
- Domain events

#### Infrastructure Layer
- Database access (TypeORM)
- External service integration
- Caching (Redis)
- Message queues (BullMQ)

---

## 3. Core Modules Implementation

### 3.1 Auth Module

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UserRepository],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
```

### 3.2 Products Module

```typescript
// products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductRepository, CategoryRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
```

### 3.3 Orders Module

```typescript
// orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderRepository } from './repositories/order.repository';
import { OrderProcessor } from './processors/order.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    BullModule.registerQueue({ name: 'orders' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, OrderProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
```

### 3.4 Payments Module

```typescript
// payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentRepository } from './repositories/payment.repository';
import { MadaProvider } from './providers/mada.provider';
import { StcPayProvider } from './providers/stc-pay.provider';
import { StripeProvider } from './providers/stripe.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentRepository,
    MadaProvider,
    StcPayProvider,
    StripeProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

---

## 4. Repository Pattern Implementation

### 4.1 Base Repository

```typescript
// common/repositories/base.repository.ts
import { Repository, FindOptionsWhere, FindOptionsRelations } from 'typeorm';

export abstract class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findById(id: string, relations?: FindOptionsRelations<T>): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations,
    });
  }

  async findAll(skip = 0, take = 10): Promise<[T[], number]> {
    return this.repository.findAndCount({
      skip,
      take,
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async findByConditions(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOne({ where });
  }
}
```

### 4.2 User Repository

```typescript
// auth/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByOpenId(openId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { openId },
    });
  }

  async findActiveUsers(skip = 0, take = 10): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      where: { isActive: true },
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }
}
```

---

## 5. Service Layer Implementation

### 5.1 Auth Service

```typescript
// auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.userRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role: 'user',
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### 5.2 Products Service

```typescript
// products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productRepository: ProductRepository) {}

  async create(createProductDto: CreateProductDto) {
    return this.productRepository.create(createProductDto);
  }

  async findAll(skip = 0, take = 20) {
    return this.productRepository.findAll(skip, take);
  }

  async findById(id: string) {
    const product = await this.productRepository.findById(id, {
      category: true,
      seller: true,
      reviews: true,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async search(searchDto: SearchProductDto) {
    return this.productRepository.search(searchDto);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findById(id);
    return this.productRepository.update(id, updateProductDto);
  }

  async delete(id: string) {
    const product = await this.findById(id);
    return this.productRepository.delete(id);
  }

  async getByCategory(categoryId: string, skip = 0, take = 20) {
    return this.productRepository.findByCategory(categoryId, skip, take);
  }

  async getBySeller(sellerId: string, skip = 0, take = 20) {
    return this.productRepository.findBySeller(sellerId, skip, take);
  }
}
```

---

## 6. Entity Definitions

### 6.1 User Entity

```typescript
// auth/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['openId'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  openId: string;

  @Column({ type: 'enum', enum: ['user', 'seller', 'admin'], default: 'user' })
  role: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  avatar: string;

  @Column({ type: 'int', default: 0 })
  loyaltyPoints: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
```

### 6.2 Product Entity

```typescript
// products/entities/product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('products')
@Index(['categoryId'])
@Index(['sellerId'])
@Index(['sku'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  reservedStock: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Category)
  category: Category;

  @ManyToOne(() => User)
  seller: User;
}
```

---

## 7. Database Schema (PostgreSQL)

### 7.1 Optimized Schema with Indexes

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  open_id VARCHAR(255) UNIQUE,
  role ENUM('user', 'seller', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  phone VARCHAR(20),
  avatar TEXT,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_open_id ON users(open_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  stock INT DEFAULT 0,
  reserved_stock INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  images TEXT[],
  category_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL,
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  shipping_address_id UUID NOT NULL,
  billing_address_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
  FOREIGN KEY (billing_address_id) REFERENCES addresses(id)
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SAR',
  payment_method VARCHAR(50) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  transaction_id VARCHAR(255),
  reference_number VARCHAR(255),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
```

---

## 8. DTO Validation Examples

### 8.1 Create Product DTO

```typescript
// products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(3, 255)
  name: string;

  @IsString()
  description: string;

  @IsString()
  @Length(3, 100)
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsUUID()
  categoryId: string;

  @IsUUID()
  sellerId: string;
}
```

---

## 9. Docker Configuration

### 9.1 Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 9.2 Docker Compose

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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://ecommerce:ecommerce123@postgres:5432/ecommerce
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## 10. Testing Strategy

### 10.1 Unit Test Example

```typescript
// auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: UserRepository;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const user = { id: '1', ...registerDto, role: 'user' };
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      const result = await service.register(registerDto);

      expect(result.user).toEqual(user);
      expect(result.token).toBe('token');
    });
  });
});
```

---

## 11. Implementation Checklist

### Phase 2A: Foundation (Week 1)
- [ ] NestJS project setup
- [ ] Database configuration
- [ ] Auth module implementation
- [ ] User entity and repository
- [ ] JWT strategy

### Phase 2B: Core Services (Week 2)
- [ ] Products module
- [ ] Cart module
- [ ] Orders module
- [ ] Payments module

### Phase 2C: Advanced Features (Week 3)
- [ ] Sellers module
- [ ] Loyalty module
- [ ] Notifications module
- [ ] Analytics module

### Phase 2D: Testing & Documentation (Week 4)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] API documentation (Swagger)
- [ ] Code documentation

---

## 12. Next Steps

1. **Initialize NestJS project**
2. **Set up PostgreSQL database**
3. **Implement Auth module**
4. **Create repository pattern base**
5. **Implement core services**
6. **Add comprehensive tests**
7. **Document APIs with Swagger**
8. **Prepare for Phase 3**

---

**Document Version:** 2.0
**Status:** Ready for Implementation
**Next Phase:** PHASE 3 - Scalability Layer
