#!/usr/bin/env bash
set -euo pipefail

osv-scanner scan source \
  --config osv-scanner.toml \
  --recursive \
  --format json \
  --output-file osv-results.json \
  .

echo "Scan complete. Results written to osv-results.json"
