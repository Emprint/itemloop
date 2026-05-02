<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AppSettingsController
{
    private const VALID_KEYS = [
        'currency',
        'open_registration',
        'public_mode',
        'language_mode',
        'fixed_locale',
        'shop_mode',
    ];

    // -----------------------------------------------------------------------
    // GET /api/settings — return all settings (public, no auth required)
    // -----------------------------------------------------------------------
    public function getAll(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $stmt = $db->query('SELECT `key`, `value` FROM app_settings');
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['key']] = $row['value'];
        }

        // Provide defaults for any missing keys so the frontend always gets
        // a complete response even before the migration is applied.
        $defaults = [
            'currency'          => 'EUR',
            'open_registration' => '1',
            'public_mode'       => '1',
            'language_mode'     => 'multi',
            'fixed_locale'      => 'en',
            'shop_mode'         => '1',
        ];

        return $this->json($response, array_merge($defaults, $settings));
    }

    // -----------------------------------------------------------------------
    // PUT /api/settings — update one or more settings (admin only)
    // -----------------------------------------------------------------------
    public function update(Request $request, Response $response): Response
    {
        $body = (array) $request->getParsedBody();
        $db   = Database::get();

        $updated = [];
        foreach ($body as $key => $value) {
            if (!in_array($key, self::VALID_KEYS, true)) {
                continue;
            }

            // Normalize boolean-like settings to '0' or '1'
            if (in_array($key, ['open_registration', 'public_mode', 'shop_mode'], true)) {
                $value = $value ? '1' : '0';
            }

            // Validate language_mode
            if ($key === 'language_mode' && !in_array($value, ['multi', 'single'], true)) {
                continue;
            }

            // Validate fixed_locale (must be a known locale code)
            if ($key === 'fixed_locale') {
                $value = strtolower(trim($value));
                if (!in_array($value, ['en', 'fr'], true)) {
                    continue;
                }
            }

            // Validate currency (ISO 4217 — basic check: 3 uppercase letters)
            if ($key === 'currency') {
                $value = strtoupper(trim($value));
                if (!preg_match('/^[A-Z]{3}$/', $value)) {
                    continue;
                }
            }

            $stmt = $db->prepare(
                'INSERT INTO app_settings (`key`, `value`) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
            );
            $stmt->execute([$key, $value]);
            $updated[] = $key;
        }

        return $this->json($response, [
            'success' => true,
            'updated' => $updated,
        ]);
    }

    // -----------------------------------------------------------------------
    // Helper — read a single setting value (used by other controllers)
    // -----------------------------------------------------------------------
    public static function get(string $key, string $default = ''): string
    {
        try {
            $db   = Database::get();
            $stmt = $db->prepare('SELECT `value` FROM app_settings WHERE `key` = ?');
            $stmt->execute([$key]);
            $value = $stmt->fetchColumn();
            return $value !== false ? (string) $value : $default;
        } catch (\Throwable) {
            return $default;
        }
    }

    // Convenience boolean helper
    public static function isEnabled(string $key, bool $default = true): bool
    {
        $value = self::get($key, $default ? '1' : '0');
        return $value !== '0';
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
