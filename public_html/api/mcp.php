<?php
declare(strict_types=1);

require_once __DIR__ . '/automation_core.php';

automation_enable_cors();
header('MCP-Protocol-Version: 2025-06-18');

$cfg = ghl_config();
automation_require_bearer($cfg);
$pdo = get_pdo();

function mcp_tool_definitions(): array {
    return [
        [
            'name' => 'ugx_highlevel_status',
            'description' => 'First tool to call. Checks whether UGX PNL is configured for HighLevel sync, whether automation auth is active, and what workflow rules must be followed. Does not expose secrets.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => new stdClass(),
                'additionalProperties' => false,
            ],
        ],
        [
            'name' => 'ugx_list_recent_jobs',
            'description' => 'List recent saved UGX PNL jobs so an automation can choose a jobId before previewing or syncing. Includes existing HighLevel IDs so the AI can avoid duplicate estimates.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'limit' => [
                        'type' => 'integer',
                        'minimum' => 1,
                        'maximum' => 25,
                        'description' => 'Maximum jobs to return.',
                    ],
                ],
                'additionalProperties' => false,
            ],
        ],
        [
            'name' => 'ugx_get_job',
            'description' => 'Fetch one saved UGX PNL job by jobId, including estimate settings, client estimate fields, existing HighLevel IDs, and sync memory.',
            'inputSchema' => [
                'type' => 'object',
                'required' => ['jobId'],
                'properties' => [
                    'jobId' => [
                        'type' => 'string',
                        'description' => 'UGX PNL saved job id.',
                    ],
                ],
                'additionalProperties' => false,
            ],
        ],
        [
            'name' => 'ugx_preview_estimate',
            'description' => 'Required before syncing. Builds and validates HighLevel contact, estimate, and opportunity payloads without writing to HighLevel. If missing is not empty, ask the user for those fields before syncing.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'jobId' => [
                        'type' => 'string',
                        'description' => 'Saved UGX PNL job id. Use this when the estimate is already saved.',
                    ],
                    'job' => [
                        'type' => 'object',
                        'description' => 'Full UGX PNL job payload when no saved jobId exists.',
                    ],
                ],
                'additionalProperties' => false,
            ],
        ],
        [
            'name' => 'ugx_sync_estimate_to_highlevel',
            'description' => 'Write action. Only call after ugx_preview_estimate returns no missing fields and the user intent is clear. Creates/updates the HighLevel contact, creates the estimate, optionally upserts the opportunity, and stores returned HighLevel IDs on the UGX PNL job. If the job already has a HighLevel estimate ID, returns alreadySynced unless forceSync is true.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'jobId' => [
                        'type' => 'string',
                        'description' => 'Saved UGX PNL job id. Preferred because returned HighLevel IDs can be stored on the job.',
                    ],
                    'job' => [
                        'type' => 'object',
                        'description' => 'Full UGX PNL job payload. Use only when the job is not saved yet.',
                    ],
                    'forceSync' => [
                        'type' => 'boolean',
                        'description' => 'Default false. Set true only when a human explicitly asks to create a new HighLevel estimate even though the job already has an estimateId.',
                    ],
                ],
                'additionalProperties' => false,
            ],
        ],
    ];
}

function mcp_array_is_list(array $value): bool {
    if ($value === []) {
        return true;
    }
    return array_keys($value) === range(0, count($value) - 1);
}

function mcp_json_response($id, array $result): array {
    return ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result];
}

function mcp_json_error($id, int $code, string $message, array $data = []): array {
    $error = ['code' => $code, 'message' => $message];
    if ($data) {
        $error['data'] = $data;
    }
    return ['jsonrpc' => '2.0', 'id' => $id, 'error' => $error];
}

function mcp_tool_result(array $data, bool $isError = false): array {
    return [
        'content' => [
            [
                'type' => 'text',
                'text' => json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            ],
        ],
        'structuredContent' => $data,
        'isError' => $isError,
    ];
}

function mcp_action_for_tool(string $name): string {
    $map = [
        'ugx_highlevel_status' => 'status',
        'ugx_list_recent_jobs' => 'list_recent_jobs',
        'ugx_get_job' => 'get_job',
        'ugx_preview_estimate' => 'preview_estimate',
        'ugx_sync_estimate_to_highlevel' => 'sync_estimate_to_highlevel',
    ];
    if (!isset($map[$name])) {
        throw new InvalidArgumentException('Unknown tool: ' . $name);
    }
    return $map[$name];
}

function mcp_handle_request(array $request, PDO $pdo, array $cfg): ?array {
    $id = array_key_exists('id', $request) ? $request['id'] : null;
    $method = (string)($request['method'] ?? '');
    $params = isset($request['params']) && is_array($request['params']) ? $request['params'] : [];

    if ($method === 'notifications/initialized') {
        return null;
    }

    try {
        switch ($method) {
            case 'initialize':
                return mcp_json_response($id, [
                    'protocolVersion' => '2025-06-18',
                    'capabilities' => [
                        'tools' => ['listChanged' => false],
                    ],
                    'serverInfo' => [
                        'name' => 'ugx-pnl-highlevel',
                        'version' => '1.0.0',
                    ],
                    'instructions' => 'Handshake rules: call ugx_highlevel_status first, use ugx_list_recent_jobs or ugx_get_job to identify the saved job, always call ugx_preview_estimate before the write tool, never call ugx_sync_estimate_to_highlevel when preview.missing is not empty, and never set forceSync=true unless the human explicitly requests a new duplicate HighLevel estimate.',
                ]);

            case 'ping':
                return mcp_json_response($id, ['ok' => true]);

            case 'tools/list':
                return mcp_json_response($id, ['tools' => mcp_tool_definitions()]);

            case 'tools/call':
                $toolName = (string)($params['name'] ?? '');
                $args = isset($params['arguments']) && is_array($params['arguments']) ? $params['arguments'] : [];
                $result = automation_run_action(mcp_action_for_tool($toolName), $args, $pdo, $cfg);
                return mcp_json_response($id, mcp_tool_result($result, empty($result['success'])));
        }
    } catch (Throwable $e) {
        if ($method === 'tools/call') {
            return mcp_json_response($id, mcp_tool_result(['success' => false, 'error' => $e->getMessage()], true));
        }
        return mcp_json_error($id, -32602, $e->getMessage());
    }

    return mcp_json_error($id, -32601, 'Method not found: ' . $method);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'POST') === 'GET') {
    respond_json([
        'success' => true,
        'serverInfo' => ['name' => 'ugx-pnl-highlevel', 'version' => '1.0.0'],
        'tools' => mcp_tool_definitions(),
        'status' => automation_status($cfg),
    ]);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'POST') !== 'POST') {
    respond_json(['success' => false, 'error' => 'Method not allowed'], 405);
}

$raw = file_get_contents('php://input');
$payload = $raw !== false && trim($raw) !== '' ? json_decode($raw, true) : null;
if (!is_array($payload)) {
    respond_json(mcp_json_error(null, -32700, 'Invalid JSON-RPC payload.'), 400);
}

$isBatch = mcp_array_is_list($payload) && isset($payload[0]) && is_array($payload[0]);
$requests = $isBatch ? $payload : [$payload];
$responses = [];
foreach ($requests as $request) {
    if (!is_array($request)) {
        $responses[] = mcp_json_error(null, -32600, 'Invalid request.');
        continue;
    }
    $response = mcp_handle_request($request, $pdo, $cfg);
    if ($response !== null && array_key_exists('id', $request)) {
        $responses[] = $response;
    }
}

if (!$responses) {
    http_response_code(204);
    exit;
}

respond_json($isBatch ? $responses : $responses[0]);
