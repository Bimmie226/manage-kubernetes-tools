---
name: frontend-k8s-monitor
description: Create or update the Kubernetes Monitoring Tool frontend using HTML, CSS, and vanilla JavaScript. Use for node dashboards, service/resource status, manifest application, and monitoring history/detail screens in this repository.
---

# Kubernetes Monitoring Frontend

## Scope and stack

Work in `frontend/`, alongside `backend/`. Implement only the requested screen or behavior; the four main screens describe coverage, not a requirement to build them all at once.

Use HTML5, CSS3, and vanilla JavaScript. Do not introduce React, Vue, Angular, or other frontend frameworks. Use TypeScript only when explicitly requested. Follow repository `AGENTS.md`; do not add dependencies, change database schemas, or change backend APIs without explicit permission. Do not modify `.env` or expose credentials.

## Before modifying frontend

1. Inspect current frontend files and applicable repository instructions.
2. Identify reusable layouts, navigation, CSS tokens, components, and API helpers. Reuse them rather than creating competing implementations.
3. Inspect relevant FastAPI routers, schemas, and service responses for the actual API contract.
4. Explain the proposed approach and list the files to create or modify before editing. If the frontend is empty, establish only the shared structure needed for the requested feature.

## UI and file organization

- Use a clean DevOps dashboard style with clear hierarchy, readable status information, and consistent spacing.
- Separate HTML, CSS, and JavaScript files. Avoid inline styles, inline scripts, and HTML event-handler attributes; bind events with `addEventListener()`.
- Define reusable design tokens with CSS custom properties for colors, spacing, typography, borders, and radii. Reuse classes for cards, buttons, forms, tables, badges, and feedback states where useful.
- Use semantic HTML, labeled controls, keyboard-accessible interactions, visible focus indicators, and status text alongside color.
- Build responsive layouts for narrow mobile screens, tablets, and desktops. Keep wide resource tables and manifest editors usable with intentional scrolling.

## FastAPI integration

Use `fetch()` with the existing API configuration convention. Check `response.ok`, handle network failures and non-JSON error responses, and present useful FastAPI error details without exposing secrets. Render API-provided names, messages, and manifest content as text rather than trusted HTML.

Provide loading, empty, error, and success states as applicable. Prevent duplicate submissions while a request is pending. Do not invent endpoints or silently change backend behavior to fit the UI. Report missing backend capabilities and request explicit permission if an API change is necessary.

Inspect these files as needed; their current implementation is the source of truth:

- `backend/app/api/monitoring.py`: namespace checks, history lists, and run details.
- `backend/app/api/apply_manifest.py` and `backend/app/schemas/manifest.py`: YAML text and file submission.
- Relevant `backend/app/services/` implementations: response fields and error behavior.

For YAML text submission, follow the existing JSON request schema. For file upload, use `FormData` with the expected field name and let the browser set the multipart boundary. Applying a manifest mutates Kubernetes: submit only through an explicit user action, never on page load or an automatic retry.

## Screen-specific behavior

- **Node dashboard:** display actual node conditions; distinguish unknown status from healthy status.
- **Services/resources:** retain namespace context and present the available readiness, replica, address, and port fields.
- **Manifest apply:** support the requested text/upload flow, preserve input after errors, and show returned per-resource results. Do not assume a failed multi-document request rolled back earlier applications.
- **History/detail:** distinguish run status and timestamps from resource health, and handle missing details and empty histories.

## After modifying frontend

1. Check changed JavaScript for syntax errors using available tools; inspect browser console and exercise changed interactions when browser tooling is available.
2. Verify responsive layout at mobile, tablet, and desktop widths, including overflow, navigation, forms, and tables.
3. Exercise loading, empty, error, and success states with isolated fixtures or mocks when practical. Do not apply manifests to a live cluster merely to test the UI.
4. Report every changed file, checks performed, failures, and any verification that could not be completed. Never claim browser or responsive checks passed when only static inspection was possible.