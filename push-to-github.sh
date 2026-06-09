#!/bin/bash
# Push Atlas to GitHub

set -e

echo "🚀 Pushing Atlas to GitHub..."
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✓ Git initialized"
else
    echo "✓ Git repository already initialized"
fi

# Configure git (if needed)
git config user.email "dev@atlas-app.com" 2>/dev/null || true
git config user.name "Atlas Bot" 2>/dev/null || true

# Add all files
echo ""
echo "📝 Adding files to staging..."
git add -A
echo "✓ Files added"

# Check for changes
if git diff --cached --quiet; then
    echo "⚠️  No changes to commit"
    exit 0
fi

# Commit
echo ""
echo "💾 Creating commit..."
git commit -m "feat: Atlas v1.0 - Complete personal finance & life admin app

- ✅ 8 pages: Dashboard, Bills, Subscriptions, Tasks, Renewals, Documents, Calendar, Settings
- ✅ 30+ REST API endpoints with full CRUD operations
- ✅ AI Assistant powered by Claude Sonnet 4.5
- ✅ Gmail OAuth integration with email scanning
- ✅ Cloud document storage
- ✅ Responsive design with organic & earthy theme
- ✅ Comprehensive API documentation
- ✅ Full deployment guides (VPS, Docker, Heroku, etc.)
- ✅ Test plan with 80+ test scenarios

Tech Stack:
- Frontend: React 19 + Tailwind CSS + Shadcn/Radix
- Backend: FastAPI + MongoDB + Claude AI
- Deployment: Docker, VPS, Heroku ready

See README.md and docs/ for complete documentation."

echo "✓ Changes committed"

# Add remote
echo ""
echo "🔗 Setting up GitHub remote..."
REMOTE_URL="https://github.com/ashwingupta98/atlas.git"

# Check if remote exists
if git remote | grep -q origin; then
    echo "  Updating existing remote..."
    git remote set-url origin "$REMOTE_URL"
else
    echo "  Adding new remote..."
    git remote add origin "$REMOTE_URL"
fi

echo "✓ Remote configured: $REMOTE_URL"

# Show branch
BRANCH=$(git branch --show-current)
echo ""
echo "📌 Current branch: $BRANCH"

# Push
echo ""
echo "📤 Pushing to GitHub..."
git push -u origin "$BRANCH" --force-with-lease

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Repository: https://github.com/ashwingupta98/atlas"
echo "Branch: $BRANCH"
echo ""
echo "Next steps:"
echo "1. Visit https://github.com/ashwingupta98/atlas"
echo "2. Configure repository settings"
echo "3. Add branch protection rules (if desired)"
echo "4. Setup GitHub Pages or CI/CD"
echo ""
