#!/usr/bin/env bash
# Applies all migrations to a throwaway database on a plain PostgreSQL server
# (with a Supabase stub for auth/storage) and runs the isolation test suite.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres scripts/db-test.sh
set -euo pipefail
cd "$(dirname "$0")/../supabase"
DB="cheffedata_test_$$"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f tests/supabase_stub.sql 2>/dev/null
for f in migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
psql -v ON_ERROR_STOP=1 -q -tA -o /dev/null -d "$DB" -f tests/rls_test.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //"
echo "ALL TESTS PASSED"
