# Contributing to Saudi Ecommerce Platform

Thank you for your interest in contributing to the Saudi Ecommerce Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Getting Started

### Prerequisites
- Node.js 22.13.0+
- pnpm 10.4.1+
- Git
- MySQL 8.0+ or TiDB

### Development Setup

1. **Fork the repository**
```bash
git clone https://github.com/YOUR_USERNAME/ecommerceweb.git
cd ecommerceweb
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Install dependencies**
```bash
pnpm install
```

4. **Set up environment**
```bash
cp .env.example .env
```

5. **Start development server**
```bash
pnpm dev
```

## Development Workflow

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

#### Examples
```
feat(cart): add quantity update functionality
fix(checkout): resolve payment method validation
docs(readme): update installation instructions
test(loyalty): add points calculation tests
```

### Code Style

- Use TypeScript for all code
- Follow ESLint rules
- Format code with Prettier
- Use meaningful variable names
- Add comments for complex logic

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test core.test.ts

# Watch mode
pnpm test --watch
```

### Type Checking

```bash
# Check TypeScript errors
pnpm check
```

### Code Formatting

```bash
# Format code
pnpm format

# Check formatting
pnpm format --check
```

## Feature Development

### Adding a New Feature

1. **Create a feature branch**
```bash
git checkout -b feature/my-feature
```

2. **Update database schema** (if needed)
```typescript
// drizzle/schema.ts
export const myTable = mysqlTable('my_table', {
  id: int('id').autoincrement().primaryKey(),
  // ... columns
});
```

3. **Run migrations**
```bash
pnpm db:push
```

4. **Add database helpers** (if needed)
```typescript
// server/db.ts
export async function getMyData() {
  const db = await getDb();
  // ... query logic
}
```

5. **Create tRPC procedures**
```typescript
// server/routers.ts
myFeature: router({
  list: publicProcedure.query(async () => {
    return await db.getMyData();
  }),
  create: protectedProcedure
    .input(z.object({ /* ... */ }))
    .mutation(async ({ input }) => {
      // ... mutation logic
    }),
}),
```

6. **Build frontend components**
```typescript
// client/src/pages/MyFeature.tsx
export default function MyFeature() {
  const { data } = trpc.myFeature.list.useQuery();
  // ... component logic
}
```

7. **Add tests**
```typescript
// server/tests/my-feature.test.ts
describe('My Feature', () => {
  it('should work correctly', () => {
    // ... test logic
  });
});
```

8. **Update documentation**
- Update README.md if needed
- Add API documentation
- Update ARCHITECTURE.md if applicable

### Bug Fixes

1. **Create a fix branch**
```bash
git checkout -b fix/issue-description
```

2. **Write a test that reproduces the bug**
```typescript
it('should handle edge case', () => {
  // Test that fails with current code
});
```

3. **Fix the bug**
4. **Verify the test passes**
5. **Run all tests to ensure no regressions**

## Pull Request Process

### Before Submitting

1. **Update your branch**
```bash
git fetch origin
git rebase origin/main
```

2. **Run all checks**
```bash
pnpm check
pnpm format
pnpm test
```

3. **Verify the app runs**
```bash
pnpm dev
```

### Submitting a PR

1. **Push your branch**
```bash
git push origin feature/my-feature
```

2. **Create a Pull Request** on GitHub
   - Use a clear title
   - Reference related issues
   - Describe changes in detail
   - Include screenshots for UI changes

3. **PR Template**
```markdown
## Description
Brief description of changes

## Related Issues
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how to test these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
```

### PR Review Process

- Maintainers will review your PR
- Address feedback and make requested changes
- Keep commits clean and organized
- Once approved, your PR will be merged

## Project Structure Guidelines

### Frontend
- Place page components in `client/src/pages/`
- Reusable components in `client/src/components/`
- Custom hooks in `client/src/hooks/`
- Utilities in `client/src/lib/`

### Backend
- Database queries in `server/db.ts`
- tRPC procedures in `server/routers.ts`
- Tests in `server/tests/`

### Database
- Schema in `drizzle/schema.ts`
- Migrations auto-generated by Drizzle

## Performance Guidelines

- Optimize database queries
- Use React Query for caching
- Implement code splitting
- Optimize images
- Minimize bundle size

## Security Guidelines

- Never commit secrets or API keys
- Validate all user inputs
- Use parameterized queries (ORM)
- Implement proper authentication checks
- Follow OWASP guidelines

## Documentation Guidelines

- Write clear, concise documentation
- Include code examples
- Update README for new features
- Add comments for complex logic
- Keep ARCHITECTURE.md updated

## Reporting Issues

### Bug Reports
Include:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/videos if applicable
- Environment details

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Possible implementation approach
- Examples from other platforms

## Questions?

- Check existing issues and discussions
- Read the documentation
- Ask in GitHub discussions
- Contact maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to make Saudi Ecommerce Platform better! 🎉
