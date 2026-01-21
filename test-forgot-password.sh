#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       FORGOT PASSWORD FEATURE - VERIFICATION TESTS           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Testing Application Routes..."
echo ""

# Test 1: Login page accessibility
echo -n "1. Testing Login Page... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login | grep -q "200"; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 2: Reset password page accessibility
echo -n "2. Testing Reset Password Page... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/reset-password | grep -q "200"; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 3: Check for forgot password text in login page
echo -n "3. Checking Forgot Password Link Exists... "
if curl -s http://localhost:3000/login | grep -q "Forgot your password"; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 4: Check for reset password heading
echo -n "4. Checking Reset Password Page Content... "
if curl -s http://localhost:3000/reset-password | grep -q "Reset Your Password"; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 5: Check middleware allows reset-password
echo -n "5. Testing Middleware Configuration... "
if grep -q "reset-password" middleware.ts; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 6: Check login.tsx has forgot password state
echo -n "6. Checking Forgot Password State Management... "
if grep -q "isForgotPassword" pages/login.tsx; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 7: Check for password reset email function
echo -n "7. Checking Password Reset Email Function... "
if grep -q "resetPasswordForEmail" pages/login.tsx; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 8: Check for password confirmation in reset page
echo -n "8. Checking Password Confirmation Field... "
if grep -q "confirmPassword" pages/reset-password.tsx; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 9: Check build exists
echo -n "9. Verifying Production Build... "
if [ -d ".next/static" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Test 10: Check for success message handling
echo -n "10. Checking Success Message Display... "
if grep -q "resetSent" pages/login.tsx; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION COMPLETE                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}📝 Manual Testing Steps:${NC}"
echo "   1. Open http://localhost:3000/login"
echo "   2. Click 'Forgot your password?' link"
echo "   3. Enter email and click 'Send reset link'"
echo "   4. Check email inbox for reset link"
echo "   5. Click reset link or go to /reset-password"
echo "   6. Enter new password twice and submit"
echo "   7. Verify redirect to login page"
echo ""
echo -e "${GREEN}✨ All automated tests completed!${NC}"
echo ""
