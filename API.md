# Atlas - API Documentation

## Base URL

```
http://localhost:8000/api
```

## Authentication

Atlas is a single-user application. All requests are made on behalf of the default user (`primary-user`). No authentication headers are required.

## Response Format

All endpoints return JSON responses.

### Success Response
```json
{
  "id": "uuid",
  "field": "value",
  ...
}
```

### Error Response
```json
{
  "detail": "Error message describing what went wrong"
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Success with no content
- `400 Bad Request` - Invalid request
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - External service unavailable (storage, LLM, etc.)

---

## Endpoints

### 1. Bills

#### List Bills
```
GET /bills
```

Returns all bills sorted by due date.

**Response:**
```json
[
  {
    "id": "bill-uuid",
    "name": "Electricity",
    "amount": 120.50,
    "currency": "USD",
    "due_date": "2025-05-15T00:00:00Z",
    "category": "utilities",
    "notes": "Monthly electric bill",
    "recurring": false,
    "frequency": null,
    "paid": false,
    "paid_at": null,
    "source": "manual",
    "source_email_id": null,
    "created_at": "2025-05-07T12:34:56Z"
  }
]
```

#### Create Bill
```
POST /bills
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Electricity",
  "amount": 120.50,
  "currency": "USD",
  "due_date": "2025-05-15T00:00:00Z",
  "category": "utilities",
  "notes": "Monthly electric bill",
  "recurring": false,
  "frequency": null
}
```

**Response:** Created bill object (201)

#### Update Bill
```
PUT /bills/{bill_id}
Content-Type: application/json
```

**Request Body:** Same as Create Bill

**Response:** Updated bill object

#### Toggle Paid Status
```
POST /bills/{bill_id}/toggle-paid
```

Toggles the `paid` status and sets/clears `paid_at`.

**Response:** Updated bill object

#### Delete Bill
```
DELETE /bills/{bill_id}
```

**Response:**
```json
{
  "ok": true
}
```

---

### 2. Subscriptions

#### List Subscriptions
```
GET /subscriptions
```

Returns all subscriptions sorted by next renewal date.

**Response:**
```json
[
  {
    "id": "sub-uuid",
    "name": "Netflix",
    "amount": 15.99,
    "currency": "USD",
    "next_renewal": "2025-06-01T00:00:00Z",
    "frequency": "monthly",
    "category": "entertainment",
    "notes": "Family plan",
    "active": true,
    "source": "manual",
    "source_email_id": null,
    "created_at": "2025-05-07T12:34:56Z"
  }
]
```

#### Create Subscription
```
POST /subscriptions
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Netflix",
  "amount": 15.99,
  "currency": "USD",
  "next_renewal": "2025-06-01T00:00:00Z",
  "frequency": "monthly",
  "category": "entertainment",
  "notes": "Family plan"
}
```

**Frequency Values:** `weekly`, `monthly`, `quarterly`, `yearly`

**Response:** Created subscription object (201)

#### Update Subscription
```
PUT /subscriptions/{sub_id}
Content-Type: application/json
```

**Request Body:** Same as Create Subscription

**Response:** Updated subscription object

#### Toggle Active Status
```
POST /subscriptions/{sub_id}/toggle-active
```

**Response:** Updated subscription object

#### Delete Subscription
```
DELETE /subscriptions/{sub_id}
```

**Response:**
```json
{
  "ok": true
}
```

---

### 3. Tasks

#### List Tasks
```
GET /tasks
```

Returns all tasks sorted by due date.

**Response:**
```json
[
  {
    "id": "task-uuid",
    "title": "Renew passport",
    "description": "Book appointment at local office",
    "due_date": "2025-05-21T00:00:00Z",
    "priority": "high",
    "category": "personal",
    "completed": false,
    "completed_at": null,
    "created_at": "2025-05-07T12:34:56Z"
  }
]
```

#### Create Task
```
POST /tasks
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Renew passport",
  "description": "Book appointment at local office",
  "due_date": "2025-05-21T00:00:00Z",
  "priority": "high",
  "category": "personal"
}
```

**Priority Values:** `low`, `medium`, `high`

**Response:** Created task object (201)

#### Update Task
```
PUT /tasks/{task_id}
Content-Type: application/json
```

**Request Body:** Same as Create Task

**Response:** Updated task object

#### Toggle Complete Status
```
POST /tasks/{task_id}/toggle-complete
```

**Response:** Updated task object

#### Delete Task
```
DELETE /tasks/{task_id}
```

**Response:**
```json
{
  "ok": true
}
```

---

### 4. Renewals

#### List Renewals
```
GET /renewals
```

Returns all renewals sorted by renewal date.

**Response:**
```json
[
  {
    "id": "renewal-uuid",
    "name": "Auto Insurance",
    "type": "insurance",
    "renewal_date": "2025-07-01T00:00:00Z",
    "amount": 1200.00,
    "currency": "USD",
    "notes": "Annual premium",
    "auto_renew": true,
    "completed": false,
    "created_at": "2025-05-07T12:34:56Z"
  }
]
```

#### Create Renewal
```
POST /renewals
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Auto Insurance",
  "type": "insurance",
  "renewal_date": "2025-07-01T00:00:00Z",
  "amount": 1200.00,
  "currency": "USD",
  "notes": "Annual premium",
  "auto_renew": true
}
```

**Type Values:** `insurance`, `domain`, `license`, `membership`, etc. (free text)

**Response:** Created renewal object (201)

#### Update Renewal
```
PUT /renewals/{renewal_id}
Content-Type: application/json
```

**Request Body:** Same as Create Renewal

**Response:** Updated renewal object

#### Toggle Complete Status
```
POST /renewals/{renewal_id}/toggle-complete
```

**Response:** Updated renewal object

#### Delete Renewal
```
DELETE /renewals/{renewal_id}
```

**Response:**
```json
{
  "ok": true
}
```

---

### 5. Documents

#### List Documents
```
GET /documents
Query Parameters:
  - category (optional): Filter by category
```

Returns all non-deleted documents sorted by creation date (newest first).

**Response:**
```json
[
  {
    "id": "doc-uuid",
    "storage_path": "life-admin/primary-user/doc-uuid.pdf",
    "original_filename": "receipt.pdf",
    "content_type": "application/pdf",
    "size": 245120,
    "category": "receipt",
    "notes": "Gas station receipt",
    "is_deleted": false,
    "created_at": "2025-05-07T12:34:56Z"
  }
]
```

#### Upload Document
```
POST /documents/upload
Content-Type: multipart/form-data
```

**Parameters:**
- `file` (required): Binary file data
- `category` (optional): Document category (default: "general")
- `notes` (optional): Additional notes

**Response:** DocumentMeta object (201)

**Max File Size:** ~25 MB

#### Download Document
```
GET /documents/{doc_id}/download
```

Returns the file with correct `Content-Type` header and `Content-Disposition`.

#### Delete Document
```
DELETE /documents/{doc_id}
```

Marks document as deleted (soft delete).

**Response:**
```json
{
  "ok": true
}
```

---

### 6. Dashboard

#### Get Dashboard Summary
```
GET /dashboard/summary
```

Returns aggregated statistics and upcoming items.

**Response:**
```json
{
  "stats": {
    "active_bills": 5,
    "overdue_bills": 1,
    "active_subscriptions": 8,
    "pending_tasks": 12,
    "upcoming_renewals": 2,
    "documents_count": 24,
    "estimated_monthly_subscription_spend": 89.97
  },
  "overdue_bills": [...],
  "upcoming_bills": [...],
  "upcoming_subscriptions": [...],
  "upcoming_tasks": [...],
  "upcoming_renewals": [...]
}
```

Each array contains up to 10 items, sorted by date.

---

### 7. Calendar

#### Get Calendar Events
```
GET /calendar
Query Parameters:
  - days (optional, default: 60): Number of days to look ahead
```

Returns all upcoming events (bills, subscriptions, tasks, renewals) grouped by date.

**Response:**
```json
{
  "events": [
    {
      "id": "bill-uuid",
      "type": "bill",
      "title": "Electricity",
      "date": "2025-05-15T00:00:00Z",
      "amount": 120.50,
      "currency": "USD",
      "status": "upcoming"
    },
    {
      "id": "task-uuid",
      "type": "task",
      "title": "Renew passport",
      "date": "2025-05-21T00:00:00Z",
      "priority": "high",
      "status": "upcoming"
    }
  ]
}
```

**Event Types:** `bill`, `subscription`, `task`, `renewal`

**Status Values:** `upcoming`, `overdue`, `paid`, `completed`

---

### 8. AI Chat

#### Send Message
```
POST /chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What's due this week?",
  "session_id": "default"
}
```

**Response:**
```json
{
  "user_message": {
    "id": "msg-uuid",
    "role": "user",
    "content": "What's due this week?",
    "created_at": "2025-05-07T12:34:56Z"
  },
  "message": {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "You have 3 items due this week: ...",
    "created_at": "2025-05-07T12:34:57Z"
  }
}
```

**Error:** 503 if EMERGENT_LLM_KEY not configured

#### Get Chat History
```
GET /chat/history
Query Parameters:
  - session_id (optional, default: "default"): Session ID
  - limit (optional, default: 100): Max messages to return
```

Returns message history for a session.

**Response:**
```json
{
  "messages": [...]
}
```

#### Clear Chat History
```
DELETE /chat/history
```

Clears all messages.

**Response:**
```json
{
  "ok": true
}
```

---

### 9. Gmail Integration

#### Get Gmail Status
```
GET /gmail/status
```

Returns Gmail connection status.

**Response:**
```json
{
  "configured": true,
  "connected": false,
  "email": null
}
```

- `configured`: Google OAuth credentials are set
- `connected`: User has authorized Atlas to access their Gmail
- `email`: User's email address (if connected)

#### Start Gmail OAuth Login
```
GET /oauth/gmail/login
Query Parameters:
  - request_origin: Frontend origin (e.g., "http://localhost:3000")
```

Returns authorization URL for user to click.

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

#### Gmail OAuth Callback
```
GET /oauth/gmail/callback
Query Parameters:
  - code: OAuth authorization code
  - state: State parameter (CSRF protection)
```

Called automatically by Google OAuth flow. Exchanges code for access token and stores it.

**Redirect:** Back to frontend with success/error

#### Disconnect Gmail
```
POST /gmail/disconnect
```

Revokes Gmail access and deletes stored credentials.

**Response:**
```json
{
  "ok": true
}
```

#### Scan Gmail for Bills/Subscriptions
```
POST /gmail/scan
Query Parameters:
  - max_results (optional, default: 20, max: 50): Number of emails to scan
```

Scans recent emails for invoices, receipts, and subscription renewals. Uses AI to extract and categorize.

**Response:**
```json
{
  "scanned": 25,
  "imported": 3,
  "items": [
    {
      "type": "bill",
      "name": "Amazon",
      "amount": 45.99,
      ...
    }
  ]
}
```

**Error:** 503 if AI not configured (EMERGENT_LLM_KEY)

---

## Example Workflows

### Workflow 1: Add a Bill and Check Dashboard

```bash
# 1. Create a bill
curl -X POST http://localhost:8000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electricity",
    "amount": 120.50,
    "currency": "USD",
    "due_date": "2025-05-15T00:00:00Z",
    "category": "utilities"
  }'

# 2. View dashboard
curl http://localhost:8000/api/dashboard/summary

# 3. Mark bill as paid
curl -X POST http://localhost:8000/api/bills/{bill_id}/toggle-paid
```

### Workflow 2: Add a Subscription and Check Monthly Cost

```bash
# 1. Add Netflix subscription
curl -X POST http://localhost:8000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Netflix",
    "amount": 15.99,
    "currency": "USD",
    "next_renewal": "2025-06-01T00:00:00Z",
    "frequency": "monthly"
  }'

# 2. Add Spotify subscription
curl -X POST http://localhost:8000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spotify",
    "amount": 9.99,
    "currency": "USD",
    "next_renewal": "2025-06-01T00:00:00Z",
    "frequency": "monthly"
  }'

# 3. Check dashboard - monthly spend will show ~$25.98
curl http://localhost:8000/api/dashboard/summary
```

### Workflow 3: Upload a Document

```bash
# Upload a PDF
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@receipt.pdf" \
  -F "category=receipt" \
  -F "notes=Gas station receipt from May 7"

# List documents
curl http://localhost:8000/api/documents

# Download document
curl -O http://localhost:8000/api/documents/{doc_id}/download
```

### Workflow 4: Chat with AI Assistant

```bash
# Send message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my monthly subscription spend?",
    "session_id": "default"
  }'

# Get chat history
curl http://localhost:8000/api/chat/history

# Clear chat
curl -X DELETE http://localhost:8000/api/chat/history
```

---

## Rate Limiting

Currently, no rate limiting is implemented. This should be added for production deployments.

## Data Models

### Bill
```python
{
  "id": str,                          # UUID
  "name": str,                        # Required
  "amount": float,                    # Required
  "currency": str,                    # Default: "USD"
  "due_date": str,                    # ISO datetime, Required
  "category": str,                    # Optional
  "notes": str,                       # Optional
  "recurring": bool,                  # Default: False
  "frequency": str,                   # Optional: weekly, monthly, quarterly, yearly
  "paid": bool,                       # Default: False
  "paid_at": str,                     # ISO datetime, Optional
  "source": str,                      # "manual" or "gmail"
  "source_email_id": str,             # Optional: Gmail message ID
  "created_at": str                   # ISO datetime
}
```

### Subscription
```python
{
  "id": str,                          # UUID
  "name": str,                        # Required
  "amount": float,                    # Required
  "currency": str,                    # Default: "USD"
  "next_renewal": str,                # ISO datetime, Required
  "frequency": str,                   # Default: "monthly"
  "category": str,                    # Default: "service"
  "notes": str,                       # Optional
  "active": bool,                     # Default: True
  "source": str,                      # "manual" or "gmail"
  "source_email_id": str,             # Optional
  "created_at": str                   # ISO datetime
}
```

### Task
```python
{
  "id": str,                          # UUID
  "title": str,                       # Required
  "description": str,                 # Optional
  "due_date": str,                    # ISO datetime, Optional
  "priority": str,                    # "low", "medium", "high"
  "category": str,                    # Default: "general"
  "completed": bool,                  # Default: False
  "completed_at": str,                # ISO datetime, Optional
  "created_at": str                   # ISO datetime
}
```

### Renewal
```python
{
  "id": str,                          # UUID
  "name": str,                        # Required
  "type": str,                        # Required: insurance, domain, license, etc
  "renewal_date": str,                # ISO datetime, Required
  "amount": float,                    # Optional
  "currency": str,                    # Default: "USD"
  "notes": str,                       # Optional
  "auto_renew": bool,                 # Default: False
  "completed": bool,                  # Default: False
  "created_at": str                   # ISO datetime
}
```

### Document
```python
{
  "id": str,                          # UUID
  "storage_path": str,                # Cloud storage path
  "original_filename": str,           # User's filename
  "content_type": str,                # MIME type
  "size": int,                        # File size in bytes
  "category": str,                    # Default: "general"
  "notes": str,                       # Optional
  "is_deleted": bool,                 # Default: False (soft delete)
  "created_at": str                   # ISO datetime
}
```

### ChatMessage
```python
{
  "id": str,                          # UUID
  "role": str,                        # "user" or "assistant"
  "content": str,                     # Message text
  "created_at": str                   # ISO datetime
}
```

---

## Notes

- All dates are in ISO 8601 format (UTC timezone)
- All monetary amounts are decimal numbers (not strings)
- The app is single-user; DEFAULT_USER_ID is always "primary-user"
- Gmail integration is optional; gracefully disabled if credentials not provided
- AI Chat requires EMERGENT_LLM_KEY to be configured
- Document storage requires EMERGENT_LLM_KEY for cloud connectivity
- Soft deletes are used for documents; hard deletes for everything else

