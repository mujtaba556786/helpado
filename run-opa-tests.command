#!/bin/bash
# Helpado — OPA5 Integration Test Launcher
# Double-click this file to start the dev server and open tests in Chrome.

cd "$(dirname "$0")/frontend"

echo "============================================"
echo "  Helpado OPA5 Integration Test Launcher"
echo "============================================"
echo ""
echo "Starting UI5 dev server on port 8080..."
echo "Test URL: http://localhost:8080/test/integration/opaTests.qunit.html"
echo ""

# Open the test URL in Chrome after a short delay
(sleep 6 && open -a "Google Chrome" "http://localhost:8080/test/integration/opaTests.qunit.html") &

# Start the server (blocks until killed)
npm run int-test
