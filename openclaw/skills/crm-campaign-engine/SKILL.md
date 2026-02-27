# Campaign Engine Skill

## Capabilities
- Create email campaigns with templates and segments
- Build drip sequences with conditional steps
- Configure A/B tests for subject lines and content
- Submit campaigns for compliance review
- Schedule campaigns after compliance approval
- Analyze campaign performance metrics

## When to Use
- User says "create a campaign", "send an email to", "set up a drip sequence"
- Event: campaign created, compliance approved/rejected
- Cron: scheduled campaign send time reached

## Campaign Flow
1. Create campaign → status: DRAFT
2. Submit for compliance → status: PENDING_COMPLIANCE
3. Compliance Agent reviews → APPROVED or REJECTED
4. If approved, schedule → status: SCHEDULED
5. Worker sends at scheduled time → status: SENDING → SENT
