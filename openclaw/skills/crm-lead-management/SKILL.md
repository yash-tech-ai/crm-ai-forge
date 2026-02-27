# Lead Management Skill

## Capabilities
- Create and update contacts via the CRM API
- Score leads using fit (0-50) + intent (0-50) model
- Manage lifecycle stage transitions
- Detect duplicate contacts before creation
- Tag and segment contacts automatically

## When to Use
- User says "add a contact", "create a lead", "update [name]"
- Event: new contact imported, form submitted, email engagement detected
- Cron: nightly lead score decay calculation

## API Endpoints Used
- `GET /api/v1/contacts` — search and list contacts
- `POST /api/v1/contacts` — create new contact
- `PATCH /api/v1/contacts/:id` — update contact fields, score, stage
- `GET /api/v1/companies` — look up company for association
- `POST /api/v1/activities` — log scoring decisions
- `POST /api/v1/tasks` — create follow-up tasks for contact owners
