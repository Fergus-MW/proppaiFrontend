#!/bin/bash
# Debug script for Cloud Build environment variables

# Make script executable before using:
# chmod +x debug-env.sh

# Add this to your cloudbuild.yaml as a step to debug environment variables:
# - name: 'bash'
#   entrypoint: 'bash'
#   args:
#     - './debug-env.sh'
#   env:
#     - 'NEXT_PUBLIC_API_URL=${_BACKEND_URL}'
#     - 'NODE_ENV=${_NODE_ENV}'
#     - 'NEXT_PUBLIC_POSTHOG_KEY=${_POSTHOG_KEY}'
#     - 'NEXT_PUBLIC_POSTHOG_URL=${_POSTHOG_URL}'

echo "===== ENVIRONMENT VARIABLE DEBUG ====="
echo "Date: $(date)"
echo

echo "--- Cloud Build Variables ---"
echo "PROJECT_ID: ${PROJECT_ID}"
echo "BRANCH_NAME: ${BRANCH_NAME}"
echo "COMMIT_SHA: ${COMMIT_SHA}"
echo "SHORT_SHA: ${SHORT_SHA}"
echo

echo "--- Next.js Environment Variables ---"
echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}"
echo "NODE_ENV: ${NODE_ENV}"
echo "NEXT_PUBLIC_POSTHOG_KEY: ${NEXT_PUBLIC_POSTHOG_KEY}"
echo "NEXT_PUBLIC_POSTHOG_URL: ${NEXT_PUBLIC_POSTHOG_URL}"
echo

echo "===== END DEBUG ====="

# If you want to check if variables are available in the produced container,
# add this to your Dockerfile's CMD to debug runtime variables:
# CMD echo "RUNTIME NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL" && node server.js 