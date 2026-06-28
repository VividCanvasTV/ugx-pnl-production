<?php
declare(strict_types=1);

require_once __DIR__ . '/automation_core.php';

automation_enable_cors();
$cfg = ghl_config();
automation_require_bearer($cfg);
$pdo = get_pdo();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$input = $method === 'POST' ? json_input() : [];
$action = trim((string)($_GET['action'] ?? ($input['action'] ?? 'status')));
$args = isset($input['arguments']) && is_array($input['arguments']) ? $input['arguments'] : $input;

if ($method !== 'GET' && $method !== 'POST') {
    respond_json(['success' => false, 'error' => 'Method not allowed'], 405);
}

try {
    if ($method === 'GET' && $action === '') {
        $action = 'status';
    }
    if ($method === 'GET' && isset($_GET['jobId'])) {
        $args['jobId'] = (string)$_GET['jobId'];
    }
    if ($method === 'GET' && isset($_GET['limit'])) {
        $args['limit'] = (int)$_GET['limit'];
    }
    $result = automation_run_action($action, $args, $pdo, $cfg);
    respond_json($result);
} catch (Throwable $e) {
    respond_json(['success' => false, 'error' => $e->getMessage()], 400);
}
