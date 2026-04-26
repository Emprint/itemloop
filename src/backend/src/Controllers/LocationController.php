<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class LocationController
{
    // -------------------------------------------------------------------------
    // Buildings
    // -------------------------------------------------------------------------

    public function buildingsIndex(Request $request, Response $response): Response
    {
        $rows = Database::get()->query('SELECT * FROM buildings ORDER BY name')->fetchAll();
        return $this->json($response, $rows);
    }

    public function buildingsStore(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();
        $name = trim($body['name'] ?? '');
        $code = strtoupper(trim($body['code'] ?? ''));

        $errors = $this->validateBuildingFields($db, $name, $code);
        if ($errors) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);

        $db->prepare('INSERT INTO buildings (name, code) VALUES (?, ?)')->execute([$name, $code]);
        $building = $db->query('SELECT * FROM buildings WHERE id = ' . (int) $db->lastInsertId())->fetch();
        return $this->json($response, $building, 201);
    }

    public function buildingsUpdate(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        $stmt = $db->prepare('SELECT * FROM buildings WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $name = trim($body['name'] ?? '');
        $code = strtoupper(trim($body['code'] ?? ''));

        $errors = $this->validateBuildingFields($db, $name, $code, $id);
        if ($errors) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);

        $db->prepare('UPDATE buildings SET name = ?, code = ?, updated_at = NOW() WHERE id = ?')->execute([$name, $code, $id]);
        $building = $db->query("SELECT * FROM buildings WHERE id = {$id}")->fetch();
        return $this->json($response, $building);
    }

    public function buildingsDestroy(Request $request, Response $response, array $args): Response
    {
        $db = Database::get();
        $id = (int) $args['id'];
        $stmt = $db->prepare('SELECT id FROM buildings WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $db->prepare('DELETE FROM buildings WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Zones
    // -------------------------------------------------------------------------

    public function zonesIndex(Request $request, Response $response): Response
    {
        $sql  = 'SELECT z.*, b.name AS building_name, b.code AS building_code
                 FROM zones z
                 LEFT JOIN buildings b ON b.id = z.building_id
                 ORDER BY z.name';
        $rows = Database::get()->query($sql)->fetchAll();
        return $this->json($response, array_map([$this, 'hydrateZone'], $rows));
    }

    public function zonesStore(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();
        $name        = trim($body['name']        ?? '');
        $code        = strtoupper(trim($body['code'] ?? ''));
        $buildingId  = (int) ($body['building_id'] ?? 0);

        $errors = $this->validateZoneFields($db, $name, $code, $buildingId);
        if ($errors) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);

        $db->prepare('INSERT INTO zones (name, code, building_id) VALUES (?, ?, ?)')->execute([$name, $code, $buildingId]);
        $id   = (int) $db->lastInsertId();
        $stmt = $db->prepare('SELECT z.*, b.name AS building_name, b.code AS building_code FROM zones z LEFT JOIN buildings b ON b.id = z.building_id WHERE z.id = ?');
        $stmt->execute([$id]);
        return $this->json($response, $this->hydrateZone($stmt->fetch()), 201);
    }

    public function zonesUpdate(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        $stmt = $db->prepare('SELECT * FROM zones WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $name       = trim($body['name']        ?? '');
        $code       = strtoupper(trim($body['code'] ?? ''));
        $buildingId = (int) ($body['building_id'] ?? 0);

        $errors = $this->validateZoneFields($db, $name, $code, $buildingId, $id);
        if ($errors) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);

        $db->prepare('UPDATE zones SET name = ?, code = ?, building_id = ?, updated_at = NOW() WHERE id = ?')->execute([$name, $code, $buildingId, $id]);
        $stmt = $db->prepare('SELECT z.*, b.name AS building_name, b.code AS building_code FROM zones z LEFT JOIN buildings b ON b.id = z.building_id WHERE z.id = ?');
        $stmt->execute([$id]);
        return $this->json($response, $this->hydrateZone($stmt->fetch()));
    }

    public function zonesDestroy(Request $request, Response $response, array $args): Response
    {
        $db = Database::get();
        $id = (int) $args['id'];
        $stmt = $db->prepare('SELECT id FROM zones WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $db->prepare('DELETE FROM zones WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Locations (shelves)
    // -------------------------------------------------------------------------

    public function index(Request $request, Response $response): Response
    {
        $sql = 'SELECT l.*,
                    z.name AS zone_name, z.code AS zone_code,
                    b.id AS building_id, b.name AS building_name, b.code AS building_code
                FROM locations l
                LEFT JOIN zones     z ON z.id = l.zone_id
                LEFT JOIN buildings b ON b.id = z.building_id
                ORDER BY l.shelf';
        $rows = Database::get()->query($sql)->fetchAll();
        return $this->json($response, array_map([$this, 'hydrateLocation'], $rows));
    }

    public function store(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();
        $shelf  = trim($body['shelf']   ?? '');
        $code   = strtoupper(trim($body['code'] ?? ''));
        $zoneId = (int) ($body['zone_id'] ?? 0);

        $errors = $this->validateLocationFields($db, $shelf, $code, $zoneId);
        if ($errors) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);

        // Resolve building_id from zone
        $zoneStmt = $db->prepare('SELECT building_id FROM zones WHERE id = ?');
        $zoneStmt->execute([$zoneId]);
        $zone = $zoneStmt->fetch();
        $buildingId = $zone ? (int) $zone['building_id'] : null;

        $db->prepare('INSERT INTO locations (shelf, code, zone_id, building_id) VALUES (?, ?, ?, ?)')->execute([$shelf, $code, $zoneId, $buildingId]);
        $id   = (int) $db->lastInsertId();
        return $this->json($response, $this->fetchLocation($db, $id), 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        $stmt = $db->prepare('SELECT * FROM locations WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $shelf  = trim($body['shelf']   ?? '');
        $code   = strtoupper(trim($body['code'] ?? ''));
        $zoneId = (int) ($body['zone_id'] ?? 0);

        $errors = $this->validateLocationFields($db, $shelf, $code, $zoneId, $id);
        if ($errors) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);

        $zoneStmt = $db->prepare('SELECT building_id FROM zones WHERE id = ?');
        $zoneStmt->execute([$zoneId]);
        $zone = $zoneStmt->fetch();
        $buildingId = $zone ? (int) $zone['building_id'] : null;

        $db->prepare('UPDATE locations SET shelf = ?, code = ?, zone_id = ?, building_id = ?, updated_at = NOW() WHERE id = ?')
           ->execute([$shelf, $code, $zoneId, $buildingId, $id]);

        return $this->json($response, $this->fetchLocation($db, $id));
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $db = Database::get();
        $id = (int) $args['id'];
        $stmt = $db->prepare('SELECT id FROM locations WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $db->prepare('DELETE FROM locations WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function validateBuildingFields(\PDO $db, string $name, string $code, ?int $excludeId = null): array
    {
        $errors = [];
        if ($name === '') { $errors['name'] = ['The name field is required.']; }
        if ($code === '' || !preg_match('/^[A-Z0-9]{3}$/', $code)) {
            $errors['code'] = ['Code must be exactly 3 uppercase alphanumeric characters.'];
        }
        if (!$errors) {
            $sql  = 'SELECT id FROM buildings WHERE name = ?' . ($excludeId ? ' AND id != ?' : '');
            $stmt = $db->prepare($sql);
            $stmt->execute($excludeId ? [$name, $excludeId] : [$name]);
            if ($stmt->fetch()) $errors['name'] = ['This building name is already taken.'];

            $sql  = 'SELECT id FROM buildings WHERE code = ?' . ($excludeId ? ' AND id != ?' : '');
            $stmt = $db->prepare($sql);
            $stmt->execute($excludeId ? [$code, $excludeId] : [$code]);
            if ($stmt->fetch()) $errors['code'] = ['This building code is already taken.'];
        }
        return $errors;
    }

    private function validateZoneFields(\PDO $db, string $name, string $code, int $buildingId, ?int $excludeId = null): array
    {
        $errors = [];
        if ($name === '') $errors['name'] = ['The name field is required.'];
        if ($code === '' || !preg_match('/^[A-Z0-9]{3}$/', $code)) {
            $errors['code'] = ['Code must be exactly 3 uppercase alphanumeric characters.'];
        }
        if ($buildingId <= 0) {
            $errors['building_id'] = ['A valid building must be selected.'];
        } else {
            $stmt = $db->prepare('SELECT id FROM buildings WHERE id = ?');
            $stmt->execute([$buildingId]);
            if (!$stmt->fetch()) $errors['building_id'] = ['The selected building does not exist.'];
        }
        if (!$errors) {
            $sql  = 'SELECT id FROM zones WHERE code = ? AND building_id = ?' . ($excludeId ? ' AND id != ?' : '');
            $args = $excludeId ? [$code, $buildingId, $excludeId] : [$code, $buildingId];
            $stmt = $db->prepare($sql);
            $stmt->execute($args);
            if ($stmt->fetch()) $errors['code'] = ['This code is already used in this building.'];
        }
        return $errors;
    }

    private function validateLocationFields(\PDO $db, string $shelf, string $code, int $zoneId, ?int $excludeId = null): array
    {
        $errors = [];
        if ($shelf === '') $errors['shelf'] = ['The shelf field is required.'];
        if ($code === '' || !preg_match('/^[A-Z0-9]{3}$/', $code)) {
            $errors['code'] = ['Code must be exactly 3 uppercase alphanumeric characters.'];
        }
        if ($zoneId <= 0) {
            $errors['zone_id'] = ['A valid zone must be selected.'];
        } else {
            $stmt = $db->prepare('SELECT id FROM zones WHERE id = ?');
            $stmt->execute([$zoneId]);
            if (!$stmt->fetch()) $errors['zone_id'] = ['The selected zone does not exist.'];
        }
        if (!$errors) {
            $sql  = 'SELECT id FROM locations WHERE code = ? AND zone_id = ?' . ($excludeId ? ' AND id != ?' : '');
            $args = $excludeId ? [$code, $zoneId, $excludeId] : [$code, $zoneId];
            $stmt = $db->prepare($sql);
            $stmt->execute($args);
            if ($stmt->fetch()) $errors['code'] = ['This code is already used in this zone.'];
        }
        return $errors;
    }

    private function fetchLocation(\PDO $db, int $id): array
    {
        $sql = 'SELECT l.*,
                    z.name AS zone_name, z.code AS zone_code,
                    b.id AS building_id, b.name AS building_name, b.code AS building_code
                FROM locations l
                LEFT JOIN zones     z ON z.id = l.zone_id
                LEFT JOIN buildings b ON b.id = z.building_id
                WHERE l.id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);
        return $this->hydrateLocation($stmt->fetch());
    }

    private function hydrateZone(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'name'        => $row['name'],
            'code'        => $row['code'],
            'building_id' => (int) $row['building_id'],
            'building'    => isset($row['building_name']) ? ['id' => (int) $row['building_id'], 'name' => $row['building_name'], 'code' => $row['building_code']] : null,
            'created_at'  => $row['created_at'],
            'updated_at'  => $row['updated_at'],
        ];
    }

    private function hydrateLocation(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'shelf'       => $row['shelf'],
            'code'        => $row['code'],
            'zone_id'     => $row['zone_id'] ? (int) $row['zone_id'] : null,
            'building_id' => $row['building_id'] ? (int) $row['building_id'] : null,
            'zone'        => $row['zone_id'] ? ['id' => (int) $row['zone_id'], 'name' => $row['zone_name'], 'code' => $row['zone_code']] : null,
            'building'    => isset($row['building_id']) && $row['building_id']
                ? ['id' => (int) $row['building_id'], 'name' => $row['building_name'], 'code' => $row['building_code']]
                : null,
            'created_at'  => $row['created_at'],
            'updated_at'  => $row['updated_at'],
        ];
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
