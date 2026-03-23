# CI/CD Workflows

GitHub Actions workflows in `.github/workflows/` are intentionally manual by design so the repository does not spend Actions minutes on every push or pull request.

## Manual-only workflows

- **Manual Quality Checks** (`.github/workflows/tools.yml`)
  - Trigger: `workflow_dispatch`, `workflow_call`.
  - Runs setup + quality checks:
    - OpenAPI contract drift check (`openapi-contract-sync`)
    - Lint
    - Typecheck
    - Unit tests
    - Prettier check
- **Manual E2E Tests** (`.github/workflows/ci-pr.yml`)
  - Trigger: `workflow_dispatch`, `workflow_call`.
  - Runs `Manual Quality Checks` as a gate and then executes web E2E tests.
- **Manual Build** (`.github/workflows/build.yml`)
  - Trigger: `workflow_dispatch`, `workflow_call`.
  - Runs `Manual Quality Checks` as a gate and then builds web/API artifacts.
- **Manual Docker Image Build** (`.github/workflows/infra-build-images.yml`)
  - Trigger: `workflow_dispatch`.
  - Builds and pushes the API and web Docker images when requested.
- **Manual Publish API Contracts** (`.github/workflows/release-contracts.yml`)
  - Trigger: `workflow_dispatch`.
  - Publishes the contracts package only when maintainers explicitly start the workflow.
- **Manual Production Deploy** (`.github/workflows/deploy-production.yml`)
  - Trigger: `workflow_dispatch`.
  - Deploys the production stack over SSH only when a maintainer starts it.
- **Stack Init / Local Env** (`.github/workflows/infra-stack-init.yml`)
  - Trigger: `workflow_dispatch`.
- **Update Lockfile & ESLint Deps (manual)** (`.github/workflows/tool-update-lock.yml`)
  - Trigger: `workflow_dispatch`.

## Why this is manual

- No workflow runs automatically on `pull_request`, `push`, or tag events.
- Maintainers choose when to spend Actions minutes for validation, packaging, publishing, or production deployment.
- `workflow_call` is retained only for manual workflow composition inside GitHub Actions.

## Recommended usage

Before merging or deploying, run the manual workflows you need from the GitHub Actions UI:

1. `Manual Quality Checks`
2. `Manual E2E Tests` when browser coverage is needed
3. `Manual Build` when you want build artifacts or optional Docker pushes
4. `Manual Production Deploy` when you are ready to release
