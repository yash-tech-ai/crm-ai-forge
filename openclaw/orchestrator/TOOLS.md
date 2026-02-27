# Orchestrator — Tools

## Allowed
- **delegate**: Route tasks to specialist agents
- **api:GET /api/v1/analytics/dashboard**: Read dashboard summary for context
- **memory:read**: Read conversation history and context
- **memory:write**: Store routing decisions and user preferences

## Denied
- **api:POST**: Cannot create/modify data directly
- **api:PATCH**: Cannot update data directly
- **api:DELETE**: Cannot delete data directly
- **email:send**: Cannot send emails directly
- **database:***: No direct database access
