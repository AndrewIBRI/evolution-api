#!/bin/bash
set -e

cd /evolution

# Build .env from .env.example, overlaying non-empty vars injected by the orchestrator.
node ./Docker/scripts/merge_env.js

source ./Docker/scripts/env_functions.sh
export_env_vars

./Docker/scripts/deploy_database.sh

exec npm run start:prod
