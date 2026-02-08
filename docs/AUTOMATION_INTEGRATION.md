# PropFlow Automation Integration Guide

This document outlines the systematic architecture for integrating document and data automations within the PropFlow ecosystem.

## 1. The Propagation Pipeline

PropFlow uses an **Atomic Binary Propagation** strategy. Every critical financial or document event follows this rigorous path:

1.  **Event Capture**: User triggers an action (e.g., "Dispatch Entry").
2.  **Asset Generation (Optional)**: If a PDF is required, it is generated via the **Isolated Iframe Capture Module**.
3.  **Atomic Relay**: The dispatch engine fetches the generated PDF from the secure vault and relays it as `multipart/form-data`.
4.  **Binary Payload**: The webhook receives:
    -   `payload`: A JSON string containing all metadata (invoice ID, items, etc.).
    -   `attachment`: The actual binary PDF document.
5.  **Signed Delivery**: The payload is signed with a timestamped HMAC signature in the headers.

## 2. Replicatable Payload Schema

### Webhook Format: `multipart/form-data`

| `payload` | `JSON String` | Flattened metadata object (includes `dispatch_notes`). |
| `attachment` | `Binary (PDF)` | The actual invoice/document file. |

### Metadata Sample (within `payload`)
```json
{
  "invoice_id": "uuid",
  "dispatch_notes": "Please followup by Thursday...",
  ...
}
```
To ensure easy integration for future clients (n8n, Zapier, Make), all automation triggers must follow this standardized schema:

### Invoice Creation (`invoice.created`)
```json
{
  "invoice_id": "uuid",
  "invoice_number": "PF-2024-001",
  "amount": 1250.00,
  "recipient_email": "tenant@example.com",
  "items": [
    { "description": "Rent - January", "amount": 1200.00 },
    { "description": "Pet Fee", "amount": 50.00 }
  ],
  "file_url": "https://...",
  "triggered_at": "ISO-TIMESTAMP"
}
```

## 3. Production Best Practices

-   **Environment Isolation**: Use `NODE_ENV` in the metadata to filter test events in your automation gateway.
-   **Signed Verification**: Your gateway should always verify the `x-propflow-signature` header using the shared secret.
-   **Idempotency**: Use the `invoice_id` as an idempotency key in your target systems (e.g., QuickBooks, Stripe) to prevent duplicate processing.

## 4. Error Recovery

If a dispatch fails:
1. Check the `webhook_events` table in Supabase.
2. Inspect the `error_message` and `response_code`.
3. Use the "Quick Action" buttons in the PropFlow Dashboard to re-trigger a "Data Only" dispatch if the PDF engine encountered browser-specific limitations.
