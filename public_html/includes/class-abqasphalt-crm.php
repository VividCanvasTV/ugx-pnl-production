<?php
declare(strict_types=1);

class ABQAsphaltCRMHttpException extends RuntimeException {
    private int $statusCode;
    private array $responseBody;

    public function __construct(string $message, int $statusCode = 0, array $responseBody = []) {
        parent::__construct($message, $statusCode);
        $this->statusCode = $statusCode;
        $this->responseBody = $responseBody;
    }

    public function getStatusCode(): int {
        return $this->statusCode;
    }

    public function getResponseBody(): array {
        return $this->responseBody;
    }
}

class ABQAsphaltCRM {
    private const API_BASE = 'https://services.leadconnectorhq.com';
    private const API_VERSION = '2021-07-28';
    private const LOCATION_ID = 'jy7LGqKKuHiqoM2SibWr';

    private const RESIDENTIAL_PIPELINE_ID = 'fczUxEYUx8iwlIREW4Jy';
    private const COMMERCIAL_PIPELINE_ID = 'CuLmHhC9rahkdwsAU6hM';

    private const RESIDENTIAL_STAGES = [
        'new_lead' => '87bd95d6-7457-4b80-8d5b-e6682220e97a',
        'estimate_requested' => 'bedb5115-d02f-402f-9cab-a8dfb321622a',
        'estimate_scheduled' => '8b56249e-1662-4304-896e-21aa13100367',
        'estimate_sent' => 'b5c3a046-52ee-4020-9096-9d5249197614',
        'follow_up' => '3af444a1-d261-46b5-9a6f-16224732818c',
        'deposit_received' => '9d843c5e-a694-4172-ba86-04c11cff8ba5',
        'job_scheduled' => '36632891-b507-4fce-964f-fad9df3120a0',
        'job_in_progress' => '6e5e5055-a107-442d-aa9a-2a62f3f514d4',
        'job_complete' => 'e7347c95-6774-4e13-8960-27a85ac75cdc',
        'invoice_sent' => '7353f528-915e-4ec2-88cf-1dd1690b69fe',
        'paid' => 'd8b61fcf-d288-4c07-88a6-aee9b74d4695',
        'review_requested' => '4a3d99c4-5e0c-400a-8a63-dd5cc7925742',
        'lost' => '590d180b-22d7-4e57-b59a-88bdd0404b53',
    ];

    private const COMMERCIAL_STAGES = [
        'new_lead_rfq' => '36cab96d-67be-458f-b9cf-cbfe20579a69',
        'site_walk_scheduled' => '67d84d74-f9e4-4258-87b9-248ab39b11da',
        'site_walk_complete' => '6ec6123c-aa1e-4c04-a061-c6a4e0ee9ad4',
        'bid_submitted' => 'e4528171-8df6-4832-9097-80858edc1656',
        'bid_followup' => '675b6b5a-7c40-4810-a697-1e3e225962f2',
        'negotiation' => '74739bb0-014b-4943-8d28-f93e77161fe8',
        'contract_signed' => '1e48aa4f-036c-4492-9997-021a3436aead',
        'deposit_received' => '748fe240-cc18-43e9-9ed5-cd4c3a403ec5',
        'job_scheduled' => '53cc0601-6c2e-4e98-8903-12efc8bb9b56',
        'job_in_progress' => '3fe13be2-6801-4e7b-afa5-874ad806e5b8',
        'job_complete' => '3f357099-8279-4329-9649-35c66577bb94',
        'final_invoice_sent' => 'd6b8d23e-2616-4bfc-b0a1-7d00d8b9e70b',
        'paid' => 'd06f2b2b-a1c1-4fc0-9ad6-1666a2e7a7b7',
        'lost' => '415da7c8-b6d7-4412-8087-d05aad4655c1',
    ];

    private const OPPORTUNITY_FIELD_IDS = [
        'job_address' => 'dWWNoViPO1i4A1xiWXxJ',
        'job_type' => 'bSxymkeV7XzitdLfzEB2',
        'client_property_type' => '9tUgsx3UgCy1wytcIHun',
        'square_footage' => '5P7WJnwTB1PHSsWjQFTg',
        'parking_stalls' => 'sa2T5fFfedMtRhC0KTdL',
        'deposit_status' => 'wseGQQhClG39J8r5hDXI',
        'job_start_date' => 'xyCBfrwcDZLDqzuLS2W2',
        'job_completion_date' => 'V0IUDcuYQ9GAcjFbc00e',
        'material_cost_cog' => 'U2gzZtwMygExzoggL7Ys',
        'labor_cost' => 'V77C11WzU9dn4kh9irMB',
        'markup_percent' => 'om7KIGIZzYQ0mV0ekz5x',
        'total_cog' => 'Isdlfs3fELaUwg3ZUkhu',
    ];

    private const CONTACT_FIELD_IDS = [
        'property_type' => 'jH56YikqyiylxGCkSboT',
        'lead_source' => 'wqXqAgpr6cAGQXXIK2at',
        'services_interested' => 'LuSuQm6svwBqhvFoEEQC',
        'approx_sq_footage' => '2ghZo6Fc6f1gmFVkU8hv',
    ];

    private const JOB_TYPE_TAGS = [
        'Asphalt Paving' => 'asphalt-paving',
        'Sealcoating' => 'sealcoating',
        'Crack Filling' => 'crack-filling',
        'Pothole Repair' => 'pothole-repair',
        'Concrete Work' => 'concrete',
        'Parking Lot Striping' => 'striping',
        'Grading' => 'grading',
        'Full Service Commercial' => 'commercial',
        'Other' => '',
    ];

    private string $apiKey;
    private string $apiBase;
    private string $apiVersion;
    private string $logFile;

    public function __construct(?string $apiKey = null, ?string $logFile = null, ?string $apiBase = null, ?string $apiVersion = null) {
        $this->loadLocalConfig();

        $this->apiKey = trim((string)($apiKey ?? $this->configValue('CRM_API_KEY')));
        if ($this->apiKey === '') {
            throw new RuntimeException('CRM_API_KEY is not configured. Create config/config.php or set CRM_API_KEY.');
        }

        $this->apiBase = rtrim((string)($apiBase ?? $this->configValue('CRM_API_BASE', self::API_BASE)), '/');
        $this->apiVersion = (string)($apiVersion ?? $this->configValue('CRM_API_VERSION', self::API_VERSION));
        $this->logFile = $logFile ?: dirname(__DIR__) . '/logs/crm_integration.log';
        $this->ensureLogDirectory();
    }

    public function submitQuote(array $calculatorData): array {
        $result = $this->emptyResult();

        try {
            $data = $this->sanitizeCalculatorData($calculatorData);
            $routing = $this->routeFor($data['job']['propertyType'], $data['job']['type']);
            $result['pipeline'] = $routing['pipeline'];

            $contact = $this->findOrCreateContact($data, $routing);
            $result['contactId'] = $contact['contactId'];
            $result['contactCreated'] = $contact['created'];

            try {
                $opportunity = $this->createOpportunity($data, $routing, $result['contactId']);
                $result['opportunityId'] = $this->extractId($opportunity, ['opportunity', 'id']);
                if ($result['opportunityId'] === '') {
                    $result['opportunityId'] = $this->extractId($opportunity, ['id']);
                }
            } catch (Throwable $e) {
                $message = 'Opportunity creation failed: ' . $e->getMessage();
                $this->logMessage('error', $message);
                $result['errors'][] = $message;
            }

            try {
                $invoice = $this->createInvoice($data, $result['contactId']);
                $result['invoiceId'] = $this->extractId($invoice, ['_id']);
                if ($result['invoiceId'] === '') {
                    $result['invoiceId'] = $this->extractId($invoice, ['invoice', '_id']);
                }
                if ($result['invoiceId'] === '') {
                    $result['invoiceId'] = $this->extractId($invoice, ['id']);
                }
            } catch (Throwable $e) {
                $message = 'Invoice creation failed: ' . $e->getMessage();
                $this->logMessage('error', $message);
                $result['errors'][] = $message;
                $result['success'] = false;
                return $result;
            }

            try {
                $note = $this->createCogNote($data, $result['contactId']);
                $result['noteId'] = $this->extractId($note, ['note', 'id']);
                if ($result['noteId'] === '') {
                    $result['noteId'] = $this->extractId($note, ['id']);
                }
            } catch (Throwable $e) {
                $this->logMessage('warning', 'COG note creation failed: ' . $e->getMessage());
            }

            $result['success'] = count($result['errors']) === 0;
            return $result;
        } catch (Throwable $e) {
            $this->logMessage('error', 'CRM quote submission failed: ' . $e->getMessage());
            $result['success'] = false;
            $result['errors'][] = $e->getMessage();
            return $result;
        }
    }

    public function processQuote(array $calculatorData): array {
        return $this->submitQuote($calculatorData);
    }

    private function emptyResult(): array {
        return [
            'success' => false,
            'contactId' => '',
            'opportunityId' => '',
            'invoiceId' => '',
            'noteId' => '',
            'contactCreated' => false,
            'pipeline' => '',
            'errors' => [],
        ];
    }

    private function findOrCreateContact(array $data, array $routing): array {
        $contactId = $this->searchContact($data['contact']['email'], $data['contact']['phone']);
        if ($contactId !== '') {
            return ['contactId' => $contactId, 'created' => false];
        }

        $response = $this->request('POST', '/contacts/', $this->contactPayload($data, $routing));
        $contactId = $this->extractId($response, ['contact', 'id']);
        if ($contactId === '') {
            $contactId = $this->extractId($response, ['id']);
        }
        if ($contactId === '') {
            throw new RuntimeException('Create contact response did not include a contact id.');
        }
        return ['contactId' => $contactId, 'created' => true];
    }

    private function searchContact(string $email, string $phone): string {
        foreach (array_filter([$email, $phone]) as $query) {
            $contactId = $this->searchContactByQuery((string)$query);
            if ($contactId !== '') {
                return $contactId;
            }
        }
        return '';
    }

    private function searchContactByQuery(string $query): string {
        $payload = ['locationId' => self::LOCATION_ID, 'query' => $query, 'page' => 1, 'pageLimit' => 1];
        try {
            $response = $this->request('POST', '/contacts/search', $payload);
        } catch (ABQAsphaltCRMHttpException $e) {
            if (!in_array($e->getStatusCode(), [400, 404, 405, 422], true)) {
                throw $e;
            }
            $response = $this->request('GET', '/contacts/search', [], [
                'locationId' => self::LOCATION_ID,
                'query' => $query,
            ]);
        }

        if (isset($response['contacts'][0]) && is_array($response['contacts'][0])) {
            return (string)($response['contacts'][0]['id'] ?? '');
        }
        if (isset($response['contact']) && is_array($response['contact'])) {
            return (string)($response['contact']['id'] ?? '');
        }
        return '';
    }

    private function createOpportunity(array $data, array $routing, string $contactId): array {
        return $this->request('POST', '/opportunities/', $this->opportunityPayload($data, $routing, $contactId));
    }

    private function createInvoice(array $data, string $contactId): array {
        return $this->request('POST', '/invoices/', $this->invoicePayload($data, $contactId));
    }

    private function createCogNote(array $data, string $contactId): array {
        return $this->request('POST', '/contacts/' . rawurlencode($contactId) . '/notes', [
            'body' => $this->cogNoteBody($data),
        ]);
    }

    private function routeFor(string $propertyType, string $jobType): array {
        $property = strtolower($propertyType);
        $jobTag = self::JOB_TYPE_TAGS[$jobType] ?? $this->slug($jobType);

        if ($property === 'residential') {
            $tags = array_filter(['estimate-sent', 'residential', $jobTag]);
            return [
                'pipeline' => 'residential',
                'pipelineId' => self::RESIDENTIAL_PIPELINE_ID,
                'stageId' => self::RESIDENTIAL_STAGES['estimate_sent'],
                'propertyTag' => 'residential',
                'tags' => array_values($tags),
            ];
        }

        $propertyTag = $property === 'hoa' ? 'hoa' : 'commercial';
        $tags = array_filter(['estimate-sent', $propertyTag, $jobTag]);
        return [
            'pipeline' => 'commercial',
            'pipelineId' => self::COMMERCIAL_PIPELINE_ID,
            'stageId' => self::COMMERCIAL_STAGES['bid_submitted'],
            'propertyTag' => $propertyTag,
            'tags' => array_values($tags),
        ];
    }

    private function contactPayload(array $data, array $routing): array {
        return $this->compactPayload([
            'locationId' => self::LOCATION_ID,
            'firstName' => $data['contact']['firstName'],
            'lastName' => $data['contact']['lastName'],
            'email' => $data['contact']['email'],
            'phone' => $data['contact']['phone'],
            'companyName' => $data['contact']['company'],
            'source' => 'COG Calculator',
            'tags' => $routing['tags'],
            'customFields' => [
                ['id' => self::CONTACT_FIELD_IDS['property_type'], 'field_value' => $data['job']['propertyType']],
                ['id' => self::CONTACT_FIELD_IDS['lead_source'], 'field_value' => 'Google Search'],
                ['id' => self::CONTACT_FIELD_IDS['services_interested'], 'field_value' => [$data['job']['type']]],
                ['id' => self::CONTACT_FIELD_IDS['approx_sq_footage'], 'field_value' => $data['job']['squareFootage']],
            ],
        ]);
    }

    private function opportunityPayload(array $data, array $routing, string $contactId): array {
        $contactName = trim($data['contact']['firstName'] . ' ' . $data['contact']['lastName']);
        return $this->compactPayload([
            'pipelineId' => $routing['pipelineId'],
            'locationId' => self::LOCATION_ID,
            'name' => $contactName . ' - ' . $data['job']['type'] . ' (' . $data['job']['address'] . ')',
            'pipelineStageId' => $routing['stageId'],
            'status' => 'open',
            'contactId' => $contactId,
            'monetaryValue' => $data['pricing']['totalJobPrice'],
            'source' => 'COG Calculator',
            'customFields' => [
                ['id' => self::OPPORTUNITY_FIELD_IDS['job_address'], 'field_value' => $data['job']['address']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['job_type'], 'field_value' => $data['job']['type']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['client_property_type'], 'field_value' => $data['job']['propertyType']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['square_footage'], 'field_value' => $data['job']['squareFootage']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['parking_stalls'], 'field_value' => $data['job']['parkingStalls'] ?? 0],
                ['id' => self::OPPORTUNITY_FIELD_IDS['deposit_status'], 'field_value' => 'Not Collected'],
                ['id' => self::OPPORTUNITY_FIELD_IDS['material_cost_cog'], 'field_value' => $data['pricing']['materialCost']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['labor_cost'], 'field_value' => $data['pricing']['laborCost']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['markup_percent'], 'field_value' => $data['pricing']['markupPercent']],
                ['id' => self::OPPORTUNITY_FIELD_IDS['total_cog'], 'field_value' => $data['pricing']['totalCOG']],
            ],
        ]);
    }

    private function invoicePayload(array $data, string $contactId): array {
        $contactName = trim($data['contact']['firstName'] . ' ' . $data['contact']['lastName']);
        $description = 'Job site: ' . $data['job']['address'] . ' | '
            . $data['job']['squareFootage'] . ' sq ft | Quote #' . $data['meta']['quoteNumber'];

        return $this->compactPayload([
            'altId' => self::LOCATION_ID,
            'altType' => 'location',
            'name' => 'Quote #' . $data['meta']['quoteNumber'] . ' - ' . $data['job']['type'] . ' - ' . $contactName,
            'contactId' => $contactId,
            'contactDetails' => [
                'id' => $contactId,
                'name' => $contactName,
                'email' => $data['contact']['email'],
                'phoneNo' => $data['contact']['phone'],
                'companyName' => $data['contact']['company'],
            ],
            'businessDetails' => [
                'name' => 'ABQAsphalt, LLC',
                'customValues' => [],
            ],
            'currency' => 'USD',
            'automaticTaxesEnabled' => true,
            'discount' => ['type' => 'percentage', 'value' => 0],
            'termsNotes' => '50% deposit required to schedule. Balance due upon completion. All workmanship guaranteed for 1 year from date of completion.',
            'items' => [
                [
                    'name' => $data['job']['type'],
                    'description' => $description,
                    'qty' => 1,
                    'amount' => $data['pricing']['totalJobPrice'],
                    'currency' => 'USD',
                    'taxInclusive' => false,
                    'taxes' => [],
                ],
            ],
        ]);
    }

    private function cogNoteBody(array $data): string {
        $pdfUrl = $data['meta']['pdfUrl'] !== '' ? $data['meta']['pdfUrl'] : 'N/A';
        $extraNotes = $data['meta']['notes'] !== '' ? "\n\nNotes: " . $data['meta']['notes'] : '';

        return
            "COG BREAKDOWN - Calculator Auto-Generated\n"
            . "Quote #:        " . $data['meta']['quoteNumber'] . "\n"
            . "Job Type:       " . $data['job']['type'] . "\n"
            . "Address:        " . $data['job']['address'] . "\n"
            . "Sq Footage:     " . $data['job']['squareFootage'] . " sq ft\n\n"
            . "-- COSTS -----------------------------\n"
            . "Material Cost:  $" . $this->money($data['pricing']['materialCost']) . "\n"
            . "Labor Cost:     $" . $this->money($data['pricing']['laborCost']) . "\n"
            . "Total COG:      $" . $this->money($data['pricing']['totalCOG']) . "\n\n"
            . "-- PRICING ---------------------------\n"
            . "Markup:         " . $data['pricing']['markupPercent'] . "%\n"
            . "Total Job Price:$" . $this->money($data['pricing']['totalJobPrice']) . "\n"
            . "Gross Profit:   $" . $this->money($data['pricing']['grossProfit']) . "\n\n"
            . "PDF Quote:      " . $pdfUrl . "\n"
            . "Source:         COG Calculator"
            . $extraNotes;
    }

    private function sanitizeCalculatorData(array $input): array {
        $contact = is_array($input['contact'] ?? null) ? $input['contact'] : [];
        $job = is_array($input['job'] ?? null) ? $input['job'] : [];
        $pricing = is_array($input['pricing'] ?? null) ? $input['pricing'] : [];
        $meta = is_array($input['meta'] ?? null) ? $input['meta'] : [];

        $email = strtolower($this->requiredEmail($contact['email'] ?? '', 'contact.email'));
        $phone = $this->cleanString($contact['phone'] ?? '', 32);
        if ($phone !== '' && !preg_match('/^\+[1-9]\d{7,14}$/', $phone)) {
            throw new InvalidArgumentException('contact.phone must be E.164 format, e.g. +15051234567.');
        }

        $propertyType = $this->requiredChoice($job['propertyType'] ?? '', 'job.propertyType', [
            'Residential', 'Commercial', 'HOA', 'Government', 'Industrial',
        ]);
        $jobType = $this->requiredChoice($job['type'] ?? '', 'job.type', array_keys(self::JOB_TYPE_TAGS));

        return [
            'contact' => [
                'firstName' => $this->requiredString($contact['firstName'] ?? '', 'contact.firstName', 80),
                'lastName' => $this->requiredString($contact['lastName'] ?? '', 'contact.lastName', 80),
                'email' => $email,
                'phone' => $phone,
                'company' => $this->cleanString($contact['company'] ?? '', 160),
            ],
            'job' => [
                'type' => $jobType,
                'address' => $this->requiredString($job['address'] ?? '', 'job.address', 255),
                'propertyType' => $propertyType,
                'squareFootage' => $this->numberValue($job['squareFootage'] ?? null, 'job.squareFootage'),
                'parkingStalls' => $this->nullableInt($job['parkingStalls'] ?? null),
            ],
            'pricing' => [
                'materialCost' => $this->moneyValue($pricing['materialCost'] ?? null, 'pricing.materialCost'),
                'laborCost' => $this->moneyValue($pricing['laborCost'] ?? null, 'pricing.laborCost'),
                'totalCOG' => $this->moneyValue($pricing['totalCOG'] ?? null, 'pricing.totalCOG'),
                'markupPercent' => $this->numberValue($pricing['markupPercent'] ?? null, 'pricing.markupPercent'),
                'totalJobPrice' => $this->moneyValue($pricing['totalJobPrice'] ?? null, 'pricing.totalJobPrice'),
                'grossProfit' => $this->moneyValue($pricing['grossProfit'] ?? null, 'pricing.grossProfit'),
            ],
            'meta' => [
                'quoteNumber' => $this->requiredString($meta['quoteNumber'] ?? '', 'meta.quoteNumber', 80),
                'pdfUrl' => $this->urlValue($meta['pdfUrl'] ?? ''),
                'notes' => $this->cleanMultiline($meta['notes'] ?? '', 2000),
                'source' => 'COG Calculator',
            ],
        ];
    }

    private function request(string $method, string $path, array $payload = [], array $query = [], array $acceptedStatuses = [200, 201]): array {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('PHP cURL extension is not available.');
        }

        $url = $this->apiBase . '/' . ltrim($path, '/');
        if ($query) {
            $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($query);
        }

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
            'Version: ' . $this->apiVersion,
        ];

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Could not initialize cURL.');
        }

        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ];
        if (strtoupper($method) !== 'GET') {
            $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($body === false) {
                throw new RuntimeException('Could not encode CRM request payload: ' . json_last_error_msg());
            }
            $options[CURLOPT_POSTFIELDS] = $body;
        }
        curl_setopt_array($ch, $options);

        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            $message = 'cURL request failed: ' . $error;
            $this->logMessage('error', $message, ['method' => $method, 'path' => $path]);
            throw new RuntimeException($message);
        }

        $decoded = json_decode((string)$raw, true);
        $response = is_array($decoded) ? $decoded : ['raw' => (string)$raw];

        if (!in_array($status, $acceptedStatuses, true)) {
            $message = $this->apiErrorMessage($status, $response);
            $this->logMessage('error', $message, [
                'method' => $method,
                'path' => $path,
                'payload' => $payload,
                'response' => $response,
            ]);
            throw new ABQAsphaltCRMHttpException($message, $status, $response);
        }

        return $response;
    }

    private function apiErrorMessage(int $status, array $response): string {
        $message = $response['message'] ?? $response['error'] ?? $response['raw'] ?? 'Unknown CRM API error.';
        if (is_array($message)) {
            $message = implode(', ', array_map('strval', $message));
        }
        return 'CRM API error ' . $status . ': ' . (string)$message;
    }

    private function loadLocalConfig(): void {
        $configFile = dirname(__DIR__) . '/config/config.php';
        if (is_file($configFile)) {
            require_once $configFile;
        }

        $envFile = dirname(__DIR__) . '/.env';
        if (is_file($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                    continue;
                }
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                if ($key !== '' && getenv($key) === false) {
                    putenv($key . '=' . $value);
                    $_ENV[$key] = $value;
                }
            }
        }
    }

    private function configValue(string $name, string $default = ''): string {
        $env = getenv($name);
        if ($env !== false && trim((string)$env) !== '') {
            return trim((string)$env);
        }
        if (defined($name)) {
            return trim((string)constant($name));
        }
        return $default;
    }

    private function ensureLogDirectory(): void {
        $dir = dirname($this->logFile);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }

    private function logMessage(string $level, string $message, array $context = []): void {
        $this->ensureLogDirectory();
        $line = gmdate('c') . ' [' . strtoupper($level) . '] ' . $message;
        if ($context) {
            $line .= ' ' . json_encode($this->redact($context), JSON_UNESCAPED_SLASHES);
        }
        $line .= PHP_EOL;
        @file_put_contents($this->logFile, $line, FILE_APPEND | LOCK_EX);
    }

    private function redact(array $value): array {
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->redact($item);
                continue;
            }
            $keyName = strtolower((string)$key);
            if (strpos($keyName, 'authorization') !== false || strpos($keyName, 'token') !== false || strpos($keyName, 'api_key') !== false) {
                $value[$key] = '[redacted]';
            }
        }
        return $value;
    }

    private function extractId(array $source, array $path): string {
        $value = $source;
        foreach ($path as $key) {
            if (!is_array($value) || !array_key_exists($key, $value)) {
                return '';
            }
            $value = $value[$key];
        }
        return is_scalar($value) ? (string)$value : '';
    }

    private function compactPayload(array $payload): array {
        $out = [];
        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $value = $this->compactPayload($value);
            }
            if ($value === null || $value === '') {
                continue;
            }
            $out[$key] = $value;
        }
        return $out;
    }

    private function cleanString($value, int $maxLength = 255): string {
        $value = trim(strip_tags((string)$value));
        $value = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $value) ?? '';
        $value = preg_replace('/\s+/', ' ', $value) ?? '';
        return substr(trim($value), 0, $maxLength);
    }

    private function cleanMultiline($value, int $maxLength = 2000): string {
        $value = trim(strip_tags((string)$value));
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/', ' ', $value) ?? '';
        return substr($value, 0, $maxLength);
    }

    private function requiredString($value, string $field, int $maxLength = 255): string {
        $clean = $this->cleanString($value, $maxLength);
        if ($clean === '') {
            throw new InvalidArgumentException($field . ' is required.');
        }
        return $clean;
    }

    private function requiredEmail($value, string $field): string {
        $email = $this->cleanString($value, 255);
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException($field . ' must be a valid email address.');
        }
        return $email;
    }

    private function requiredChoice($value, string $field, array $allowed): string {
        $clean = $this->requiredString($value, $field, 120);
        foreach ($allowed as $option) {
            if (strcasecmp($clean, (string)$option) === 0) {
                return (string)$option;
            }
        }
        throw new InvalidArgumentException($field . ' must be one of: ' . implode(', ', $allowed) . '.');
    }

    private function moneyValue($value, string $field): float {
        return round($this->numberValue($value, $field), 2);
    }

    private function numberValue($value, string $field): float {
        if (is_string($value)) {
            $value = str_replace([',', '$', ' '], '', $value);
        }
        if (!is_numeric($value)) {
            throw new InvalidArgumentException($field . ' must be numeric.');
        }
        return round((float)$value, 2);
    }

    private function nullableInt($value): ?int {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            return null;
        }
        return (int)$value;
    }

    private function urlValue($value): string {
        $url = $this->cleanString($value, 500);
        if ($url === '') {
            return '';
        }
        return filter_var($url, FILTER_VALIDATE_URL) ? $url : '';
    }

    private function slug(string $value): string {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        return trim($slug, '-');
    }

    private function money(float $value): string {
        return number_format($value, 2, '.', ',');
    }
}
