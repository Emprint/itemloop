<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController
{
    private const ALLOWED_ROLES = ['admin', 'editor', 'member', 'customer'];

    public function index(Request $request, Response $response): Response
    {
        $rows = Database::get()
            ->query('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY name')
            ->fetchAll();

        return $this->json($response, $rows);
    }

    public function save(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();

        $id       = isset($body['id']) && $body['id'] ? (int) $body['id'] : null;
        $name     = trim($body['name']  ?? '');
        $email    = trim($body['email'] ?? '');
        $role     = $body['role']       ?? 'customer';
        $password = $body['password']   ?? '';

        $errors = [];
        if ($name === '')  $errors['name']  = ['The name field is required.'];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = ['A valid email is required.'];
        if (!in_array($role, self::ALLOWED_ROLES, true)) $errors['role'] = ['Invalid role.'];
        if (!$id && strlen($password) < 8) $errors['password'] = ['Password must be at least 8 characters.'];
        if (!$id && !preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/', $password)) {
            $errors['password'] = ['Password must contain at least one letter, one digit, and one special character.'];
        }

        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        if ($id) {
            // Update existing user
            $stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

            // Check email uniqueness excluding self
            $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
            $stmt->execute([$email, $id]);
            if ($stmt->fetch()) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['email' => ['Email already in use.']]], 422);

            if ($password !== '') {
                $db->prepare('UPDATE users SET name = ?, email = ?, role = ?, password = ?, updated_at = NOW() WHERE id = ?')
                   ->execute([$name, $email, $role, password_hash($password, PASSWORD_BCRYPT), $id]);
            } else {
                $db->prepare('UPDATE users SET name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?')
                   ->execute([$name, $email, $role, $id]);
            }
        } else {
            // Create new user
            $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['email' => ['Email already in use.']]], 422);

            $db->prepare('INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)')
               ->execute([$name, $email, $role, password_hash($password, PASSWORD_BCRYPT)]);
            $id = (int) $db->lastInsertId();
        }

        $stmt = $db->prepare('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $this->json($response, $stmt->fetch());
    }

    public function delete(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();
        $id   = (int) ($body['id'] ?? 0);

        if (!$id) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['id' => ['User ID is required.']]], 422);

        // Prevent self-deletion
        $currentUser = $request->getAttribute('user');
        if ((int) $currentUser['id'] === $id) {
            return $this->json($response, ['error' => 'FORBIDDEN', 'message' => 'You cannot delete your own account.'], 403);
        }

        $stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
