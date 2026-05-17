#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# AI AGENT API - CLOUDFLARE SETUP SCRIPT
# Automates the setup of D1, KV, and deployment
# ═══════════════════════════════════════════════════════════════

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  AI AGENT API - Cloudflare Workers Setup                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please login to Cloudflare:"
    wrangler login
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Creating D1 Database..."
DB_OUTPUT=$(wrangler d1 create agent-db 2>&1 || true)

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$DB_ID" ]; then
    echo "⚠️  Database may already exist. Trying to get existing ID..."
    DB_ID=$(wrangler d1 list --json | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const db=JSON.parse(s).find(d=>d.name==='agent-db'); if (db) console.log(db.uuid || db.id);})" || echo "")
fi

if [ -z "$DB_ID" ]; then
    echo "❌ Could not get database ID. Please create manually:"
    echo "   wrangler d1 list --json"
    exit 1
fi

echo "✅ Database ID: $DB_ID"

echo ""
echo "📦 Creating KV Namespaces..."

# Create Sessions KV
SESSIONS_OUTPUT=$(wrangler kv namespace create SESSIONS 2>&1 || true)
SESSIONS_ID=$(echo "$SESSIONS_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$SESSIONS_ID" ]; then
    echo "⚠️  Sessions KV may already exist. Trying to get existing ID..."
    SESSIONS_ID=$(wrangler kv namespace list | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const ns=JSON.parse(s).find(n=>n.title==='agent-api-SESSIONS' || n.title==='SESSIONS'); if (ns) console.log(ns.id);})" || echo "")
fi

echo "✅ Sessions KV ID: $SESSIONS_ID"

# Create Rate Limits KV
RATE_OUTPUT=$(wrangler kv namespace create RATE_LIMITS 2>&1 || true)
RATE_ID=$(echo "$RATE_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$RATE_ID" ]; then
    echo "⚠️  Rate Limits KV may already exist. Trying to get existing ID..."
    RATE_ID=$(wrangler kv namespace list | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const ns=JSON.parse(s).find(n=>n.title==='agent-api-RATE_LIMITS' || n.title==='RATE_LIMITS'); if (ns) console.log(ns.id);})" || echo "")
fi

echo "✅ Rate Limits KV ID: $RATE_ID"

echo ""
echo "📝 Updating wrangler.toml..."

# Update wrangler.toml with actual IDs
if [ -n "$DB_ID" ]; then
    sed -i.bak "s/YOUR_DATABASE_ID_HERE/$DB_ID/g" wrangler.toml
fi

if [ -n "$SESSIONS_ID" ]; then
    sed -i.bak "s/YOUR_KV_ID_HERE/$SESSIONS_ID/g" wrangler.toml
fi

if [ -n "$RATE_ID" ]; then
    sed -i.bak "s/YOUR_RATE_LIMIT_KV_ID_HERE/$RATE_ID/g" wrangler.toml
fi

rm -f wrangler.toml.bak

echo "✅ wrangler.toml updated"

echo ""
echo "🗃️  Running database migration..."
wrangler d1 execute agent-db --remote --file=./schema.sql

echo ""
echo "🔑 Setting up secrets..."
echo "Please enter your Crossmint Server-side API Key:"
wrangler secret put CROSSMINT_SERVERSIDE_API_KEY

echo ""
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETE!                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Your API is now live at:"
echo "  https://agent-api.<YOUR_SUBDOMAIN>.workers.dev"
echo ""
echo "Test it with:"
echo "  curl https://agent-api.<YOUR_SUBDOMAIN>.workers.dev/health"
echo ""
echo "Register an agent:"
echo "  curl -X POST https://agent-api.<YOUR_SUBDOMAIN>.workers.dev/api/agents/register \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"name\": \"My Trading Bot\"}'"
echo ""
