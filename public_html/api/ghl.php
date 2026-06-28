<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (!defined('GHL_CORE_ONLY') || !GHL_CORE_ONLY) {
    enable_cors();
    $user = require_login();
    $pdo = get_pdo();
}

function ghl_config(): array {
    $cfg = [
        'api_base'          => env_first(['GHL_API_BASE', 'GOHIGHLEVEL_API_BASE'], 'https://services.leadconnectorhq.com'),
        'api_version'       => env_first(['GHL_API_VERSION', 'GOHIGHLEVEL_API_VERSION'], 'v3'),
        'access_token'      => env_first(['GHL_ACCESS_TOKEN', 'GHL_API_TOKEN', 'GOHIGHLEVEL_ACCESS_TOKEN', 'GOHIGHLEVEL_API_TOKEN', 'LC_ACCESS_TOKEN']),
        'location_id'       => env_first(['GHL_LOCATION_ID', 'GOHIGHLEVEL_LOCATION_ID', 'LC_LOCATION_ID']),
        'user_id'           => env_first(['GHL_USER_ID', 'GOHIGHLEVEL_USER_ID']),
        'pipeline_id'       => env_first(['GHL_PIPELINE_ID', 'GOHIGHLEVEL_PIPELINE_ID']),
        'pipeline_stage_id' => env_first(['GHL_PIPELINE_STAGE_ID', 'GOHIGHLEVEL_PIPELINE_STAGE_ID']),
        'source'            => env_first(['GHL_SOURCE'], 'UGX PNL APP'),
        'business_name'     => env_first(['GHL_BUSINESS_NAME', 'GOHIGHLEVEL_BUSINESS_NAME'], 'UGX PNL'),
        'business_phone'    => env_first(['GHL_BUSINESS_PHONE', 'GOHIGHLEVEL_BUSINESS_PHONE']),
        'business_address'  => env_first(['GHL_BUSINESS_ADDRESS', 'GOHIGHLEVEL_BUSINESS_ADDRESS']),
        'business_website'  => env_first(['GHL_BUSINESS_WEBSITE', 'GOHIGHLEVEL_BUSINESS_WEBSITE']),
        'business_logo_url' => env_first(['GHL_BUSINESS_LOGO_URL', 'GOHIGHLEVEL_BUSINESS_LOGO_URL']),
        'mcp_bearer_token'  => env_first(['UGX_MCP_BEARER_TOKEN', 'GHL_MCP_BEARER_TOKEN']),
        'automation_bearer_token' => env_first(['UGX_AUTOMATION_TOKEN', 'GHL_AUTOMATION_TOKEN']),
    ];

    $local = __DIR__ . '/ghl_config.php';
    if (is_file($local)) {
        $override = include $local;
        if (is_array($override)) {
            $cfg = array_merge($cfg, $override);
        }
    }

    return $cfg;
}

function compact_payload(array $value): array {
    $out = [];
    foreach ($value as $key => $item) {
        if (is_array($item)) {
            $item = compact_payload($item);
        }
        if ($item === null || $item === '' || $item === []) {
            continue;
        }
        $out[$key] = $item;
    }
    return $out;
}

function field_string(array $source, string $key, string $default = ''): string {
    return isset($source[$key]) ? trim((string)$source[$key]) : $default;
}

function field_number(array $source, string $key, float $default = 0.0): float {
    if (!isset($source[$key])) {
        return $default;
    }
    $raw = is_numeric($source[$key]) ? (string)$source[$key] : preg_replace('/[^0-9.-]/', '', (string)$source[$key]);
    if ($raw === '' || !is_numeric($raw)) {
        return $default;
    }
    return round((float)$raw, 2);
}

function html_lines(string $value): string {
    $lines = preg_split('/\r?\n/', trim($value)) ?: [];
    $parts = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line !== '') {
            $parts[] = htmlspecialchars($line, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
    }
    return $parts ? '<p>' . implode('</p><p>', $parts) . '</p>' : '';
}

function date_or_today(string $value): string {
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return $value;
    }
    return gmdate('Y-m-d');
}

function ghl_truthy($value): bool {
    if (is_bool($value)) {
        return $value;
    }
    if (is_numeric($value)) {
        return (int)$value === 1;
    }
    $normalized = strtolower(trim((string)$value));
    return in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true);
}

function estimate_from_job(array $job): array {
    $settings = isset($job['settings']) && is_array($job['settings']) ? $job['settings'] : [];
    if (isset($job['clientEstimate']) && is_array($job['clientEstimate'])) {
        return $job['clientEstimate'];
    }
    if (isset($settings['clientEstimate']) && is_array($settings['clientEstimate'])) {
        return $settings['clientEstimate'];
    }
    return [];
}

function estimate_total(array $job, array $estimate): float {
    if (field_number($estimate, 'priceOverride') > 0) {
        return field_number($estimate, 'priceOverride');
    }

    $items = isset($estimate['items']) && is_array($estimate['items']) ? $estimate['items'] : [];
    $itemTotal = 0.0;
    foreach ($items as $item) {
        if (is_array($item)) {
            $itemTotal += field_number($item, 'amount');
        }
    }
    if ($itemTotal > 0) {
        $showTax = !array_key_exists('showTaxLine', $estimate) || $estimate['showTaxLine'] !== false;
        return $itemTotal + ($showTax ? field_number($job, 'totalSalesTax') : 0.0);
    }

    $grand = field_number($job, 'grandTotal');
    if ($grand > 0) {
        return $grand;
    }
    return field_number($job, 'price') + field_number($job, 'totalSalesTax');
}

function build_estimate_items(array $job, array $estimate, string $currency): array {
    $items = [];
    $sourceItems = isset($estimate['items']) && is_array($estimate['items']) ? $estimate['items'] : [];
    foreach ($sourceItems as $item) {
        if (!is_array($item)) {
            continue;
        }
        $description = field_string($item, 'description', field_string($item, 'name', 'Estimate Item'));
        $amount = field_number($item, 'amount', field_number($item, 'price', field_number($item, 'total')));
        if ($description === '' && $amount <= 0) {
            continue;
        }
        $items[] = [
            'name' => $description !== '' ? $description : 'Estimate Item',
            'description' => $description,
            'currency' => $currency,
            'amount' => max(0.0, $amount),
            'qty' => 1,
            'type' => 'one_time',
        ];
    }

    $showTax = !array_key_exists('showTaxLine', $estimate) || $estimate['showTaxLine'] !== false;
    $tax = $showTax ? field_number($job, 'totalSalesTax') : 0.0;

    if (!$items) {
        $preTax = field_number($job, 'price');
        if ($preTax <= 0) {
            $preTax = max(0.0, estimate_total($job, $estimate) - $tax);
        }
        $items[] = [
            'name' => field_string($job, 'jobName', 'Project Estimate'),
            'description' => field_string($estimate, 'scope', field_string($job, 'notes')),
            'currency' => $currency,
            'amount' => max(0.0, $preTax),
            'qty' => 1,
            'type' => 'one_time',
        ];
    }

    if ($tax > 0) {
        $items[] = [
            'name' => 'Sales Tax',
            'description' => 'Sales tax from UGX PNL estimate',
            'currency' => $currency,
            'amount' => $tax,
            'qty' => 1,
            'type' => 'one_time',
        ];
    }

    return $items;
}

function build_contact_payload(array $job, array $estimate, array $cfg): array {
    $name = field_string($estimate, 'clientName', field_string($job, 'companyName', 'Client'));
    $address = field_string($estimate, 'projectAddress');
    return compact_payload([
        'locationId' => $cfg['location_id'],
        'name' => $name,
        'email' => field_string($estimate, 'clientEmail'),
        'phone' => field_string($estimate, 'clientPhone'),
        'companyName' => field_string($job, 'companyName'),
        'address1' => $address,
        'source' => $cfg['source'],
        'country' => 'US',
    ]);
}

function build_business_details(array $cfg): array {
    $details = [
        'name' => $cfg['business_name'],
        'phoneNo' => $cfg['business_phone'],
        'website' => $cfg['business_website'],
        'logoUrl' => $cfg['business_logo_url'],
    ];
    if (trim((string)$cfg['business_address']) !== '') {
        $details['address'] = ['addressLine1' => $cfg['business_address'], 'countryCode' => 'US'];
    }
    return compact_payload($details);
}

function build_estimate_payload(array $job, array $estimate, array $cfg, string $contactId): array {
    $currency = 'USD';
    $issueDate = date_or_today(field_string($estimate, 'estimateDate', field_string($job, 'startDate', field_string($job, 'date'))));
    $expiryDate = date_or_today(field_string($estimate, 'validUntil', field_string($job, 'endDate', $issueDate)));
    $clientName = field_string($estimate, 'clientName', field_string($job, 'companyName', 'Client'));
    $email = field_string($estimate, 'clientEmail');
    $phone = field_string($estimate, 'clientPhone');
    $scope = field_string($estimate, 'scope');
    $terms = field_string($estimate, 'terms');
    $exclusions = field_string($estimate, 'exclusions');
    $termsNotes = trim(html_lines($terms) . html_lines($exclusions));

    return compact_payload([
        'altId' => $cfg['location_id'],
        'altType' => 'location',
        'name' => field_string($estimate, 'estimateTitle', field_string($job, 'jobName', 'Project Estimate')),
        'businessDetails' => build_business_details($cfg),
        'currency' => $currency,
        'items' => build_estimate_items($job, $estimate, $currency),
        'liveMode' => true,
        'discount' => ['type' => 'percentage', 'value' => 0],
        'termsNotes' => $termsNotes !== '' ? $termsNotes : html_lines($scope),
        'title' => field_string($estimate, 'estimateTitle', 'ESTIMATE'),
        'contactDetails' => compact_payload([
            'id' => $contactId,
            'name' => $clientName,
            'phoneNo' => $phone,
            'email' => $email,
            'companyName' => field_string($job, 'companyName'),
            'address' => field_string($estimate, 'projectAddress') !== ''
                ? ['addressLine1' => field_string($estimate, 'projectAddress'), 'countryCode' => 'US']
                : [],
        ]),
        'issueDate' => $issueDate,
        'expiryDate' => $expiryDate,
        'sentTo' => compact_payload([
            'email' => $email !== '' ? [$email] : [],
            'phoneNo' => $phone !== '' ? [$phone] : [],
        ]),
        'automaticTaxesEnabled' => false,
        'meta' => compact_payload([
            'ugxJobId' => field_string($job, 'id'),
            'ugxJobType' => field_string($job, 'jobType'),
            'ugxTotalCost' => field_number($job, 'totalCost'),
            'ugxNetProfit' => field_number($job, 'netProfit'),
        ]),
        'frequencySettings' => [
            'enabled' => false,
            'schedule' => [
                'rrule' => [
                    'intervalType' => 'monthly',
                    'interval' => 1,
                    'startDate' => $issueDate,
                ],
            ],
        ],
        'estimateNumberPrefix' => 'EST-',
        'userId' => $cfg['user_id'],
    ]);
}

function build_opportunity_payload(array $job, array $cfg, string $contactId): array {
    if (trim((string)$cfg['pipeline_id']) === '') {
        return [];
    }
    return compact_payload([
        'pipelineId' => $cfg['pipeline_id'],
        'locationId' => $cfg['location_id'],
        'followers' => [$contactId],
        'isRemoveAllFollowers' => false,
        'followersActionType' => 'add',
        'name' => field_string($job, 'jobName', 'Project Estimate'),
        'status' => 'open',
        'pipelineStageId' => $cfg['pipeline_stage_id'],
        'monetaryValue' => field_number($job, 'grandTotal', field_number($job, 'price')),
        'forecastExpectedCloseDate' => date_or_today(field_string($job, 'endDate', field_string($job, 'startDate', field_string($job, 'date')))),
    ]);
}

function validate_ghl_payloads(array $contactPayload, array $estimateSeed, array $cfg): array {
    $missing = [];
    if (trim((string)$cfg['location_id']) === '') {
        $missing[] = 'GHL location id';
    }
    if (field_string($contactPayload, 'email') === '') {
        $missing[] = 'client email';
    }
    if (field_string($contactPayload, 'phone') === '') {
        $missing[] = 'client phone';
    }
    if (field_string($contactPayload, 'name') === '') {
        $missing[] = 'client name';
    }
    return $missing;
}

function ghl_status_payload(array $cfg): array {
    return [
        'configured' => trim((string)$cfg['access_token']) !== '' && trim((string)$cfg['location_id']) !== '',
        'hasToken' => trim((string)$cfg['access_token']) !== '',
        'hasLocationId' => trim((string)$cfg['location_id']) !== '',
        'hasPipeline' => trim((string)$cfg['pipeline_id']) !== '',
        'hasAutomationToken' => ghl_automation_token($cfg) !== '',
        'apiBase' => $cfg['api_base'],
        'apiVersion' => $cfg['api_version'],
        'endpoints' => [
            'upsertContact' => '/contacts/upsert',
            'createEstimate' => '/invoices/estimate',
            'upsertOpportunity' => '/opportunities/upsert',
        ],
        'idempotency' => [
            'storesHighLevelIdsOnJobs' => true,
            'skipsExistingEstimateIdUnlessForceSync' => true,
        ],
    ];
}

function ghl_request(array $cfg, string $method, string $path, array $payload): array {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL extension is not available.');
    }
    $token = trim((string)$cfg['access_token']);
    if ($token === '') {
        throw new RuntimeException('HighLevel access token is not configured.');
    }
    $url = rtrim((string)$cfg['api_base'], '/') . '/' . ltrim($path, '/');
    $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        throw new RuntimeException('Could not encode HighLevel request payload: ' . json_last_error_msg());
    }
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token,
        'Version: ' . $cfg['api_version'],
    ];

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Could not initialize HighLevel request.');
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $responseBody = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($responseBody === false) {
        throw new RuntimeException('HighLevel request failed: ' . $error);
    }
    $decoded = json_decode((string)$responseBody, true);
    $data = is_array($decoded) ? $decoded : ['raw' => (string)$responseBody];
    if ($status < 200 || $status >= 300) {
        $message = isset($data['message']) ? (is_array($data['message']) ? implode(', ', $data['message']) : (string)$data['message']) : (string)$responseBody;
        throw new RuntimeException('HighLevel API error ' . $status . ': ' . $message);
    }
    return $data;
}

function response_contact_id(array $response): string {
    if (isset($response['contact']) && is_array($response['contact']) && isset($response['contact']['id'])) {
        return (string)$response['contact']['id'];
    }
    return isset($response['id']) ? (string)$response['id'] : '';
}

function response_estimate_id(array $response): string {
    if (isset($response['_id'])) {
        return (string)$response['_id'];
    }
    if (isset($response['estimate']) && is_array($response['estimate'])) {
        return (string)($response['estimate']['_id'] ?? $response['estimate']['id'] ?? '');
    }
    return isset($response['id']) ? (string)$response['id'] : '';
}

function response_opportunity_id(array $response): string {
    if (isset($response['opportunity']) && is_array($response['opportunity'])) {
        return (string)($response['opportunity']['id'] ?? $response['opportunity']['_id'] ?? '');
    }
    return isset($response['id']) ? (string)$response['id'] : '';
}

function ghl_existing_ids(array $job): array {
    return [
        'contactId' => field_string($job, 'ghlContactId', field_string($job, 'ghl_contact_id')),
        'estimateId' => field_string($job, 'ghlEstimateId', field_string($job, 'ghl_estimate_id')),
        'opportunityId' => field_string($job, 'ghlOpportunityId', field_string($job, 'ghl_opportunity_id')),
    ];
}

function ghl_merge_saved_sync_memory(PDO $pdo, array $job): array {
    $jobId = field_string($job, 'id', field_string($job, 'jobId'));
    if ($jobId === '' || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $jobId)) {
        return $job;
    }
    if (field_string($job, 'id') === '') {
        $job['id'] = $jobId;
    }

    $cols = table_columns($pdo, 'jobs');
    $map = [
        'ghl_contact_id' => ['ghlContactId', 'ghl_contact_id'],
        'ghl_estimate_id' => ['ghlEstimateId', 'ghl_estimate_id'],
        'ghl_opportunity_id' => ['ghlOpportunityId', 'ghl_opportunity_id'],
        'ghl_last_synced_at' => ['ghlLastSyncedAt', 'ghl_last_synced_at'],
        'ghl_last_sync_error' => ['ghlLastSyncError', 'ghl_last_sync_error'],
    ];
    $select = ['`id`'];
    foreach ($map as $col => $_targets) {
        if (in_array($col, $cols, true)) {
            $select[] = "`{$col}`";
        }
    }
    if (count($select) === 1) {
        return $job;
    }

    $stmt = $pdo->prepare('SELECT ' . implode(', ', $select) . ' FROM jobs WHERE id = ? LIMIT 1');
    $stmt->execute([$jobId]);
    $row = $stmt->fetch();
    if (!$row) {
        return $job;
    }

    foreach ($map as $col => $targets) {
        if (!array_key_exists($col, $row) || $row[$col] === null || (string)$row[$col] === '') {
            continue;
        }
        foreach ($targets as $target) {
            $job[$target] = (string)$row[$col];
        }
    }

    return $job;
}

function update_job_ghl_ids(PDO $pdo, string $jobId, string $contactId, string $estimateId, string $opportunityId): void {
    if ($jobId === '') {
        return;
    }
    $cols = table_columns($pdo, 'jobs');
    $set = [];
    $params = [];
    foreach ([
        'ghl_contact_id' => $contactId,
        'ghl_estimate_id' => $estimateId,
        'ghl_opportunity_id' => $opportunityId,
    ] as $col => $value) {
        if ($value !== '' && in_array($col, $cols, true)) {
            $set[] = "`{$col}` = ?";
            $params[] = $value;
        }
    }
    if (!$set) {
        return;
    }
    if (in_array('updated_at', $cols, true)) {
        $set[] = '`updated_at` = NOW()';
    }
    if (in_array('ghl_last_synced_at', $cols, true)) {
        $set[] = '`ghl_last_synced_at` = NOW()';
    }
    if (in_array('ghl_last_sync_error', $cols, true)) {
        $set[] = '`ghl_last_sync_error` = NULL';
    }
    $params[] = $jobId;
    $pdo->prepare('UPDATE jobs SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
}

function update_job_ghl_error(PDO $pdo, string $jobId, string $message): void {
    if ($jobId === '') {
        return;
    }
    $cols = table_columns($pdo, 'jobs');
    if (!in_array('ghl_last_sync_error', $cols, true)) {
        return;
    }
    $set = ['`ghl_last_sync_error` = ?'];
    $params = [substr($message, 0, 2000)];
    if (in_array('updated_at', $cols, true)) {
        $set[] = '`updated_at` = NOW()';
    }
    $params[] = $jobId;
    $pdo->prepare('UPDATE jobs SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
}

function ghl_automation_tokens(array $cfg): array {
    $tokens = [];
    foreach (['mcp_bearer_token', 'automation_bearer_token'] as $key) {
        $token = trim((string)($cfg[$key] ?? ''));
        if ($token !== '') {
            $tokens[] = $token;
        }
    }
    return array_values(array_unique($tokens));
}

function ghl_automation_token(array $cfg): string {
    $tokens = ghl_automation_tokens($cfg);
    return $tokens[0] ?? '';
}

function ghl_payload_package(array $job, array $cfg): array {
    $estimate = estimate_from_job($job);
    $contactPayload = build_contact_payload($job, $estimate, $cfg);
    $missing = validate_ghl_payloads($contactPayload, $estimate, $cfg);
    $existingIds = ghl_existing_ids($job);
    $placeholderContactId = $existingIds['contactId'] !== '' ? $existingIds['contactId'] : 'CONTACT_ID_FROM_UPSERT';
    $estimatePayload = build_estimate_payload($job, $estimate, $cfg, $placeholderContactId);
    $opportunityPayload = build_opportunity_payload($job, $cfg, $placeholderContactId);

    return [
        'highLevel' => ghl_status_payload($cfg),
        'missing' => $missing,
        'payloads' => [
            'contact' => $contactPayload,
            'estimate' => $estimatePayload,
            'opportunity' => $opportunityPayload,
        ],
    ];
}

function ghl_sync_job_to_highlevel(PDO $pdo, array $job, array $cfg, bool $dryRun = false, bool $forceSync = false): array {
    $job = ghl_merge_saved_sync_memory($pdo, $job);
    $package = ghl_payload_package($job, $cfg);
    $existingIds = ghl_existing_ids($job);

    if ($dryRun) {
        return [
            'success' => true,
            'dryRun' => true,
            'highLevel' => $package['highLevel'],
            'missing' => $package['missing'],
            'existingIds' => $existingIds,
            'payloads' => $package['payloads'],
        ];
    }

    if (!$forceSync && $existingIds['estimateId'] !== '') {
        return [
            'success' => true,
            'alreadySynced' => true,
            'message' => 'This job already has a HighLevel estimate id. Use forceSync only when a human explicitly wants a new HighLevel estimate.',
            'ids' => $existingIds,
        ];
    }

    if (trim((string)$cfg['access_token']) === '') {
        return [
            'success' => false,
            'error' => 'HighLevel access token is not configured.',
            'payloads' => $package['payloads'],
        ];
    }
    if ($package['missing']) {
        return [
            'success' => false,
            'error' => 'Missing required HighLevel fields: ' . implode(', ', $package['missing']),
            'missing' => $package['missing'],
            'payloads' => $package['payloads'],
        ];
    }

    try {
        $contactResponse = ghl_request($cfg, 'POST', '/contacts/upsert', $package['payloads']['contact']);
        $contactId = response_contact_id($contactResponse);
        if ($contactId === '') {
            throw new RuntimeException('HighLevel contact response did not include a contact id.');
        }

        $estimate = estimate_from_job($job);
        $estimatePayload = build_estimate_payload($job, $estimate, $cfg, $contactId);
        $estimateResponse = ghl_request($cfg, 'POST', '/invoices/estimate', $estimatePayload);
        $estimateId = response_estimate_id($estimateResponse);
        if ($estimateId === '') {
            throw new RuntimeException('HighLevel estimate response did not include an estimate id.');
        }

        $opportunityId = '';
        $opportunityResponse = null;
        $opportunityPayload = build_opportunity_payload($job, $cfg, $contactId);
        if ($opportunityPayload) {
            $opportunityResponse = ghl_request($cfg, 'POST', '/opportunities/upsert', $opportunityPayload);
            $opportunityId = response_opportunity_id($opportunityResponse);
        }

        update_job_ghl_ids($pdo, field_string($job, 'id'), $contactId, $estimateId, $opportunityId);

        return [
            'success' => true,
            'alreadySynced' => false,
            'syncedAt' => gmdate('c'),
            'ids' => [
                'contactId' => $contactId,
                'estimateId' => $estimateId,
                'opportunityId' => $opportunityId,
            ],
            'responses' => compact_payload([
                'contact' => $contactResponse,
                'estimate' => $estimateResponse,
                'opportunity' => $opportunityResponse ?: [],
            ]),
        ];
    } catch (Throwable $e) {
        update_job_ghl_error($pdo, field_string($job, 'id'), $e->getMessage());
        throw $e;
    }
}

if (defined('GHL_CORE_ONLY') && GHL_CORE_ONLY) {
    return;
}

$cfg = ghl_config();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'status';

if ($method === 'GET' && $action === 'status') {
    respond_json(['success' => true, 'highLevel' => ghl_status_payload($cfg)]);
}

if ($method === 'POST' && ($action === 'sync_job' || $action === 'preview')) {
    $input = json_input();
    $job = isset($input['job']) && is_array($input['job']) ? $input['job'] : $input;
    if (!$job) {
        respond_json(['success' => false, 'error' => 'Missing job payload'], 400);
    }
    $dryRun = $action === 'preview' || !empty($input['dryRun']) || (($_GET['dry_run'] ?? '') === '1');
    $forceSync = ghl_truthy($input['forceSync'] ?? false) || ghl_truthy($input['force'] ?? false) || ghl_truthy($_GET['force'] ?? false);

    try {
        $result = ghl_sync_job_to_highlevel($pdo, $job, $cfg, $dryRun, $forceSync);
        respond_json($result, !empty($result['success']) ? 200 : 400);
    } catch (Throwable $e) {
        respond_json(['success' => false, 'error' => $e->getMessage(), 'payloads' => ghl_payload_package($job, $cfg)['payloads']], 502);
    }
}

respond_json(['success' => false, 'error' => 'Method not allowed'], 405);
