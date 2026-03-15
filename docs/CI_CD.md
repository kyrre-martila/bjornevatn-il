# CI/CD Workflows

The repository enforces pull request quality gates with GitHub Actions workflows in `.github/workflows/`.

## PR-Enforced Workflows

- **Tools** (`.github/workflows/tools.yml`)
  - Trigger: `pull_request`, `workflow_dispatch`, `workflow_call`.
  - Runs setup + quality checks:
    - OpenAPI contract drift check (`openapi-contract-sync`)
    - Lint
    - Typecheck
    - Unit tests
    - Prettier check
- **CI - PR** (`.github/workflows/ci-pr.yml`)
  - Trigger: `pull_request`, `workflow_dispatch`, `workflow_call`.
  - Runs `Tools` as a gate and then executes web E2E tests.
- **Build** (`.github/workflows/build.yml`)
  - Trigger: `pull_request`, `workflow_dispatch`, `workflow_call`.
  - Runs `Tools` as a gate and then builds web/API artifacts.

## Branch Protection (recommended)

For `main`, require these checks before merge:

- `Tools`
- `CI - PR`
- `Build`

This ensures OpenAPI drift, lint/typecheck/unit/prettier, E2E, and build validation all run on pull requests.
