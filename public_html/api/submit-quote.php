<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function abq_crm_response(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function abq_crm_empty_result(array $errors = []): array {
    return [
        'success' => false,
        'contactId' => '',
        'opportunityId' => '',
        'invoiceId' => '',
        'noteId' => '',
        'contactCreated' => false,
        'pipeline' => '',
        'errors' => $errors,
    ];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    abq_crm_response(abq_crm_empty_result(['Method not allowed. Use POST.']), 405);
}

$raw = file_get_contents('php://input');
$payload = $raw !== false && trim($raw) !== '' ? json_decode($raw, true) : null;
if (!is_array($payload)) {
    abq_crm_response(abq_crm_empty_result(['Invalid JSON body.']), 400);
}

$configFile = __DIR__ . '/../config/config.php';
if (is_file($configFile)) {
    require_once $configFile;
}

require_once __DIR__ . '/../includes/class-abqasphalt-crm.php';

$calculatorData = isset($payload['calculatorData']) && is_array($payload['calculatorData'])
    ? $payload['calculatorData']
    : $payload;

try {
    $crm = new ABQAsphaltCRM();
    $result = $crm->submitQuote($calculatorData);
    abq_crm_response($result, 200);
} catch (Throwable $e) {
    abq_crm_response(abq_crm_empty_result([$e->getMessage()]), 500);
}
