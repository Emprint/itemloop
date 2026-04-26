<?php

namespace App\Controllers;

use App\Database;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductImageController
{
    public function store(Request $request, Response $response, array $args): Response
    {
        $db        = Database::get();
        $productId = (int) $args['id'];

        $stmt = $db->prepare('SELECT id FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $files = $request->getUploadedFiles()['images'] ?? [];
        if (!is_array($files)) {
            $files = [$files];
        }

        if (empty($files)) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['images' => ['No images provided.']]], 422);
        }

        $storageDir = __DIR__ . '/../../public/storage/products';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        $manager       = new ImageManager(new Driver());
        $createdImages = [];

        foreach ($files as $file) {
            if ($file->getError() !== UPLOAD_ERR_OK) {
                continue;
            }

            $mime     = $file->getClientMediaType();
            $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!in_array($mime, $allowed, true)) {
                return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['images' => ['Only jpeg, png, webp and gif images are allowed.']]], 422);
            }

            $maxBytes = 4 * 1024 * 1024; // 4 MB
            if ($file->getSize() > $maxBytes) {
                return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['images' => ['Each image must be under 4 MB.']]], 422);
            }

            $img  = $manager->read($file->getStream()->getMetadata('uri'));
            $img  = $img->scaleDown(width: 1920, height: 1920);

            $baseName = pathinfo($file->getClientFilename(), PATHINFO_FILENAME);
            $webpName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName) . '_' . uniqid() . '.webp';
            $fullPath = $storageDir . '/' . $webpName;

            file_put_contents($fullPath, $img->toWebp(90));

            $stmt = $db->prepare(
                'INSERT INTO images (product_id, path, format, width, height) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $productId,
                'storage/products/' . $webpName,
                'webp',
                $img->width(),
                $img->height(),
            ]);

            $createdImages[] = [
                'id'     => (int) $db->lastInsertId(),
                'path'   => 'storage/products/' . $webpName,
                'format' => 'webp',
                'width'  => $img->width(),
                'height' => $img->height(),
            ];
        }

        return $this->json($response, ['images' => $createdImages], 201);
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $db        = Database::get();
        $productId = (int) $args['id'];
        $imageId   = (int) $args['image_id'];

        $stmt = $db->prepare('SELECT * FROM images WHERE id = ? AND product_id = ?');
        $stmt->execute([$imageId, $productId]);
        $image = $stmt->fetch();

        if (!$image) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $filePath = __DIR__ . '/../../public/' . $image['path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $db->prepare('DELETE FROM images WHERE id = ?')->execute([$imageId]);
        return $this->json($response, ['success' => true]);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
