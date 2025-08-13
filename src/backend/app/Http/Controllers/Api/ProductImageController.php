<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Image;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProductImageController extends Controller
{
    // Add image to product
    public function store(Request $request, $productId)
    {
        $product = Product::findOrFail($productId);
        $request->validate([
            'images.*' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);
        $manager = new \Intervention\Image\ImageManager(\Intervention\Image\Drivers\Gd\Driver::class);
        $createdImages = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $img = $manager->read($file->getPathname());
                $img = $img->scaleDown(width: 1920, height: 1920);
                $webpName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '_' . uniqid() . '.webp';
                $webpPath = 'products/' . $webpName;
                $webpData = $img->toWebp(90);
                $fullWebpPath = storage_path('app/public/' . $webpPath);
                file_put_contents($fullWebpPath, $webpData);
                $createdImages[] = $product->images()->create([
                    'path' => 'storage/' . $webpPath,
                    'format' => 'webp',
                    'width' => $img->width(),
                    'height' => $img->height(),
                ]);
            }
        }
        return response()->json(['images' => $createdImages], 201);
    }

    // Remove image from product
    public function destroy($productId, $imageId)
    {
        $product = Product::findOrFail($productId);
        $image = $product->images()->findOrFail($imageId);
        // Optionally delete file from disk
        $filePath = storage_path('app/public/' . str_replace('storage/', '', $image->path));
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        $image->delete();
        return response()->json(['message' => 'Image deleted']);
    }
}
