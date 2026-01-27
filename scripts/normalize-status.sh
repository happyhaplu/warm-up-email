#!/bin/bash

# Script to apply the status normalization migration

echo "🔄 Normalizing log status values..."
echo "=================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL to your database connection string"
  exit 1
fi

# Apply the migration
echo "📝 Applying migration: normalize-log-status.sql"
psql "$DATABASE_URL" -f migrations/normalize-log-status.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Status values have been normalized:"
  echo "  - 'sent' → 'SENT'"
  echo "  - 'replied' → 'REPLIED'"
  echo "  - 'failed' → 'FAILED'"
  echo ""
  echo "A check constraint has been added to enforce uppercase values."
else
  echo ""
  echo "❌ Migration failed!"
  echo "Please check the error messages above."
  exit 1
fi
