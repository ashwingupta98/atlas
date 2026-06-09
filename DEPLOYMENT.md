# Atlas - Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Build](#production-build)
3. [Deployment Options](#deployment-options)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedure](#rollback-procedure)

## Pre-Deployment Checklist

### Code & Testing
- [ ] All tests passing locally
- [ ] No console errors in browser dev tools
- [ ] No unhandled API errors
- [ ] All pages render correctly
- [ ] Gmail integration tested (if enabled)
- [ ] AI Chat tested (if enabled)
- [ ] Documents upload/download tested
- [ ] Responsive design verified on mobile/tablet/desktop

### Configuration
- [ ] Production MongoDB connection string ready
- [ ] EMERGENT_LLM_KEY obtained (if using AI)
- [ ] Google OAuth credentials created (if using Gmail)
- [ ] CORS origins configured correctly
- [ ] Backend and frontend URLs finalized
- [ ] SSL/HTTPS certificates ready

### Database
- [ ] MongoDB replica set configured (recommended for production)
- [ ] Database backups scheduled
- [ ] Indexes created on key fields
- [ ] Retention policy defined

### Security
- [ ] API rate limiting configured
- [ ] Input validation reviewed
- [ ] CORS properly restricted
- [ ] Secrets not committed to git
- [ ] Environment variables secured (AWS Secrets Manager, Vault, etc.)

---

## Production Build

### Frontend Build

```bash
cd /app/frontend

# Install dependencies (if not already done)
npm install

# Create optimized production build
npm run build

# Output: /app/frontend/build/ directory
```

**Build Details:**
- Minified JavaScript and CSS
- Source maps (optional, consider security implications)
- Asset hashing for cache busting
- Tree-shaking to remove unused code
- Optimized images and media

**Build Size:** ~300-400 KB gzipped

### Backend Build

The backend doesn't require a "build" step, but should be packaged with dependencies:

```bash
cd /app/backend

# Create requirements snapshot (lock dependencies)
pip freeze > requirements-lock.txt

# This ensures exact versions are installed in production
```

**Docker Build (Recommended):**

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY server.py .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api')"

# Run with production ASGI server
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

---

## Deployment Options

### Option 1: Traditional VPS (AWS EC2, DigitalOcean, Linode)

#### Prerequisites
- Ubuntu 22.04 LTS or similar
- Python 3.11+, Node.js 18+, MongoDB
- Nginx or Apache as reverse proxy

#### Deployment Steps

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/yourusername/atlas.git
cd atlas

# 3. Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Setup frontend
cd ../frontend
npm install
npm run build

# 5. Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/atlas

# 6. Create Nginx config:
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Proxy to FastAPI backend
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Serve frontend
    root /home/user/atlas/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 7. Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 8. Setup SSL with Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# 9. Create systemd service for backend
sudo nano /etc/systemd/system/atlas-backend.service
```

**Systemd Service:**
```ini
[Unit]
Description=Atlas Backend Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/home/user/atlas/backend
Environment="PYTHONUNBUFFERED=1"
Environment="MONGO_URL=mongodb://localhost:27017"
Environment="DB_NAME=atlas"
Environment="EMERGENT_LLM_KEY=sk-emergent-XXXX"
Environment="GOOGLE_CLIENT_ID=XXXX"
Environment="GOOGLE_CLIENT_SECRET=XXXX"
ExecStart=/home/user/atlas/backend/venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 10. Start backend service
sudo systemctl enable atlas-backend
sudo systemctl start atlas-backend
sudo systemctl status atlas-backend

# 11. Verify deployment
curl https://api.yourdomain.com/api
curl https://yourdomain.com
```

### Option 2: Docker + Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: atlas-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: atlas-backend
    ports:
      - "8000:8000"
    environment:
      MONGO_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017
      DB_NAME: atlas
      EMERGENT_LLM_KEY: ${EMERGENT_LLM_KEY}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      PUBLIC_BACKEND_URL: ${PUBLIC_BACKEND_URL}
      PUBLIC_FRONTEND_URL: ${PUBLIC_FRONTEND_URL}
      CORS_ORIGINS: ${CORS_ORIGINS}
    depends_on:
      - mongodb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: atlas-frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_BACKEND_URL: ${PUBLIC_BACKEND_URL}
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: atlas-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  mongo-data:
```

**Deployment:**
```bash
# Create .env file with production values
cp .env.example .env.production
nano .env.production

# Build and start all services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Serverless (AWS Lambda + API Gateway)

**Challenges:**
- Requires modification of FastAPI app for Lambda compatibility
- MongoDB must be accessible from Lambda VPC
- Cold starts may cause latency
- 15-minute timeout limit

**Not recommended for this application** due to long-running processes and external service dependencies.

### Option 4: Heroku

```bash
# 1. Create Heroku app
heroku create atlas-app

# 2. Add MongoDB add-on
heroku addons:create mongolab:sandbox

# 3. Set environment variables
heroku config:set EMERGENT_LLM_KEY=sk-emergent-XXXX
heroku config:set GOOGLE_CLIENT_ID=XXXX
heroku config:set GOOGLE_CLIENT_SECRET=XXXX

# 4. Deploy
git push heroku main

# 5. Monitor
heroku logs --tail
```

**Note:** Free tier is limited; consider paid dyos for production.

### Option 5: Vercel (Frontend Only) + Managed Backend

Vercel for frontend (recommended):
```bash
# Deploy frontend
vercel deploy --prod
```

Backend: Use any option above (VPS, Docker, AWS, etc.)

---

## Environment Configuration

### Production Environment Variables

**Backend (.env or environment variables):**
```bash
# Database
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/atlas
DB_NAME=atlas

# API Configuration
PUBLIC_BACKEND_URL=https://api.yourdomain.com
PUBLIC_FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# External Services
EMERGENT_LLM_KEY=sk-emergent-XXXXXXXXXXXX
GOOGLE_CLIENT_ID=XXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=XXXX

# App Configuration
APP_NAME=atlas
```

**Frontend (.env.production or build config):**
```bash
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

### Using AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name atlas/prod/backend \
  --secret-string '{"EMERGENT_LLM_KEY":"sk-emergent-XXXX",...}'

# Retrieve in application
import boto3
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='atlas/prod/backend')
```

---

## Monitoring & Logging

### Application Logging

**Backend:**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/atlas.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.info("Application started")
```

### Performance Monitoring

**Using Sentry for error tracking:**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="https://your-sentry-dsn@sentry.io/project-id",
    integrations=[FastApiIntegration()]
)
```

### Uptime Monitoring

Use services like:
- Better Stack
- UptimeRobot
- Datadog
- New Relic

Example with UptimeRobot:
```
Monitor: https://api.yourdomain.com/api
Interval: 5 minutes
Alert on failure
```

### Database Monitoring

**MongoDB Atlas Cloud:**
- Built-in monitoring dashboard
- Performance Advisor
- Automated backups
- Alerts

**Self-hosted MongoDB:**
```bash
# Enable profiling
db.setProfilingLevel(1, {slowms: 100})

# Monitor slow queries
db.system.profile.find().limit(5).sort({ts: -1}).pretty()
```

---

## Troubleshooting

### Backend Won't Start

**Error: `Address already in use`**
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

**Error: `MongoDB connection failed`**
```bash
# Check MongoDB is running
mongosh
# If not, start MongoDB or Docker container
```

**Error: `EMERGENT_LLM_KEY not found`**
```bash
# Ensure environment variable is set
export EMERGENT_LLM_KEY=sk-emergent-XXXX
# Or add to .env file
```

### Frontend Won't Load

**Error: `Cannot connect to backend`**
- Check REACT_APP_BACKEND_URL is correct
- Verify backend is running
- Check CORS configuration

**Error: `Blank page`**
- Check browser console for errors
- Verify build was successful
- Check HTML file is being served

### Database Issues

**MongoDB quota exceeded:**
- Delete old test data
- Implement data retention policy
- Upgrade MongoDB plan

**High memory usage:**
- Add indexes to frequently queried fields
- Implement pagination
- Archive old data

---

## Rollback Procedure

### Quick Rollback

```bash
# Rollback previous Docker image
docker-compose down
docker pull atlas-backend:previous-version
docker-compose up -d

# Or restore from git
git revert <commit-hash>
git push
```

### Database Rollback

```bash
# Restore from backup
mongorestore --uri "mongodb://localhost:27017" --archive /backups/atlas-backup.archive

# Or use MongoDB Atlas point-in-time restore
```

### Monitoring During Rollback

```bash
# Watch logs
docker-compose logs -f backend

# Health check
curl https://api.yourdomain.com/api

# Verify data
curl https://api.yourdomain.com/api/dashboard/summary
```

---

## Performance Optimization

### Database Indexes

```javascript
// Create indexes for common queries
db.bills.createIndex({due_date: 1})
db.subscriptions.createIndex({next_renewal: 1})
db.tasks.createIndex({due_date: 1, completed: 1})
db.renewals.createIndex({renewal_date: 1})
db.documents.createIndex({created_at: -1})
```

### Caching Strategy

```python
from functools import lru_cache
import asyncio

@lru_cache(maxsize=128)
async def get_dashboard_summary():
    # Cache for 5 minutes
    return dashboard_data

# Consider Redis for distributed caching
```

### API Response Compression

```python
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

### Frontend Optimization

```bash
# Analyze bundle size
npm run build -- --analyze

# Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'))

# Optimize images
npm install -D sharp
```

---

## Backup Strategy

### MongoDB Backups

```bash
# Manual backup
mongodump --uri "mongodb://localhost:27017" --out /backups/atlas-$(date +%Y%m%d)

# Automated daily backups (cron job)
0 2 * * * mongodump --uri "mongodb://localhost:27017" --out /backups/atlas-$(date +\%Y\%m\%d)

# Archive to S3
aws s3 cp /backups/atlas-20250507.archive s3://my-bucket/backups/
```

### Document Backups

```bash
# Download all documents
aws s3 sync s3://emergent-storage/atlas/ ./backups/documents/

# Or use Emergent API to export
```

---

## Maintenance Windows

### Planned Downtime

1. Announce to users 24 hours before
2. Backup all data
3. Update dependencies
4. Deploy changes
5. Run smoke tests
6. Monitor for issues
7. Update status page

**Recommended:** Saturday 2-4 AM UTC (off-peak)

---

## Security Hardening

### Input Validation
- ✅ Pydantic models for request validation
- ✅ File upload size limits (25 MB)
- ✅ Content-type validation

### API Security
- [ ] Add rate limiting (use FastAPI middleware)
- [ ] Implement request signing
- [ ] Add API key authentication (if multi-tenant)
- [ ] Enable CORS restriction

### Database Security
- ✅ MongoDB requires auth
- [ ] Use encryption at rest
- [ ] Enable encryption in transit (TLS)
- [ ] Restrict network access

### Infrastructure
- ✅ Use HTTPS/TLS certificates
- ✅ Firewall rules
- ✅ SSH key-based auth only
- ✅ Regular security updates

---

## Support & Escalation

**If issues arise during deployment:**

1. Check application logs
2. Verify environment variables
3. Test API endpoints manually
4. Check database connectivity
5. Monitor resource usage
6. Review recent changes in git

**Escalation:**
- Production down → Immediate attention
- Feature broken → 1-hour SLA
- Performance degraded → 4-hour SLA

---

**Deployment Version:** 1.0
**Last Updated:** May 7, 2026
**Status:** Ready for Production

