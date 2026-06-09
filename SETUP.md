# Atlas - Life Admin Assistant Setup Guide

## Overview
Atlas is a personal finance and life admin app with:
- **Frontend:** React 19 + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB + Claude AI
- **Features:** Bills, Subscriptions, Tasks, Renewals, Documents, Calendar, Gmail integration, AI Assistant

## Prerequisites

1. **Python 3.11+** - Backend runtime
2. **Node.js 18+** - Frontend runtime
3. **MongoDB** - Database (or Docker)
4. **Git** - Version control

## Quick Start

### Step 1: Clone & Install Dependencies

```bash
# Install backend dependencies
cd /app/backend
pip install -r requirements.txt

# Install frontend dependencies
cd /app/frontend
npm install
```

### Step 2: Setup Environment Variables

```bash
# Copy example env file to backend
cp /app/.env.example /app/backend/.env

# Edit backend/.env with your credentials
# At minimum, set:
# - MONGO_URL (required)
# - DB_NAME (required)
# - EMERGENT_LLM_KEY (optional, for AI features)
# - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (optional, for Gmail)
```

### Step 3: Start MongoDB

```bash
# Option A: Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Option B: Using system MongoDB
mongod --dbpath /data/db
```

### Step 4: Start Backend Server

```bash
cd /app/backend
python -m uvicorn server:app --reload --port 8000 --host 0.0.0.0
```

The API will be available at: `http://localhost:8000`

### Step 5: Configure Frontend

```bash
# In /app/frontend/.env, ensure:
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Step 6: Start Frontend Dev Server

```bash
cd /app/frontend
npm start
```

The app will be available at: `http://localhost:3000`

## Core Features

### 1. Bills & Invoices
- ✅ Create, edit, delete bills
- ✅ Mark as paid/unpaid
- ✅ Track due dates and amounts
- ✅ Auto-import from Gmail emails
- ✅ Category organization

### 2. Subscriptions
- ✅ Track recurring subscriptions
- ✅ Calculate monthly/annual costs
- ✅ Toggle active/inactive status
- ✅ Set renewal dates
- ✅ Auto-detect from emails

### 3. Tasks & Assignments
- ✅ Create tasks with due dates
- ✅ Set priority levels (low/medium/high)
- ✅ Mark complete/incomplete
- ✅ Filter by status

### 4. Renewals
- ✅ Track insurance, domains, licenses, memberships
- ✅ Set renewal dates
- ✅ Optional amounts for estimated costs
- ✅ Auto-renew reminders

### 5. Documents
- ✅ Upload receipts, contracts, IDs, warranties
- ✅ Organize by category
- ✅ Cloud storage integration (via Emergent)
- ✅ Download and delete

### 6. Calendar View
- ✅ 90-day unified timeline
- ✅ All events (bills, subscriptions, tasks, renewals)
- ✅ Status badges (upcoming, overdue, paid)
- ✅ Quick visual overview

### 7. AI Assistant
- ✅ Chat with Atlas about your life admin
- ✅ Ask: "What's due next week?"
- ✅ Ask: "Summarize my subscriptions"
- ✅ Powered by Claude Sonnet 4.5
- ✅ Chat history persistence

### 8. Gmail Integration
- ✅ OAuth login with Gmail
- ✅ Email scanning for bills/subscriptions
- ✅ AI-powered extraction and categorization
- ✅ Auto-import with one click

## Optional: Configure Gmail Integration

To enable Gmail scanning:

1. **Create OAuth credentials:**
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Web Application)
   - Add redirect URI: `http://localhost:8000/api/oauth/gmail/callback`

2. **Add credentials to `/app/backend/.env`:**
   ```
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   PUBLIC_BACKEND_URL=http://localhost:8000
   ```

3. **Test:**
   - Go to Settings page in the app
   - Click "Connect Gmail"
   - Authorize the app
   - Click "Scan emails" to import bills/subscriptions

## Optional: Enable AI Chat & Document Storage

To use AI Chat and Cloud Document Storage:

1. **Get Emergent API Key:**
   - Sign up at https://www.emergentagent.com/
   - Generate an API key from your dashboard

2. **Add to `/app/backend/.env`:**
   ```
   EMERGENT_LLM_KEY=sk-emergent-XXXX
   ```

3. **Test:**
   - Open the app
   - Click "Ask Atlas" button
   - Chat about your bills, subscriptions, etc.
   - Upload documents via Documents page

## Testing the Application

### Manual Testing Workflow

1. **Bills Page:**
   - Add a bill: "Electricity" due 2025-05-15, $120
   - Edit it: Change amount to $150
   - Mark as paid
   - Delete it

2. **Subscriptions Page:**
   - Add: "Netflix" $15.99/month, renews 2025-06-01
   - Check monthly cost calculation
   - Toggle inactive

3. **Tasks Page:**
   - Add task: "Pay car insurance" due 2025-05-20, high priority
   - Mark complete
   - Filter by status

4. **Renewals Page:**
   - Add renewal: "Auto Insurance" (insurance type), 2025-07-01
   - Add amount: $1,200
   - Toggle complete

5. **Documents Page:**
   - Upload a PDF or image
   - Add category (e.g., "insurance", "receipt")
   - Download it
   - Delete it

6. **Calendar Page:**
   - View all items from previous pages
   - Verify they appear on correct dates
   - Check status badges

7. **Dashboard:**
   - Verify stats update in real-time
   - Check "Overdue & due soon" section
   - Review upcoming items

8. **AI Assistant:**
   - Ask: "What's due this week?"
   - Ask: "Show me my subscriptions"
   - Ask: "Any overdue bills?"

## API Endpoints Reference

### Bills
- `GET /api/bills` - List all bills
- `POST /api/bills` - Create bill
- `PUT /api/bills/{id}` - Update bill
- `POST /api/bills/{id}/toggle-paid` - Mark paid/unpaid
- `DELETE /api/bills/{id}` - Delete bill

### Subscriptions
- `GET /api/subscriptions` - List all
- `POST /api/subscriptions` - Create
- `PUT /api/subscriptions/{id}` - Update
- `POST /api/subscriptions/{id}/toggle-active` - Toggle active
- `DELETE /api/subscriptions/{id}` - Delete

### Tasks
- `GET /api/tasks` - List all
- `POST /api/tasks` - Create
- `PUT /api/tasks/{id}` - Update
- `POST /api/tasks/{id}/toggle-complete` - Toggle complete
- `DELETE /api/tasks/{id}` - Delete

### Renewals
- `GET /api/renewals` - List all
- `POST /api/renewals` - Create
- `PUT /api/renewals/{id}` - Update
- `POST /api/renewals/{id}/toggle-complete` - Toggle complete
- `DELETE /api/renewals/{id}` - Delete

### Documents
- `GET /api/documents` - List all
- `POST /api/documents/upload` - Upload file
- `GET /api/documents/{id}/download` - Download file
- `DELETE /api/documents/{id}` - Delete file

### Dashboard & Calendar
- `GET /api/dashboard/summary` - Dashboard stats
- `GET /api/calendar` - Calendar events

### AI & Chat
- `POST /api/chat` - Send message
- `GET /api/chat/history` - Get conversation history
- `DELETE /api/chat/history` - Clear history

### Gmail
- `GET /api/gmail/status` - Check Gmail connection status
- `GET /api/oauth/gmail/login` - Start OAuth login
- `GET /api/oauth/gmail/callback` - OAuth callback
- `POST /api/gmail/disconnect` - Disconnect Gmail
- `POST /api/gmail/scan` - Scan emails for bills/subscriptions

## Troubleshooting

### MongoDB Connection Failed
```
Error: Could not connect to MongoDB
```
**Solution:** Ensure MongoDB is running
```bash
# Check MongoDB status
mongo --eval "db.version()"

# If not running, start it:
docker run -d -p 27017:27017 mongo:7.0
```

### Port Already in Use
```
Error: Address already in use
```
**Solution:** Change port or kill process
```bash
# Backend (port 8000)
lsof -i :8000
kill -9 <PID>

# Frontend (port 3000)
lsof -i :3000
kill -9 <PID>
```

### Frontend Can't Connect to Backend
```
Error: Network Error / API unreachable
```
**Solution:** Check REACT_APP_BACKEND_URL
```bash
# In /app/frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8000

# Then restart: npm start
```

### Gmail Integration Not Working
```
Error: Gmail OAuth not configured
```
**Solution:** Set Google credentials in backend/.env
```bash
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
PUBLIC_BACKEND_URL=http://localhost:8000
```

## Deployment

### Production Build - Frontend

```bash
cd /app/frontend
npm run build

# Output: build/ folder ready for hosting
# Deploy to Vercel, Netlify, S3 + CloudFront, etc.
```

### Production Build - Backend

```bash
cd /app/backend

# Set production environment variables
export MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dbname
export EMERGENT_LLM_KEY=sk-emergent-XXXX
export GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=xxx
export PUBLIC_BACKEND_URL=https://api.yourdomain.com
export PUBLIC_FRONTEND_URL=https://yourdomain.com

# Start with production ASGI server
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

### Using Docker

```dockerfile
# Dockerfile (example)
FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/server.py .
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Support & Documentation

- **Frontend Components:** `/app/frontend/src/components/`
- **Pages:** `/app/frontend/src/pages/`
- **API Models:** Backend Pydantic models in `server.py`
- **Design System:** See `design_guidelines.json`

## Project Statistics

- **Frontend:** 2,500+ LOC (8 pages, 40+ components)
- **Backend:** 1,200+ LOC (30+ endpoints, 8 models)
- **Database:** 8 collections (bills, subscriptions, tasks, renewals, documents, chat, oauth, gmail_tokens)
- **API:** RESTful with JSON request/response
- **UI Components:** 50+ Shadcn/Radix components

## Next Steps

1. ✅ Complete setup following this guide
2. ✅ Run manual tests from "Testing" section
3. ✅ Configure optional integrations (Gmail, Emergent)
4. ✅ Deploy to production
5. ✅ Monitor error logs
6. ✅ Gather user feedback
7. ✅ Plan v2 features

---

**Atlas** - Built with ❤️ for a calmer, more organized life.
