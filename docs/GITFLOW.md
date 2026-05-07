# GitFlow Workflow Guide

## Overview

This project follows the GitFlow branching model for professional version control and continuous deployment.

## Branch Structure

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

## Branch Naming Conventions

### Feature Branches
```
feature/auth-jwt-refresh
feature/payments-stp-integration
feature/elasticsearch-search
feature/ml-recommendations
```

### Bugfix Branches
```
bugfix/cart-quantity-sync
bugfix/payment-webhook-timeout
bugfix/search-arabic-support
```

### Hotfix Branches
```
hotfix/security-vulnerability
hotfix/database-connection-pool
```

### Release Branches
```
release/1.0.0
release/1.1.0
```

### Chore Branches
```
chore/update-dependencies
chore/upgrade-node-version
chore/refactor-auth-module
```

## Commit Message Standards

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Add/update tests
- `docs` - Documentation changes
- `chore` - Build/tool changes
- `ci` - CI/CD changes
- `style` - Code style (no logic)

### Examples

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
```

## Workflow

### Starting a Feature

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat(scope): description"
git push origin feature/your-feature-name
```

### Creating a Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select `develop` as base branch
4. Select your feature branch as compare branch
5. Fill in PR template
6. Request reviewers
7. Wait for CI/CD to pass

### Merging to Develop

1. Get PR approval from at least 2 reviewers
2. Ensure all CI/CD checks pass
3. Merge with "Create a merge commit" option
4. Delete feature branch

### Creating a Release

```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# Update version numbers
# Update CHANGELOG.md
git add .
git commit -m "chore(release): prepare v1.0.0"
git push origin release/1.0.0
```

### Releasing to Production

1. Create PR from `release/1.0.0` to `main`
2. Get approval
3. Merge to `main`
4. Create GitHub Release with tag `v1.0.0`
5. Merge back to `develop`

### Hotfixes

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/security-patch

# Make fix and commit
git add .
git commit -m "fix(security): patch vulnerability"
git push origin hotfix/security-patch

# Create PR to main
# After merge, merge back to develop
```

## Best Practices

1. **Keep branches small** - One feature per branch
2. **Commit frequently** - Small, logical commits
3. **Write clear messages** - Use conventional commits
4. **Review code** - Get peer review before merging
5. **Test thoroughly** - Run tests locally before pushing
6. **Keep develop stable** - Only merge tested code
7. **Use semantic versioning** - Follow semver for releases
8. **Update documentation** - Keep docs in sync with code

## CI/CD Integration

- All PRs run automated tests
- Code coverage must be > 80%
- Linting must pass
- Security scanning must pass
- Manual approval required for production

## Troubleshooting

### Merge Conflicts

```bash
# Update your branch with latest develop
git fetch origin
git rebase origin/develop

# Resolve conflicts in your editor
git add .
git rebase --continue
git push origin feature/your-feature-name --force
```

### Accidentally Committed to Wrong Branch

```bash
# Create new branch from current commit
git branch feature/correct-name

# Reset current branch to before the commit
git reset --hard HEAD~1

# Switch to new branch
git checkout feature/correct-name
```

### Undo Last Commit

```bash
# Keep changes
git reset --soft HEAD~1

# Discard changes
git reset --hard HEAD~1
```

## Resources

- [GitFlow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
