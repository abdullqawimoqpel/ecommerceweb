# PHASE 5: DevOps & CI/CD - Docker, Kubernetes, GitHub Actions Pipelines

## Executive Summary

This phase implements production-grade DevOps infrastructure enabling automated testing, building, and deployment of the ecommerce platform. The system supports continuous integration, continuous deployment, and continuous monitoring across development, staging, and production environments.

**Key Components:**
- Docker containerization
- Kubernetes orchestration
- GitHub Actions CI/CD pipelines
- Automated testing & quality gates
- Infrastructure as Code (IaC)
- Monitoring & logging
- Disaster recovery

**Deliverables:**
1. Multi-stage Docker images
2. Kubernetes manifests (Deployments, Services, Ingress)
3. GitHub Actions workflows
4. Helm charts for templating
5. Infrastructure automation
6. Monitoring & alerting setup
7. Disaster recovery procedures

---

## 1. Docker Containerization

### 1.1 Multi-Stage Dockerfile for Backend

```dockerfile
# Dockerfile - Multi-stage build for NestJS backend
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

### 1.2 Dockerfile for Frontend (React)

```dockerfile
# Dockerfile - Multi-stage build for React frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 1.3 Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: ecommerce-postgres
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: ecommerce
      POSTGRES_PASSWORD: ${DB_PASSWORD:-ecommerce123}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ecommerce"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ecommerce-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: ecommerce-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ecommerce-network

  # RabbitMQ Message Queue
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: ecommerce-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-guest}
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
    networks:
      - ecommerce-network

  # Elasticsearch for Search
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    container_name: ecommerce-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - ecommerce-network

  # NestJS Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ecommerce-backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://ecommerce:${DB_PASSWORD:-ecommerce123}@postgres:5432/ecommerce
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-redis123}
      RABBITMQ_URL: amqp://guest:${RABBITMQ_PASSWORD:-guest}@rabbitmq:5672
      ELASTICSEARCH_HOST: elasticsearch:9200
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-change-in-production}
      AWS_REGION: ${AWS_REGION:-us-east-1}
      S3_BUCKET: ${S3_BUCKET:-ecommerce-bucket}
      CLOUDFRONT_URL: ${CLOUDFRONT_URL:-https://d123.cloudfront.net}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
      - /app/node_modules
    networks:
      - ecommerce-network
    restart: unless-stopped

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ecommerce-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - ecommerce-network
    restart: unless-stopped

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: ecommerce-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - ecommerce-network

  # Grafana Dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: ecommerce-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus
    networks:
      - ecommerce-network

  # ELK Stack - Logstash
  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    container_name: ecommerce-logstash
    volumes:
      - ./monitoring/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch
    networks:
      - ecommerce-network

  # ELK Stack - Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    container_name: ecommerce-kibana
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - ecommerce-network

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  elasticsearch_data:
  prometheus_data:
  grafana_data:

networks:
  ecommerce-network:
    driver: bridge
```

### 1.4 Nginx Configuration for Frontend

```nginx
# nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    include /etc/nginx/conf.d/*.conf;
}
```

### 1.5 Default Nginx Configuration

```nginx
# conf.d/default.conf
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## 2. Kubernetes Manifests

### 2.1 Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce
  labels:
    name: ecommerce

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ecommerce-config
  namespace: ecommerce
data:
  NODE_ENV: production
  REDIS_HOST: redis-service
  REDIS_PORT: "6379"
  RABBITMQ_HOST: rabbitmq-service
  RABBITMQ_PORT: "5672"
  ELASTICSEARCH_HOST: elasticsearch-service
  ELASTICSEARCH_PORT: "9200"
  LOG_LEVEL: info
```

### 2.2 Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ecommerce-secrets
  namespace: ecommerce
type: Opaque
stringData:
  DATABASE_URL: postgresql://ecommerce:password@postgres-service:5432/ecommerce
  REDIS_PASSWORD: redis-password
  JWT_SECRET: your-jwt-secret-key
  AWS_ACCESS_KEY_ID: your-aws-access-key
  AWS_SECRET_ACCESS_KEY: your-aws-secret-key
  MADA_API_KEY: your-mada-api-key
  STC_PAY_CLIENT_ID: your-stc-pay-client-id
  STC_PAY_CLIENT_SECRET: your-stc-pay-client-secret
```

### 2.3 Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: ecommerce
  labels:
    app: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: backend
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001

      containers:
      - name: backend
        image: your-registry/ecommerce-backend:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: ecommerce-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ecommerce-secrets
              key: DATABASE_URL
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: ecommerce-config
              key: REDIS_HOST
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ecommerce-secrets
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: ecommerce-secrets
              key: JWT_SECRET

        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi

        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true

        volumeMounts:
        - name: tmp
          mountPath: /tmp

      volumes:
      - name: tmp
        emptyDir: {}

      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname

---
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: ecommerce
  labels:
    app: backend
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: backend
```

### 2.4 Frontend Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ecommerce
  labels:
    app: frontend
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/ecommerce-frontend:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 80
          protocol: TCP

        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi

        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true

        volumeMounts:
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run

      volumes:
      - name: cache
        emptyDir: {}
      - name: run
        emptyDir: {}

---
# k8s/frontend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: ecommerce
  labels:
    app: frontend
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: frontend
```

### 2.5 Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  namespace: ecommerce
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.ecommerce.com
    - ecommerce.com
    secretName: ecommerce-tls
  rules:
  - host: api.ecommerce.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3000
  - host: ecommerce.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### 2.6 Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max

---
# k8s/frontend-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

---

## 3. GitHub Actions CI/CD Pipelines

### 3.1 Main CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Code Quality & Testing
  quality:
    runs-on: ubuntu-latest
    name: Code Quality & Tests
    
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint code
      run: npm run lint

    - name: Check types
      run: npm run type-check

    - name: Run tests
      run: npm run test:cov

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: SonarCloud Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  # Security Scanning
  security:
    runs-on: ubuntu-latest
    name: Security Scanning
    
    steps:
    - uses: actions/checkout@v3

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

    - name: Dependency check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'ecommerce-platform'
        path: '.'
        format: 'JSON'

  # Build Docker Images
  build:
    needs: [quality, security]
    runs-on: ubuntu-latest
    name: Build Docker Images
    permissions:
      contents: read
      packages: write

    strategy:
      matrix:
        service: [backend, frontend]

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./${{ matrix.service }}
        push: ${{ github.event_name != 'pull_request' }}
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-${{ matrix.service }}:buildcache
        cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-${{ matrix.service }}:buildcache,mode=max
```

### 3.2 Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Pipeline

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    name: Deploy to Staging
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3

    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > $HOME/.kube/config
        chmod 600 $HOME/.kube/config

    - name: Deploy to Staging
      run: |
        kubectl set image deployment/backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }} -n ecommerce
        kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }} -n ecommerce
        kubectl rollout status deployment/backend -n ecommerce --timeout=5m
        kubectl rollout status deployment/frontend -n ecommerce --timeout=5m

    - name: Run smoke tests
      run: |
        npm run test:e2e:staging

    - name: Notify Slack
      if: always()
      uses: slackapi/slack-github-action@v1
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_STAGING }}
        payload: |
          {
            "text": "Staging deployment: ${{ job.status }}",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Staging Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}"
                }
              }
            ]
          }

  # Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    name: Deploy to Production
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [deploy-staging]
    
    steps:
    - uses: actions/checkout@v3

    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > $HOME/.kube/config
        chmod 600 $HOME/.kube/config

    - name: Create backup
      run: |
        kubectl get all -n ecommerce -o yaml > backup-${{ github.sha }}.yaml
        aws s3 cp backup-${{ github.sha }}.yaml s3://ecommerce-backups/

    - name: Deploy to Production
      run: |
        kubectl set image deployment/backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.ref_name }} -n ecommerce
        kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.ref_name }} -n ecommerce
        kubectl rollout status deployment/backend -n ecommerce --timeout=5m
        kubectl rollout status deployment/frontend -n ecommerce --timeout=5m

    - name: Run smoke tests
      run: |
        npm run test:e2e:production

    - name: Notify Slack
      if: always()
      uses: slackapi/slack-github-action@v1
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_PRODUCTION }}
        payload: |
          {
            "text": "Production deployment: ${{ job.status }}",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Production Deployment*\nVersion: ${{ github.ref_name }}\nStatus: ${{ job.status }}"
                }
              }
            ]
          }

    - name: Rollback on failure
      if: failure()
      run: |
        kubectl rollout undo deployment/backend -n ecommerce
        kubectl rollout undo deployment/frontend -n ecommerce
```

### 3.3 Database Migration Pipeline

```yaml
# .github/workflows/db-migration.yml
name: Database Migration

on:
  push:
    paths:
      - 'backend/src/database/migrations/**'
      - '.github/workflows/db-migration.yml'
    branches: [ main, develop ]

jobs:
  migrate:
    runs-on: ubuntu-latest
    name: Run Database Migrations
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: ecommerce_test
          POSTGRES_USER: ecommerce
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run migrations
      env:
        DATABASE_URL: postgresql://ecommerce:password@localhost:5432/ecommerce_test
      run: npm run db:migrate

    - name: Verify schema
      env:
        DATABASE_URL: postgresql://ecommerce:password@localhost:5432/ecommerce_test
      run: npm run db:verify

    - name: Generate migration report
      run: npm run db:report

    - name: Upload migration report
      uses: actions/upload-artifact@v3
      with:
        name: migration-report
        path: migration-report.md
```

---

## 4. Helm Charts

### 4.1 Helm Chart Values

```yaml
# helm/values.yaml
replicaCount: 3

image:
  registry: ghcr.io
  repository: ecommerce/backend
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.ecommerce.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: ecommerce-tls
      hosts:
        - api.ecommerce.com

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}

postgresql:
  enabled: true
  auth:
    username: ecommerce
    password: changeme
    database: ecommerce

redis:
  enabled: true
  auth:
    enabled: true
    password: changeme
```

---

## 5. Monitoring & Observability

### 5.1 Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'ecommerce-prod'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

### 5.2 Alert Rules

```yaml
# monitoring/alert-rules.yml
groups:
  - name: ecommerce
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighLatency
        expr: histogram_quantile(0.99, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "High latency detected"
          description: "P99 latency is {{ $value }} seconds"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count > 90
        for: 5m
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value }} connections in use"

      - alert: CacheHitRateLow
        expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.7
        for: 10m
        annotations:
          summary: "Cache hit rate is low"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

---

## 6. Implementation Checklist

### Phase 5A: Docker (Week 1)
- [ ] Backend Dockerfile
- [ ] Frontend Dockerfile
- [ ] Docker Compose setup
- [ ] Nginx configuration
- [ ] Image optimization

### Phase 5B: Kubernetes (Week 2)
- [ ] Namespace & ConfigMaps
- [ ] Secrets management
- [ ] Backend deployment
- [ ] Frontend deployment
- [ ] Services & Ingress
- [ ] HPA configuration

### Phase 5C: CI/CD Pipelines (Week 2)
- [ ] GitHub Actions setup
- [ ] CI pipeline
- [ ] Deploy pipeline
- [ ] Database migration pipeline
- [ ] Notifications

### Phase 5D: Helm Charts (Week 3)
- [ ] Helm chart structure
- [ ] Values configuration
- [ ] Templates
- [ ] Chart testing

### Phase 5E: Monitoring (Week 3)
- [ ] Prometheus setup
- [ ] Grafana dashboards
- [ ] Alert rules
- [ ] Log aggregation

### Phase 5F: Testing & Optimization (Week 4)
- [ ] Load testing
- [ ] Failure scenario testing
- [ ] Performance optimization
- [ ] Security hardening

---

## 7. Deployment Checklist

- [ ] Docker images built and pushed
- [ ] Kubernetes cluster ready
- [ ] Secrets configured
- [ ] Database migrations tested
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented
- [ ] Team trained on deployment process

---

**Document Version:** 5.0
**Status:** Ready for Implementation
**Next Phase:** PHASE 6 - AWS Production Architecture
