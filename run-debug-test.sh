#!/bin/bash
cd /Users/eric/dev/learning/ai-is-coming/agents-frontend-tpl
npx playwright test tests/e2e/debug-overflow.spec.ts --reporter=list
cat test-results/debug-overflow.log 2>/dev/null || echo "No log file found"

