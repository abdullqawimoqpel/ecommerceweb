# PHASE 6: AWS Production Architecture - EKS, RDS, S3, CloudFront, Security

## Executive Summary

This phase designs and implements a production-grade AWS infrastructure capable of serving 1M+ concurrent users with 99.99% uptime SLA, automatic scaling, disaster recovery, and enterprise-grade security. The architecture follows AWS best practices for high availability, fault tolerance, and cost optimization.

**Key AWS Services:**
- **EKS** (Elastic Kubernetes Service) - Container orchestration
- **RDS** (Relational Database Service) - PostgreSQL with Multi-AZ
- **ElastiCache** - Redis for caching
- **S3** - Object storage with versioning
- **CloudFront** - Global CDN
- **ALB** (Application Load Balancer) - Layer 7 load balancing
- **VPC** - Network isolation and security
- **IAM** - Identity and access management
- **CloudWatch** - Monitoring and logging
- **WAF** - Web Application Firewall
- **KMS** - Key management and encryption
- **Secrets Manager** - Credential management

**Deliverables:**
1. VPC and network architecture
2. EKS cluster setup and configuration
3. RDS database setup with backup strategy
4. S3 and CloudFront CDN
5. Load balancing and auto-scaling
6. Security and compliance
7. Disaster recovery and backup
8. Cost optimization
9. Infrastructure as Code (Terraform)

---

## 1. AWS Network Architecture

### 1.1 VPC Design

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Region (us-east-1)                    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         VPC (10.0.0.0/16)                            │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Availability Zone 1 (us-east-1a)          │    │   │
│  │  │                                             │    │   │
│  │  │  Public Subnet (10.0.1.0/24)               │    │   │
│  │  │  ├─ NAT Gateway                            │    │   │
│  │  │  └─ Internet Gateway                       │    │   │
│  │  │                                             │    │   │
│  │  │  Private Subnet (10.0.11.0/24)             │    │   │
│  │  │  ├─ EKS Worker Nodes                       │    │   │
│  │  │  ├─ RDS Subnet Group                       │    │   │
│  │  │  └─ ElastiCache Subnet Group               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Availability Zone 2 (us-east-1b)          │    │   │
│  │  │                                             │    │   │
│  │  │  Public Subnet (10.0.2.0/24)               │    │   │
│  │  │  ├─ NAT Gateway                            │    │   │
│  │  │  └─ Internet Gateway                       │    │   │
│  │  │                                             │    │   │
│  │  │  Private Subnet (10.0.12.0/24)             │    │   │
│  │  │  ├─ EKS Worker Nodes                       │    │   │
│  │  │  ├─ RDS Subnet Group                       │    │   │
│  │  │  └─ ElastiCache Subnet Group               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Availability Zone 3 (us-east-1c)          │    │   │
│  │  │                                             │    │   │
│  │  │  Public Subnet (10.0.3.0/24)               │    │   │
│  │  │  ├─ NAT Gateway                            │    │   │
│  │  │  └─ Internet Gateway                       │    │   │
│  │  │                                             │    │   │
│  │  │  Private Subnet (10.0.13.0/24)             │    │   │
│  │  │  ├─ EKS Worker Nodes                       │    │   │
│  │  │  ├─ RDS Subnet Group                       │    │   │
│  │  │  └─ ElastiCache Subnet Group               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 VPC Terraform Configuration

```hcl
# vpc.tf
provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "ecommerce-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "ecommerce-igw"
  }
}

# Public Subnets (for NAT Gateways and ALB)
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "ecommerce-public-${count.index + 1}"
  }
}

# Private Subnets (for EKS, RDS, ElastiCache)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 11}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "ecommerce-private-${count.index + 1}"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "ecommerce-eip-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "ecommerce-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "ecommerce-public-rt"
  }
}

# Route Table Associations for Public Subnets
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Tables for Private Subnets (one per AZ for HA)
resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "ecommerce-private-rt-${count.index + 1}"
  }
}

# Route Table Associations for Private Subnets
resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "ecommerce-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecommerce-alb-sg"
  }
}

# Security Group for EKS Nodes
resource "aws_security_group" "eks_nodes" {
  name        = "ecommerce-eks-nodes-sg"
  description = "Security group for EKS nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecommerce-eks-nodes-sg"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "ecommerce-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecommerce-rds-sg"
  }
}

# Security Group for ElastiCache
resource "aws_security_group" "elasticache" {
  name        = "ecommerce-elasticache-sg"
  description = "Security group for ElastiCache"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecommerce-elasticache-sg"
  }
}
```

---

## 2. EKS Cluster Setup

### 2.1 EKS Cluster Terraform

```hcl
# eks.tf
# IAM Role for EKS Cluster
resource "aws_iam_role" "eks_cluster" {
  name = "ecommerce-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name            = "ecommerce-eks-cluster"
  role_arn        = aws_iam_role.eks_cluster.arn
  version         = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
    security_group_ids      = [aws_security_group.eks_nodes.id]
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  tags = {
    Name = "ecommerce-eks-cluster"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller
  ]
}

# IAM Role for EKS Node Group
resource "aws_iam_role" "eks_nodes" {
  name = "ecommerce-eks-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_ssm_managed_instance_core" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.eks_nodes.name
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "ecommerce-node-group"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = 6
    max_size     = 20
    min_size     = 3
  }

  instance_types = ["t3.xlarge"]

  tags = {
    Name = "ecommerce-node-group"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
    aws_iam_role_policy_attachment.eks_ssm_managed_instance_core
  ]
}

# OIDC Provider for IRSA (IAM Roles for Service Accounts)
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}
```

### 2.2 EKS Add-ons Configuration

```hcl
# eks-addons.tf
# VPC CNI Add-on
resource "aws_eks_addon" "vpc_cni" {
  cluster_name             = aws_eks_cluster.main.name
  addon_name               = "vpc-cni"
  addon_version            = "v1.14.1-eksbuild.1"
  resolve_conflicts        = "OVERWRITE"
  service_account_role_arn = aws_iam_role.vpc_cni.arn

  tags = {
    Name = "ecommerce-vpc-cni"
  }
}

# CoreDNS Add-on
resource "aws_eks_addon" "coredns" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "coredns"
  addon_version     = "v1.9.3-eksbuild.2"
  resolve_conflicts = "OVERWRITE"

  tags = {
    Name = "ecommerce-coredns"
  }
}

# kube-proxy Add-on
resource "aws_eks_addon" "kube_proxy" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "kube-proxy"
  addon_version     = "v1.28.1-eksbuild.1"
  resolve_conflicts = "OVERWRITE"

  tags = {
    Name = "ecommerce-kube-proxy"
  }
}

# EBS CSI Driver Add-on
resource "aws_eks_addon" "ebs_csi" {
  cluster_name             = aws_eks_cluster.main.name
  addon_name               = "aws-ebs-csi-driver"
  addon_version            = "v1.24.0-eksbuild.1"
  resolve_conflicts        = "OVERWRITE"
  service_account_role_arn = aws_iam_role.ebs_csi.arn

  tags = {
    Name = "ecommerce-ebs-csi"
  }
}

# IAM Role for VPC CNI
resource "aws_iam_role" "vpc_cni" {
  name = "ecommerce-vpc-cni-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.cluster.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-node"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.vpc_cni.name
}

# IAM Role for EBS CSI
resource "aws_iam_role" "ebs_csi" {
  name = "ecommerce-ebs-csi-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.cluster.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi.name
}
```

---

## 3. RDS Database Setup

### 3.1 RDS PostgreSQL Terraform

```hcl
# rds.tf
# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "ecommerce-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "ecommerce-db-subnet-group"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier     = "ecommerce-postgres"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.r6i.2xlarge"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = "ecommerce"
  username = "ecommerce"
  password = random_password.rds_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = true
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "ecommerce-postgres-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]
  deletion_protection             = true
  copy_tags_to_snapshot          = true

  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  enable_iam_database_authentication = true

  tags = {
    Name = "ecommerce-postgres"
  }
}

# RDS Read Replica for read scaling
resource "aws_db_instance" "read_replica" {
  identifier     = "ecommerce-postgres-read-replica"
  replicate_source_db = aws_db_instance.main.identifier

  instance_class = "db.r6i.xlarge"
  publicly_accessible = false

  skip_final_snapshot = false
  final_snapshot_identifier = "ecommerce-postgres-replica-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name = "ecommerce-postgres-read-replica"
  }
}

# KMS Key for RDS Encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "ecommerce-rds-key"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/ecommerce-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
}

# Store RDS password in Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name = "ecommerce/rds/password"
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds_password.result
}

# RDS Proxy for connection pooling
resource "aws_db_proxy" "main" {
  name                   = "ecommerce-db-proxy"
  engine_family          = "POSTGRESQL"
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.rds_password.arn
  }

  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.rds.id]

  max_connections                = 100
  max_idle_connections           = 50
  connection_borrow_timeout      = 120
  session_pinning_filters        = []
  init_query                     = ""
  require_tls                    = true

  tags = {
    Name = "ecommerce-db-proxy"
  }
}

# IAM Role for RDS Proxy
resource "aws_iam_role" "rds_proxy" {
  name = "ecommerce-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "rds_proxy_policy" {
  name = "ecommerce-rds-proxy-policy"
  role = aws_iam_role.rds_proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.rds_password.arn
      }
    ]
  })
}
```

---

## 4. ElastiCache Redis Setup

### 4.1 ElastiCache Terraform

```hcl
# elasticache.tf
# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "ecommerce-elasticache-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "ecommerce-elasticache-subnet-group"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "main" {
  replication_group_description = "Redis cluster for ecommerce"
  engine                        = "redis"
  engine_version                = "7.0"
  node_type                     = "cache.r6g.xlarge"
  num_cache_clusters            = 3
  parameter_group_name          = aws_elasticache_parameter_group.main.name
  port                          = 6379
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.elasticache.id]

  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "mon:04:00-mon:06:00"

  notification_topic_arn = aws_sns_topic.elasticache_notifications.arn

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = {
    Name = "ecommerce-redis"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "ecommerce-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = {
    Name = "ecommerce-redis-params"
  }
}

# Random auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name = "ecommerce/redis/auth-token"
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/redis/slow-log"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/redis/engine-log"
  retention_in_days = 7
}

# SNS Topic for ElastiCache Notifications
resource "aws_sns_topic" "elasticache_notifications" {
  name = "ecommerce-elasticache-notifications"
}
```

---

## 5. S3 and CloudFront CDN

### 5.1 S3 and CloudFront Terraform

```hcl
# s3-cloudfront.tf
# S3 Bucket for static assets
resource "aws_s3_bucket" "assets" {
  bucket = "ecommerce-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "ecommerce-assets"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}

# Enable logging
resource "aws_s3_bucket_logging" "assets" {
  bucket = aws_s3_bucket.assets.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/"
}

# S3 Bucket for logs
resource "aws_s3_bucket" "logs" {
  bucket = "ecommerce-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "ecommerce-logs"
  }
}

# Block public access on logs bucket
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy for logs
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

# KMS Key for S3 Encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "ecommerce-s3-key"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/ecommerce-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ecommerce S3 bucket"
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALBOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }

      headers = ["*"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    compress = true
  }

  cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000
    max_ttl                = 31536000

    compress = true
  }

  cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }

      headers = ["*"]
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "ecommerce-cloudfront"
  }
}

# Data source for AWS account ID
data "aws_caller_identity" "current" {}
```

---

## 6. Application Load Balancer

### 6.1 ALB Terraform

```hcl
# alb.tf
# Application Load Balancer
resource "aws_lb" "main" {
  name               = "ecommerce-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "ecommerce-alb"
  }
}

# Target Group for Backend
resource "aws_lb_target_group" "backend" {
  name        = "ecommerce-backend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name = "ecommerce-backend-tg"
  }
}

# Target Group for Frontend
resource "aws_lb_target_group" "frontend" {
  name        = "ecommerce-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name = "ecommerce-frontend-tg"
  }
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Listener Rule for API
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "ecommerce.com"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.ecommerce.com",
    "api.ecommerce.com"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "ecommerce-cert"
  }
}
```

---

## 7. Security & Compliance

### 7.1 WAF Configuration

```hcl
# waf.tf
# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name  = "ecommerce-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ecommerce-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "ecommerce-waf"
  }
}

# Associate WAF with CloudFront
resource "aws_wafv2_web_acl_association" "cloudfront" {
  resource_arn = aws_cloudfront_distribution.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

### 7.2 IAM Policies for Applications

```hcl
# iam-policies.tf
# IAM Role for Backend Application
resource "aws_iam_role" "backend_app" {
  name = "ecommerce-backend-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.cluster.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:ecommerce:backend"
          }
        }
      }
    ]
  })
}

# Policy for S3 Access
resource "aws_iam_role_policy" "backend_s3" {
  name = "ecommerce-backend-s3-policy"
  role = aws_iam_role.backend_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# Policy for Secrets Manager Access
resource "aws_iam_role_policy" "backend_secrets" {
  name = "ecommerce-backend-secrets-policy"
  role = aws_iam_role.backend_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.rds_password.arn,
          aws_secretsmanager_secret.redis_auth_token.arn
        ]
      }
    ]
  })
}

# Policy for SQS Access (for queues)
resource "aws_iam_role_policy" "backend_sqs" {
  name = "ecommerce-backend-sqs-policy"
  role = aws_iam_role.backend_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = "arn:aws:sqs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:ecommerce-*"
      }
    ]
  })
}

# Policy for CloudWatch Logs
resource "aws_iam_role_policy" "backend_logs" {
  name = "ecommerce-backend-logs-policy"
  role = aws_iam_role.backend_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecommerce/*"
      }
    ]
  })
}
```

---

## 8. Monitoring & Logging

### 8.1 CloudWatch Configuration

```hcl
# cloudwatch.tf
# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/ecommerce-cluster"
  retention_in_days = 30

  tags = {
    Name = "ecommerce-eks-logs"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "alb_target_health" {
  alarm_name          = "ecommerce-alb-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Alert when ALB has unhealthy targets"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "ecommerce-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when RDS CPU is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "ecommerce-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Alert when Redis CPU is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "ecommerce-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

---

## 9. Disaster Recovery & Backup

### 9.1 Backup Strategy

```hcl
# backup.tf
# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name = "ecommerce-backup-vault"

  tags = {
    Name = "ecommerce-backup-vault"
  }
}

# RDS Backup Plan
resource "aws_backup_plan" "rds" {
  name = "ecommerce-rds-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"

    lifecycle {
      delete_after = 30
    }
  }

  tags = {
    Name = "ecommerce-rds-backup-plan"
  }
}

# RDS Backup Resource Assignment
resource "aws_backup_resource_assignment" "rds" {
  name             = "ecommerce-rds-backup-assignment"
  plan_id          = aws_backup_plan.rds.id
  iam_role_arn     = aws_iam_role.backup.arn
  resource_type    = "RDS"
  resources        = ["arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:db:${aws_db_instance.main.id}"]
}

# IAM Role for Backup
resource "aws_iam_role" "backup" {
  name = "ecommerce-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}
```

---

## 10. Variables and Outputs

### 10.1 Variables

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "alert_email" {
  description = "Email for CloudWatch alerts"
  type        = string
}

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_type" {
  description = "EKS node instance type"
  type        = string
  default     = "t3.xlarge"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6i.2xlarge"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.xlarge"
}
```

### 10.2 Outputs

```hcl
# outputs.tf
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = aws_db_proxy.main.endpoint
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.assets.id
}
```

---

## 11. Implementation Checklist

### Phase 6A: VPC & Networking (Week 1)
- [ ] VPC setup with 3 AZs
- [ ] Public and private subnets
- [ ] NAT Gateways
- [ ] Security groups
- [ ] Route tables

### Phase 6B: EKS Cluster (Week 1-2)
- [ ] EKS cluster creation
- [ ] Node groups
- [ ] OIDC provider
- [ ] Add-ons (VPC CNI, CoreDNS, kube-proxy, EBS CSI)
- [ ] IRSA setup

### Phase 6C: RDS & ElastiCache (Week 2)
- [ ] RDS PostgreSQL setup
- [ ] Multi-AZ deployment
- [ ] Read replicas
- [ ] RDS Proxy
- [ ] ElastiCache Redis
- [ ] Backup strategy

### Phase 6D: S3 & CloudFront (Week 2-3)
- [ ] S3 bucket setup
- [ ] Versioning and encryption
- [ ] CloudFront distribution
- [ ] OAI configuration
- [ ] Cache behaviors

### Phase 6E: Load Balancing (Week 3)
- [ ] ALB setup
- [ ] Target groups
- [ ] Listeners and rules
- [ ] ACM certificate
- [ ] Health checks

### Phase 6F: Security (Week 3-4)
- [ ] WAF configuration
- [ ] IAM policies
- [ ] KMS encryption
- [ ] Secrets Manager
- [ ] Security groups

### Phase 6G: Monitoring & Backup (Week 4)
- [ ] CloudWatch setup
- [ ] Alarms and notifications
- [ ] Backup plans
- [ ] Log aggregation
- [ ] Performance monitoring

---

## 12. Cost Optimization

| Service | Instance Type | Quantity | Monthly Cost |
|---------|---------------|----------|--------------|
| EKS Cluster | t3.xlarge | 6 | $1,200 |
| RDS | db.r6i.2xlarge | 1 | $2,400 |
| RDS Read Replica | db.r6i.xlarge | 1 | $1,200 |
| ElastiCache | cache.r6g.xlarge | 3 | $900 |
| ALB | - | 1 | $300 |
| CloudFront | - | - | $500 |
| S3 | - | - | $200 |
| **Total** | | | **$6,700/month** |

---

**Document Version:** 6.0
**Status:** Ready for Implementation
**Next Phase:** PHASE 7 - AI & Search Optimization
