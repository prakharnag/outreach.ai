# Contributing to Outreach.ai

We love your input! We want to make contributing to Outreach.ai as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Coding Standards

### TypeScript
- Use strict TypeScript configuration
- Always define proper types for function parameters and return values
- Avoid `any` types unless absolutely necessary
- Use meaningful variable and function names

### React/Next.js
- Use functional components with hooks
- Follow React best practices for state management
- Use Next.js App Router patterns
- Implement proper error boundaries

### Styling
- Use Tailwind CSS for all styling
- Follow the design system established in components/ui/
- Ensure responsive design for all components
- Use semantic HTML elements

### Code Organization
```
- Group related functions together
- Use barrel exports (index.ts files) for cleaner imports
- Keep components small and focused
- Extract custom hooks for reusable logic
```

## Git Workflow

### Branch Naming
- `feature/` for new features
- `bugfix/` for bug fixes
- `hotfix/` for urgent fixes
- `docs/` for documentation updates

### Commit Messages
Follow conventional commits:
```
type(scope): description

feat(auth): add Google OAuth integration
fix(api): resolve rate limiting issue
docs(readme): update installation instructions
```

## Testing

- Write unit tests for utility functions
- Write integration tests for API endpoints
- Test React components with React Testing Library
- Ensure all tests pass before submitting PR

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

## Report Bugs Using GitHub Issues

We use GitHub issues to track public bugs. Report a bug by opening a new issue.

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening)

## Feature Requests

We welcome feature requests! Please:

- Check if the feature already exists
- Provide a clear description of the feature
- Explain the use case and benefits
- Consider implementation complexity

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## Questions?

Don't hesitate to reach out if you have questions about contributing!
