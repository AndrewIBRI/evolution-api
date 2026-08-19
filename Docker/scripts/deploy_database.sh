#!/bin/bash

source ./Docker/scripts/env_functions.sh

# After merge_env.js the file has example defaults plus injected overlays.
if [ -f .env ]; then
    export_env_vars
elif [ "$DOCKER_ENV" != "true" ]; then
    echo ".env file not found"
    exit 1
fi

if [[ "$DATABASE_PROVIDER" == "postgresql" || "$DATABASE_PROVIDER" == "mysql" || "$DATABASE_PROVIDER" == "psql_bouncer" ]]; then
    # Prisma 7 (prisma.config.ts) reads DATABASE_CONNECTION_URI.
    # Orchestrators like Easypanel often inject DATABASE_URL when linking Postgres.
    if [ -z "$DATABASE_CONNECTION_URI" ] && [ -n "$DATABASE_URL" ]; then
        export DATABASE_CONNECTION_URI="$DATABASE_URL"
    fi
    if [ -z "$DATABASE_URL" ] && [ -n "$DATABASE_CONNECTION_URI" ]; then
        export DATABASE_URL="$DATABASE_CONNECTION_URI"
    fi
    echo "Deploying migrations for $DATABASE_PROVIDER"
    echo "Database URL: ${DATABASE_CONNECTION_URI:-$DATABASE_URL}"
    # rm -rf ./prisma/migrations
    # cp -r ./prisma/$DATABASE_PROVIDER-migrations ./prisma/migrations
    npm run db:deploy
    if [ $? -ne 0 ]; then
        echo "Migration failed"
        exit 1
    else
        echo "Migration succeeded"
    fi
    npm run db:generate
    if [ $? -ne 0 ]; then
        echo "Prisma generate failed"
        exit 1
    else
        echo "Prisma generate succeeded"
    fi
else
    echo "Error: Database provider $DATABASE_PROVIDER invalid."
    exit 1
fi
