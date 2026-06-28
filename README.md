# UGX PNL Production Site

This repository is the clean source of truth for the UGX PNL Hostinger site.

## What To Upload

For the existing live site, upload:

`deployment/ugxpnl-production-live.zip`

Extract it directly into Hostinger `public_html`.

## Important

Do not delete or overwrite these server-only files if they exist on Hostinger:

- `public_html/api/db_config.php`
- `public_html/api/ghl_config.php`
- `public_html/config/config.php`
- `public_html/uploads/`

Phone-saved jobs live in the phone browser's local storage until they are published to the server. They are not stored in this repo.

## Final Live Checks

After upload:

- `https://ugxpnls.com/login.html`
- `https://ugxpnls.com/api/health.php`
- `https://ugxpnls.com/api/ghl.php?action=status`
- `https://ugxpnls.com/api/automation.php?action=status`
- `https://ugxpnls.com/api/mcp.php`

The GHL/MCP URLs may return `401` or `503` until server tokens are configured, but they should not return `404`.

## Required Server Tokens

Set these in Hostinger environment variables or `public_html/api/ghl_config.php`:

- `GHL_ACCESS_TOKEN`
- `GHL_LOCATION_ID`
- `UGX_MCP_BEARER_TOKEN`

Optional for opportunity sync:

- `GHL_PIPELINE_ID`
- `GHL_PIPELINE_STAGE_ID`
- `GHL_USER_ID`

Keep all tokens server-side only.

