# Repository Guidelines

## Project Structure & Module Organization

- `backend/app/`: FastAPI application. Routes live in `api/`, orchestration in `services/`, Kubernetes reads in `collectors/`, database operations in `repositories/`, and SQLAlchemy mappings in `models/`.
- `backend/app/schemas/`, `config/`, and `cache/`: request schemas, environment/Kubernetes configuration, and Redis helpers.
- `backend/app/database/k8s_monitor_mariadb.sql`: MariaDB schema; `backend/app/tests/`: integration scripts.
- `agent/`: host metrics collector and Linux systemd installer.
- `tools/`: standalone Kubernetes scripts; `manifest/`: example resource YAML.

## Build, Test, and Development Commands

Run backend commands from `backend/` with an activated Python virtual environment:

```sh
python -m pip install -r app/requirements.txt
python -m uvicorn app.main:app --reload
```

These install dependencies and start the API locally. There is no separate build step. Initialize a development database using `app/database/k8s_monitor_mariadb.sql` through a MariaDB client.

From `agent/`, install dependencies with `python -m pip install -r requirements.txt`. `python metric_agent.py` sends one sample to its configured backend. On Linux, `sudo ./install.sh` installs a systemd service and timer; it changes the host configuration.

## Coding Style & Naming Conventions

Use four-space indentation, snake_case functions/modules, and descriptive resource-specific filenames such as `pod_collector.py` and `pod_repository.py`. Existing ORM classes use snake_case; preserve local conventions when editing them. Keep HTTP handling, collection, and persistence in their respective layers. Use Pydantic schemas for request validation. No formatter or linter configuration is checked in.

## Testing Guidelines

Tests use `test_*.py` names but mostly execute live integration operations, sometimes at import time. They can write MariaDB records and contact Kubernetes, Redis, or Telegram. Inspect each script and use disposable services before execution, for example `python -m app.tests.test_check_run` from `backend/`. No test runner configuration or coverage target is defined. Add isolated tests for changed behavior; avoid real infrastructure in new unit tests.

## Commit & Pull Request Guidelines

History uses short, lowercase action summaries such as `add redis` and `update metric agent`. Keep summaries concise and identify the affected behavior. PRs should describe the change, validation performed, configuration/schema implications, and linked issues when applicable. Flag changes that mutate Kubernetes resources or affect alert delivery.

## Security & Configuration

Backend settings load `backend/app/.env`. Configure database, Redis, Kubernetes, and Telegram values without committing credentials. Verify kubeconfig targets before applying manifests. The agent backend URL is currently hardcoded; check it before sending metrics. Keep schema SQL and ORM mappings consistent.

## Stack

Backend:
- Python
- FastAPI
- SQLAlchemy
- MariaDB
- Redis
- Kubernetes Python Client

Frontend:
- HTML
- CSS
- Vanilla JavaScript

## Development rules

- Follow the existing architecture.
- Do not introduce React, Vue or frontend frameworks.
- Do not change the database schema unless explicitly requested.
- Do not add dependencies unless explicitly requested.
- Do not modify .env files.
- Never print secrets or credentials.
- Use SQLAlchemy for database access.
- Keep API routes inside FastAPI routers.

## Agent behavior

Before large changes:
1. inspect relevant code
2. explain the proposed approach
3. identify files that need modification

After changes:
1. run relevant tests
2. report changed files
3. report any failures