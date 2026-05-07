# PHASE 8: GitHub Integration & Professional Version Control

## Executive Summary

This phase establishes a professional GitHub workflow following GitFlow conventions, implementing automated CI/CD pipelines, comprehensive documentation, and enterprise-grade version control practices for the complete ecommerce platform.

**Key Deliverables:**
1. GitHub repository structure with proper branching strategy
2. GitFlow workflow implementation
3. GitHub Actions CI/CD pipelines
4. Pull Request and Issue templates
5. Comprehensive documentation
6. Environment configuration files
7. Automated testing and linting
8. Code quality gates

---

## 1. Repository Structure

### 1.1 Directory Organization

```
ecommerce-platform/
├── frontend/                          # React + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── lib/
│   │   ├── styles/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── README.md
│
├── backend/                           # NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── recommendations/
│   │   │   ├── analytics/
│   │   │   └── admin/
│   │   ├── common/
│   │   ├── database/
│   │   ├── config/
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   └── README.md
│
├── infrastructure/                    # Terraform & DevOps
│   ├── terraform/
│   │   ├── vpc.tf
│   │   ├── eks.tf
│   │   ├── rds.tf
│   │   ├── elasticache.tf
│   │   ├── s3-cloudfront.tf
│   │   ├── alb.tf
│   │   ├── waf.tf
│   │   ├── iam-policies.tf
│   │   ├── cloudwatch.tf
│   │   ├── backup.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   ├── kubernetes/
│   │   ├── namespaces.yaml
│   │   ├── configmaps.yaml
│   │   ├── secrets.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── services.yaml
│   │   ├── ingress.yaml
│   │   ├── hpa.yaml
│   │   └── pdb.yaml
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── README.md
│
├── docs/                              # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── SETUP.md
│   ├── CONTRIBUTING.md
│   ├── GITFLOW.md
│   ├── TROUBLESHOOTING.md
│   └── PHASE_*.md
│
├── scripts/                           # Utility Scripts
│   ├── setup.sh
│   ├── deploy.sh
│   ├── migrate.sh
│   ├── backup.sh
│   ├── test.sh
│   ├── lint.sh
│   └── build.sh
│
├── .github/
│   ├── workflows/
│   │   ├── ci-backend.yml
│   │   ├── ci-frontend.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   ├── security-scan.yml
│   │   └── performance-test.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── documentation.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
│
├── .gitignore
├── .gitattributes
├── .editorconfig
├── .eslintrc.json
├── .prettierrc.json
├── docker-compose.yml
├── README.md
├── LICENSE
└── CHANGELOG.md
```

---

## 2. GitFlow Branching Strategy

### 2.1 Branch Types

```
main (production)
  ↑
  ├─ release/1.0.0 (release candidate)
  │   ↓
develop (staging)
  ├─ feature/auth-jwt (feature branch)
  ├─ feature/payments-stp (feature branch)
  ├─ bugfix/cart-sync (bugfix branch)
  ├─ hotfix/security-patch (hotfix branch)
  └─ chore/update-deps (chore branch)
```

### 2.2 Branch Naming Conventions

```
Feature branches:
  feature/auth-jwt-refresh
  feature/payments-stp-integration
  feature/elasticsearch-search
  feature/ml-recommendations

Bugfix branches:
  bugfix/cart-quantity-sync
  bugfix/payment-webhook-timeout
  bugfix/search-arabic-support

Hotfix branches:
  hotfix/security-vulnerability
  hotfix/database-connection-pool

Release branches:
  release/1.0.0
  release/1.1.0

Chore branches:
  chore/update-dependencies
  chore/upgrade-node-version
  chore/refactor-auth-module
```

### 2.3 GitFlow Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GITFLOW WORKFLOW                          │
│                                                               │
│  MAIN (Production)                                           │
│  ├─ v1.0.0 ────────────────────────────────────────────┐    │
│  │                                                       │    │
│  └─ v1.0.1 (hotfix) ◄─────────────────────────────┐    │    │
│                                                   │    │    │
│  DEVELOP (Staging)                                │    │    │
│  ├─ feature/auth ────────────────────────┐        │    │    │
│  │                                        ├─ PR ──┤    │    │
│  ├─ feature/payments ────────────────────┤        │    │    │
│  │                                        └─ Merge│    │    │
│  ├─ feature/search ──────────────────────┐        │    │    │
│  │                                        ├─ PR ──┤    │    │
│  ├─ bugfix/cart ─────────────────────────┤        │    │    │
│  │                                        └─ Merge│    │    │
│  └─ release/1.0.0 ──────────────────────────────┐ │    │    │
│     │                                            │ │    │    │
│     └─ Merge to main ──────────────────────────┘ │    │    │
│     └─ Merge back to develop ──────────────────┘ │    │    │
│                                                   │    │    │
│  HOTFIX (from main) ◄──────────────────────────┘    │    │
│  ├─ Merge to main ─────────────────────────────────┘    │    │
│  └─ Merge back to develop ────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Commit Message Standards

### 3.1 Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 3.2 Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add JWT refresh token` |
| `fix` | Bug fix | `fix(cart): resolve quantity sync` |
| `refactor` | Code refactoring | `refactor(products): optimize service` |
| `perf` | Performance improvement | `perf(search): add elasticsearch caching` |
| `test` | Add/update tests | `test(payments): add webhook tests` |
| `docs` | Documentation changes | `docs: update API documentation` |
| `chore` | Build/tool changes | `chore(deps): upgrade nestjs to v10` |
| `ci` | CI/CD changes | `ci: add github actions workflow` |
| `style` | Code style (no logic) | `style: format code with prettier` |

### 3.3 Commit Examples

```bash
# Feature commit
feat(auth): implement JWT refresh token system
- Add refresh token generation
- Add token rotation logic
- Add refresh endpoint

# Fix commit
fix(cart): resolve quantity sync issue between sessions
- Store cart state in Redis
- Add cache invalidation
- Add unit tests

# Refactor commit
refactor(products): optimize product service queries
- Add database indexes
- Implement query caching
- Reduce N+1 queries

# Performance commit
perf(search): implement elasticsearch indexing
- Add product indexing pipeline
- Add search result caching
- Reduce search latency from 500ms to 150ms

# Test commit
test(payments): add webhook integration tests
- Add Mada webhook tests
- Add STC Pay webhook tests
- Add error handling tests

# Documentation commit
docs: add API endpoint documentation
- Document all REST endpoints
- Add request/response examples
- Add error codes reference

# Chore commit
chore(deps): upgrade dependencies to latest versions
- Upgrade NestJS to v10
- Upgrade TypeScript to v5.2
- Update all npm packages

# CI/CD commit
ci: add github actions workflows
- Add backend CI pipeline
- Add frontend CI pipeline
- Add security scanning
```

---

## 4. GitHub Actions CI/CD Pipelines

### 4.1 Backend CI Pipeline

```yaml
# .github/workflows/ci-backend.yml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
      - '.github/workflows/ci-backend.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'backend/package-lock.json'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run ESLint
        run: cd backend && npm run lint
      
      - name: Run Prettier check
        run: cd backend && npm run format:check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ecommerce_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'backend/package-lock.json'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run tests
        run: cd backend && npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ecommerce_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: backend

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'backend/package-lock.json'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Build application
        run: cd backend && npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: backend-build
          path: backend/dist/
          retention-days: 1

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 4.2 Frontend CI Pipeline

```yaml
# .github/workflows/ci-frontend.yml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
      - '.github/workflows/ci-frontend.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run ESLint
        run: cd frontend && npm run lint
      
      - name: Run Prettier check
        run: cd frontend && npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run tests
        run: cd frontend && npm run test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Build application
        run: cd frontend && npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist/
          retention-days: 1

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run accessibility tests
        run: cd frontend && npm run test:a11y
```

### 4.3 Staging Deployment Pipeline

```yaml
# .github/workflows/cd-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ecommerce-backend
          IMAGE_TAG: staging-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG backend/
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Build and push frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ecommerce-frontend
          IMAGE_TAG: staging-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG frontend/
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Update EKS deployment
        run: |
          aws eks update-kubeconfig --name ecommerce-eks-cluster --region us-east-1
          kubectl set image deployment/backend backend=${{ steps.login-ecr.outputs.registry }}/ecommerce-backend:staging-${{ github.sha }} -n ecommerce
          kubectl set image deployment/frontend frontend=${{ steps.login-ecr.outputs.registry }}/ecommerce-frontend:staging-${{ github.sha }} -n ecommerce
          kubectl rollout status deployment/backend -n ecommerce
          kubectl rollout status deployment/frontend -n ecommerce
      
      - name: Run smoke tests
        run: |
          npm install -g newman
          newman run ./tests/postman/smoke-tests.json \
            --environment ./tests/postman/staging.json \
            --reporters cli,json
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Staging deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Staging deployment *${{ job.status }}*\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
```

### 4.4 Production Deployment Pipeline

```yaml
# .github/workflows/cd-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ecommerce-backend
          IMAGE_TAG: prod-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG backend/
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Build and push frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ecommerce-frontend
          IMAGE_TAG: prod-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG frontend/
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Create deployment
        id: deployment
        uses: actions/github-script@v6
        with:
          script: |
            const deployment = await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.ref,
              environment: 'production',
              required_contexts: [],
              auto_merge: false
            });
            return deployment.data.id;
      
      - name: Update EKS deployment
        run: |
          aws eks update-kubeconfig --name ecommerce-eks-cluster --region us-east-1
          kubectl set image deployment/backend backend=${{ steps.login-ecr.outputs.registry }}/ecommerce-backend:prod-${{ github.sha }} -n ecommerce
          kubectl set image deployment/frontend frontend=${{ steps.login-ecr.outputs.registry }}/ecommerce-frontend:prod-${{ github.sha }} -n ecommerce
          kubectl rollout status deployment/backend -n ecommerce
          kubectl rollout status deployment/frontend -n ecommerce
      
      - name: Run health checks
        run: |
          curl -f https://api.ecommerce.com/health || exit 1
          curl -f https://ecommerce.com/health || exit 1
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Changes in this Release:
            - Backend: prod-${{ github.sha }}
            - Frontend: prod-${{ github.sha }}
          draft: false
          prerelease: false
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Production deployment *${{ job.status }}*\nVersion: ${{ github.ref }}\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
```

---

## 5. Pull Request Template

```markdown
# .github/PULL_REQUEST_TEMPLATE.md

## Description
<!-- Provide a brief description of the changes -->

## Type of Change
<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Related Issue
<!-- Link to related issue: Closes #123 -->
Closes #

## Changes Made
<!-- List the specific changes made -->

- Change 1
- Change 2
- Change 3

## Testing
<!-- Describe the testing you've done -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] No new tests needed

## Testing Instructions
<!-- Provide step-by-step instructions to test the changes -->

1. Step 1
2. Step 2
3. Step 3

## Screenshots/Videos
<!-- If applicable, add screenshots or videos demonstrating the changes -->

## Checklist
<!-- Ensure all items are completed before submitting -->

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests passed locally with my changes
- [ ] Any dependent changes have been merged and published

## Performance Impact
<!-- Describe any performance implications -->

- No performance impact
- Improves performance by X%
- May have minor performance impact

## Database Changes
<!-- If applicable, describe database schema changes -->

- No database changes
- Migration required: [describe]

## Environment Variables
<!-- If applicable, list new environment variables -->

- `NEW_VAR`: Description

## Deployment Notes
<!-- Any special deployment instructions -->

---

## Reviewer Notes
<!-- Any additional information for reviewers -->
```

---

## 6. Issue Templates

### 6.1 Bug Report Template

```markdown
# .github/ISSUE_TEMPLATE/bug_report.md

---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''

---

## Description
<!-- Provide a clear and concise description of the bug -->

## Steps to Reproduce
<!-- Steps to reproduce the behavior -->

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
<!-- Describe what you expected to happen -->

## Actual Behavior
<!-- Describe what actually happened -->

## Screenshots
<!-- If applicable, add screenshots or videos -->

## Environment
- OS: [e.g. iOS]
- Browser: [e.g. Chrome]
- Version: [e.g. 1.0.0]

## Additional Context
<!-- Add any other context about the problem -->

## Severity
- [ ] Critical (system down)
- [ ] High (major feature broken)
- [ ] Medium (feature partially broken)
- [ ] Low (minor issue)
```

### 6.2 Feature Request Template

```markdown
# .github/ISSUE_TEMPLATE/feature_request.md

---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''

---

## Description
<!-- Provide a clear and concise description of the feature -->

## Problem Statement
<!-- Describe the problem this feature solves -->

## Proposed Solution
<!-- Describe the solution you'd like -->

## Alternative Solutions
<!-- Describe any alternative solutions you've considered -->

## Use Cases
<!-- Describe specific use cases for this feature -->

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Additional Context
<!-- Add any other context or screenshots -->
```

---

## 7. Environment Configuration Files

### 7.1 Backend .env.example

```bash
# .env.example (Backend)

# Application
NODE_ENV=development
APP_NAME=ecommerce-api
APP_PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
DATABASE_SSL=false
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=7d

# OAuth
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=your-app-id

# Payment Providers
MADA_API_KEY=your-mada-key
MADA_SECRET=your-mada-secret
STC_PAY_API_KEY=your-stc-key
STC_PAY_SECRET=your-stc-secret
STRIPE_API_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=ecommerce-assets
AWS_CLOUDFRONT_DOMAIN=d123.cloudfront.net

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@ecommerce.com

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Features
ENABLE_ANALYTICS=true
ENABLE_RECOMMENDATIONS=true
ENABLE_NOTIFICATIONS=true
```

### 7.2 Frontend .env.example

```bash
# .env.example (Frontend)

# API
VITE_API_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000

# OAuth
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=your-app-id

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.ecommerce.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# Features
VITE_ENABLE_RECOMMENDATIONS=true
VITE_ENABLE_CHAT=true
VITE_ENABLE_NOTIFICATIONS=true

# Environment
VITE_ENVIRONMENT=development
VITE_DEBUG=true
```

---

## 8. Utility Scripts

### 8.1 Setup Script

```bash
#!/bin/bash
# scripts/setup.sh

set -e

echo "🚀 Setting up ecommerce platform..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..

# Setup environment files
echo "⚙️ Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
fi

# Run migrations
echo "🗄️ Running database migrations..."
cd backend && npm run db:migrate && cd ..

# Build applications
echo "🏗️ Building applications..."
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env files with your configuration"
echo "2. Run: npm run dev (from root)"
echo "3. Open http://localhost:3000"
```

### 8.2 Deploy Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
REGION=${2:-us-east-1}

echo "🚀 Deploying to $ENVIRONMENT..."

# Configure AWS
aws configure set region $REGION

# Build Docker images
echo "🐳 Building Docker images..."
docker build -t ecommerce-backend:$ENVIRONMENT backend/
docker build -t ecommerce-frontend:$ENVIRONMENT frontend/

# Push to ECR
echo "📤 Pushing to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker tag ecommerce-backend:$ENVIRONMENT $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ecommerce-backend:$ENVIRONMENT
docker tag ecommerce-frontend:$ENVIRONMENT $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ecommerce-frontend:$ENVIRONMENT
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ecommerce-backend:$ENVIRONMENT
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ecommerce-frontend:$ENVIRONMENT

# Update EKS
echo "☸️ Updating EKS deployment..."
aws eks update-kubeconfig --name ecommerce-eks-cluster --region $REGION
kubectl set image deployment/backend backend=$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ecommerce-backend:$ENVIRONMENT -n ecommerce
kubectl set image deployment/frontend frontend=$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ecommerce-frontend:$ENVIRONMENT -n ecommerce
kubectl rollout status deployment/backend -n ecommerce
kubectl rollout status deployment/frontend -n ecommerce

echo "✅ Deployment complete!"
```

---

## 9. Code Quality Configuration

### 9.1 ESLint Configuration

```json
// .eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "env": {
    "browser": true,
    "node": true,
    "es2022": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "import"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-types": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "alphabeticalOrder": true
      }
    ]
  }
}
```

### 9.2 Prettier Configuration

```json
// .prettierrc.json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 9.3 EditorConfig

```
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx,json}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

---

## 10. Documentation Files

### 10.1 Main README.md

```markdown
# Ecommerce Platform

Professional-grade Saudi ecommerce platform serving 1M+ concurrent users with 99.99% uptime SLA.

## 🌟 Features

- Full-text search with Arabic support
- AI-powered personalized recommendations
- Multi-vendor seller support
- Advanced payment processing (Mada, STC Pay, Stripe)
- Real-time analytics dashboards
- A/B testing framework
- Loyalty points system
- Order tracking and management
- Admin panel with analytics
- Disaster recovery and backup

## 🏗️ Architecture

- **Frontend:** React 19 + Tailwind CSS
- **Backend:** NestJS with Clean Architecture
- **Database:** PostgreSQL + RDS
- **Cache:** Redis + ElastiCache
- **Search:** Elasticsearch
- **Container:** Docker + Kubernetes
- **Cloud:** AWS (EKS, RDS, S3, CloudFront)
- **CI/CD:** GitHub Actions

## 📊 Performance

- Search Latency: 150ms (p99)
- API Throughput: 50K req/s
- Cache Hit Rate: 85%
- Uptime: 99.99%

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone repository
git clone https://github.com/abdullqawimoqpel/ecommerceweb.git
cd ecommerceweb

# Run setup script
./scripts/setup.sh

# Start development environment
npm run dev
```

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Setup Instructions](./docs/SETUP.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)
- [GitFlow Workflow](./docs/GITFLOW.md)

## 🔧 Development

### Running Tests

```bash
# Backend tests
cd backend && npm run test

# Frontend tests
cd frontend && npm run test
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 🌍 Deployment

### Staging

```bash
./scripts/deploy.sh staging us-east-1
```

### Production

```bash
./scripts/deploy.sh production us-east-1
```

## 📈 Monitoring

- [Grafana Dashboards](https://grafana.ecommerce.com)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch)
- [Elasticsearch Kibana](https://kibana.ecommerce.com)

## 🤝 Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file

## 👥 Team

- **Lead Architect:** Manus AI
- **Backend Lead:** NestJS Team
- **Frontend Lead:** React Team
- **DevOps Lead:** AWS Team

## 📞 Support

- Documentation: [docs/](./docs/)
- Issues: [GitHub Issues](https://github.com/abdullqawimoqpel/ecommerceweb/issues)
- Email: support@ecommerce.com
```

---

## 11. Implementation Checklist

### Phase 8A: Repository Setup (Week 1)
- [ ] Initialize GitHub repository
- [ ] Setup branch protection rules
- [ ] Configure repository settings
- [ ] Add collaborators and teams

### Phase 8B: GitFlow Implementation (Week 1)
- [ ] Create main branch
- [ ] Create develop branch
- [ ] Setup branch naming conventions
- [ ] Configure merge strategies

### Phase 8C: CI/CD Pipelines (Week 1-2)
- [ ] Create backend CI workflow
- [ ] Create frontend CI workflow
- [ ] Create staging CD workflow
- [ ] Create production CD workflow
- [ ] Setup security scanning

### Phase 8D: Templates & Documentation (Week 2)
- [ ] Create PR template
- [ ] Create issue templates
- [ ] Write API documentation
- [ ] Write setup guide
- [ ] Write deployment guide

### Phase 8E: Code Quality (Week 2)
- [ ] Setup ESLint
- [ ] Setup Prettier
- [ ] Configure EditorConfig
- [ ] Add pre-commit hooks

### Phase 8F: Automation & Monitoring (Week 2-3)
- [ ] Setup Dependabot
- [ ] Configure branch protection
- [ ] Setup code coverage tracking
- [ ] Setup performance monitoring

---

## 12. GitFlow Commands Reference

```bash
# Initialize GitFlow
git flow init -d

# Start feature branch
git flow feature start auth-jwt
# Equivalent to: git checkout -b feature/auth-jwt develop

# Finish feature branch
git flow feature finish auth-jwt
# Equivalent to: git checkout develop && git merge --no-ff feature/auth-jwt

# Start release
git flow release start 1.0.0
# Equivalent to: git checkout -b release/1.0.0 develop

# Finish release
git flow release finish 1.0.0
# Equivalent to: git checkout main && git merge --no-ff release/1.0.0

# Start hotfix
git flow hotfix start security-patch
# Equivalent to: git checkout -b hotfix/security-patch main

# Finish hotfix
git flow hotfix finish security-patch
# Equivalent to: git checkout main && git merge --no-ff hotfix/security-patch
```

---

**Document Version:** 8.0
**Status:** Ready for Implementation
**GitHub Repository:** https://github.com/abdullqawimoqpel/ecommerceweb
