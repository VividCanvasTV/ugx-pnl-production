<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
if (!defined('GHL_CORE_ONLY')) {
    define('GHL_CORE_ONLY', true);
}
require_once __DIR__ . '/ghl.php';

function automation_enable_cors(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-UGX-Automation-Token');
    header('Access-Control-Max-Age: 600');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function automation_auth_header(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header !== '') {
        return trim((string)$header);
    }
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $value) {
            if (strcasecmp((string)$key, 'Authorization') === 0) {
                return trim((string)$value);
            }
        }
    }
    return '';
}

function automation_require_bearer(array $cfg): void {
    $expectedTokens = ghl_automation_tokens($cfg);
    if (!$expectedTokens) {
        respond_json([
            'success' => false,
            'error' => 'UGX_MCP_BEARER_TOKEN or UGX_AUTOMATION_TOKEN is not configured on the server.',
        ], 503);
    }

    $provided = '';
    $auth = automation_auth_header();
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        $provided = trim($m[1]);
    }
    if ($provided === '') {
        $provided = trim((string)($_SERVER['HTTP_X_UGX_AUTOMATION_TOKEN'] ?? ''));
    }

    $valid = false;
    foreach ($expectedTokens as $expected) {
        if ($provided !== '' && hash_equals($expected, $provided)) {
            $valid = true;
            break;
        }
    }

    if (!$valid) {
        respond_json(['success' => false, 'error' => 'Invalid automation bearer token.'], 401);
    }
}

function automation_decode_json(?string $value, $fallback = []) {
    if ($value === null || trim($value) === '') {
        return $fallback;
    }
    $decoded = json_decode($value, true);
    return $decoded === null ? $fallback : $decoded;
}

function automation_row_value(array $row, string $key, $default = '') {
    return array_key_exists($key, $row) && $row[$key] !== null ? $row[$key] : $default;
}

function automation_job_from_row(array $row): array {
    $settings = automation_decode_json((string)automation_row_value($row, 'settings_json', ''), []);
    $job = [
        'id' => (string)automation_row_value($row, 'id'),
        'companyName' => (string)automation_row_value($row, 'company_name'),
        'jobName' => (string)automation_row_value($row, 'job_name'),
        'jobType' => (string)automation_row_value($row, 'job_type', 'Other'),
        'date' => (string)automation_row_value($row, 'date'),
        'startDate' => (string)automation_row_value($row, 'start_date'),
        'endDate' => (string)automation_row_value($row, 'end_date'),
        'profitMargin' => (float)automation_row_value($row, 'profit_margin', 0),
        'overheadCost' => (float)automation_row_value($row, 'overhead_cost', 0),
        'overheadPercent' => (float)automation_row_value($row, 'overhead_percent', 0),
        'salesTaxPercent' => (float)automation_row_value($row, 'sales_tax_percent', 0),
        'contingencyPercent' => (float)automation_row_value($row, 'contingency_percent', 0),
        'profitMode' => (string)automation_row_value($row, 'profit_mode', 'margin'),
        'roundingStep' => (int)automation_row_value($row, 'rounding_step', 0),
        'notes' => (string)automation_row_value($row, 'notes'),
        'materials' => automation_decode_json((string)automation_row_value($row, 'materials_json', ''), []),
        'labor' => automation_decode_json((string)automation_row_value($row, 'labor_json', ''), []),
        'other' => automation_decode_json((string)automation_row_value($row, 'other_json', ''), []),
        'totalMaterials' => (float)automation_row_value($row, 'total_materials', 0),
        'totalLabor' => (float)automation_row_value($row, 'total_labor', 0),
        'totalOther' => (float)automation_row_value($row, 'total_other', 0),
        'totalOverhead' => (float)automation_row_value($row, 'total_overhead', 0),
        'totalSalesTax' => (float)automation_row_value($row, 'total_sales_tax', 0),
        'totalContingency' => (float)automation_row_value($row, 'total_contingency', 0),
        'totalCost' => (float)automation_row_value($row, 'total_cost', 0),
        'price' => (float)automation_row_value($row, 'price', 0),
        'netProfit' => (float)automation_row_value($row, 'net_profit', 0),
        'grandTotal' => (float)automation_row_value($row, 'grand_total', 0),
        'settings' => is_array($settings) ? $settings : [],
        'measurement' => automation_decode_json((string)automation_row_value($row, 'measurement_json', ''), null),
        'yearlyBreakdown' => automation_decode_json((string)automation_row_value($row, 'yearly_breakdown_json', ''), []),
        'ghlContactId' => (string)automation_row_value($row, 'ghl_contact_id'),
        'ghlOpportunityId' => (string)automation_row_value($row, 'ghl_opportunity_id'),
        'ghlEstimateId' => (string)automation_row_value($row, 'ghl_estimate_id'),
        'ghlLastSyncedAt' => (string)automation_row_value($row, 'ghl_last_synced_at'),
        'ghlLastSyncError' => (string)automation_row_value($row, 'ghl_last_sync_error'),
        'updatedAt' => (string)automation_row_value($row, 'updated_at'),
    ];
    if (isset($settings['clientEstimate']) && is_array($settings['clientEstimate'])) {
        $job['clientEstimate'] = $settings['clientEstimate'];
    }
    return $job;
}

function automation_fetch_job(PDO $pdo, string $jobId): array {
    if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $jobId)) {
        throw new InvalidArgumentException('Invalid jobId.');
    }
    $stmt = $pdo->prepare('SELECT * FROM jobs WHERE id = ? LIMIT 1');
    $stmt->execute([$jobId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Job not found.');
    }
    return automation_job_from_row($row);
}

function automation_job_from_args(PDO $pdo, array $args): array {
    $jobId = trim((string)($args['jobId'] ?? $args['id'] ?? ''));
    if ($jobId !== '') {
        return automation_fetch_job($pdo, $jobId);
    }
    if (isset($args['job']) && is_array($args['job'])) {
        return $args['job'];
    }
    if (isset($args['companyName']) || isset($args['jobName'])) {
        return $args;
    }
    throw new InvalidArgumentException('Provide either jobId or a full job object.');
}

function automation_recent_jobs(PDO $pdo, int $limit = 10): array {
    $limit = max(1, min(25, $limit));
    $cols = table_columns($pdo, 'jobs');
    $wanted = [
        'id', 'company_name', 'job_name', 'job_type', 'date', 'start_date', 'end_date',
        'price', 'grand_total', 'net_profit', 'ghl_contact_id', 'ghl_opportunity_id',
        'ghl_estimate_id', 'ghl_last_synced_at', 'ghl_last_sync_error', 'updated_at',
    ];
    $select = [];
    foreach ($wanted as $col) {
        if (in_array($col, $cols, true)) {
            $select[] = "`{$col}`";
        }
    }
    if (!$select) {
        throw new RuntimeException('Jobs table is not available.');
    }
    $orderCol = in_array('updated_at', $cols, true) ? '`updated_at`' : '`id`';
    $stmt = $pdo->query('SELECT ' . implode(', ', $select) . " FROM jobs ORDER BY {$orderCol} DESC LIMIT {$limit}");
    $jobs = [];
    foreach ($stmt->fetchAll() as $row) {
        $jobs[] = [
            'id' => (string)automation_row_value($row, 'id'),
            'companyName' => (string)automation_row_value($row, 'company_name'),
            'jobName' => (string)automation_row_value($row, 'job_name'),
            'jobType' => (string)automation_row_value($row, 'job_type'),
            'date' => (string)automation_row_value($row, 'date'),
            'startDate' => (string)automation_row_value($row, 'start_date'),
            'endDate' => (string)automation_row_value($row, 'end_date'),
            'price' => (float)automation_row_value($row, 'price', 0),
            'grandTotal' => (float)automation_row_value($row, 'grand_total', 0),
            'netProfit' => (float)automation_row_value($row, 'net_profit', 0),
            'ghlContactId' => (string)automation_row_value($row, 'ghl_contact_id'),
            'ghlOpportunityId' => (string)automation_row_value($row, 'ghl_opportunity_id'),
            'ghlEstimateId' => (string)automation_row_value($row, 'ghl_estimate_id'),
            'ghlLastSyncedAt' => (string)automation_row_value($row, 'ghl_last_synced_at'),
            'ghlLastSyncError' => (string)automation_row_value($row, 'ghl_last_sync_error'),
            'updatedAt' => (string)automation_row_value($row, 'updated_at'),
        ];
    }
    return $jobs;
}

function automation_status(array $cfg): array {
    return [
        'success' => true,
        'app' => 'UGX PNL',
        'automationTokenConfigured' => ghl_automation_token($cfg) !== '',
        'highLevel' => ghl_status_payload($cfg),
        'endpoints' => [
            'mcp' => 'api/mcp.php',
            'rest' => 'api/automation.php',
            'browserSync' => 'api/ghl.php?action=sync_job',
        ],
        'requiredWorkflow' => [
            'previewBeforeSync' => true,
            'doNotForceSyncUnlessHumanExplicitlyRequestsNewEstimate' => true,
            'existingEstimateIdMeansAlreadySynced' => true,
        ],
    ];
}

function automation_run_action(string $action, array $args, PDO $pdo, array $cfg): array {
    $action = strtolower(trim($action));
    switch ($action) {
        case '':
        case 'status':
        case 'ghl_status':
        case 'highlevel_status':
            return automation_status($cfg);

        case 'list_recent_jobs':
        case 'recent_jobs':
            return ['success' => true, 'jobs' => automation_recent_jobs($pdo, (int)($args['limit'] ?? 10))];

        case 'get_job':
        case 'fetch_job':
            $jobId = trim((string)($args['jobId'] ?? $args['id'] ?? ''));
            return ['success' => true, 'job' => automation_fetch_job($pdo, $jobId)];

        case 'preview_estimate':
        case 'preview_highlevel_estimate':
            $job = automation_job_from_args($pdo, $args);
            return ['success' => true, 'dryRun' => true] + ghl_payload_package($job, $cfg);

        case 'sync_estimate':
        case 'sync_estimate_to_highlevel':
        case 'sync_job':
            $job = automation_job_from_args($pdo, $args);
            $forceSync = ghl_truthy($args['forceSync'] ?? false) || ghl_truthy($args['force'] ?? false);
            return ghl_sync_job_to_highlevel($pdo, $job, $cfg, false, $forceSync);
    }

    throw new InvalidArgumentException('Unknown automation action: ' . $action);
}
