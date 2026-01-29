#!/bin/bash
# Start Email Warmup System with Quota Fix Applied
#
# This script starts the application with the quota counting fix:
# - Auto-replies (REPLIED status) are now excluded from daily quota
# - Only outgoing warmup emails (SENT status) count against limit
# - Fixed case sensitivity issue in status checks
#
# Usage:
#   ./start-warmup-fixed.sh
#

echo "================================================================"
echo " Email Warmup System - Production Start (Quota Fix Applied)"
echo "================================================================"
echo ""
echo "✅ Quota Fix Applied:"
echo "   - Auto-replies (REPLIED) excluded from quota counting"
echo "   - Only warmup sends (SENT) count against daily limit"
echo "   - Fixed case sensitivity in status checks"
echo ""
echo "📋 To manually start warmup after app starts:"
echo "   POST /api/warmup/trigger (admin access required)"
echo ""
echo "================================================================"
echo ""

cd /home/harekrishna/Projects/email-warmup

# Start Next.js in production mode
NODE_ENV=production pnpm start
