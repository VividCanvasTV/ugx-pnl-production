#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
zip_path="$repo_root/deployment/ugxpnl-production-live.zip"

rm -f "$zip_path"
(cd "$repo_root/public_html" && zip -r "$zip_path" .)

echo "Built $zip_path"

