# Contributing to UK Law MCP

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/Ansvar-Systems/UK-law-mcp.git
cd UK-law-mcp
npm install
npm run build:db
npm test
```

## How to Contribute

1. Fork the repository
2. Create a feature branch from `dev`: `git checkout -b feat/my-feature dev`
3. Make your changes
4. Run tests: `npm test && npm run test:contract`
5. Submit a pull request targeting `dev`

## Code Style

- TypeScript strict mode
- ESM modules
- Vitest for testing

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0.
