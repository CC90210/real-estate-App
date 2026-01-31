# 🧠 PropFlow Automation Integration Guide

This application is built with an **Event-Driven Architecture**.  
Instead of hardcoding logic (like "send email"), the app emits **Events** to an external automation brain (like n8n, Zapier, or Make).

## 1. Configuration
To enable automations, set this variable in your deployment (Vercel):

```bash
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/propflow-events
```

## 2. Event Envelope Structure
Every event sent from PropFlow follows this strict JSON schema:

```json
{
  "id": "uuid-v4",
  "timestamp": "2024-01-30T12:00:00Z",
  "event": "EVENT_NAME",
  "environment": "production",
  "payload": {
    // Event-specific data
  }
}
```

## 3. Supported Events

### `APPLICATION_SUBMITTED`
**Trigger:** When a new tenant applies for a property.  
**Use Case:**  
1. Run credit check API.  
2. Email Landlord "New Lead".  
3. Post to Slack #leasing-alerts.

**Payload:**
```json
{
  "application_id": "uuid",
  "applicant_name": "John Doe",
  "applicant_email": "john@example.com",
  "monthly_income": 5000,
  "credit_score": 720,
  "webhook_callback_url": "https://propflow.com/api/webhooks/automation-callback"
}
```

### `APPLICATION_STATUS_CHANGED`
**Trigger:** When a Landlord approves or denies an application.  
**Use Case:**  
1. If Approved -> Generate PDF Lease via Google Docs -> Email to Tenant for E-Sign.
2. If Denied -> Send polite rejection email.

**Payload:**
```json
{
  "application_id": "uuid",
  "new_status": "approved",
  "action": "START_LEASE_DRAFTING"
}
```

## 4. Automation Callback (The Loop)
Your automation can "talk back" to PropFlow to update status (e.g., after credit check finishes).

**Action:** POST request to `webhook_callback_url`
**Body:**
```json
{
  "application_id": "uuid-from-payload",
  "status": "screening", 
  "metadata": {
    "credit_score_result": 750,
    "risk_level": "LOW"
  }
}
```
This will automatically update the Application status in the Dashboard and log the activity.
