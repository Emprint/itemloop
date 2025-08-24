<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\ProductColor;
use App\Models\ProductCondition;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Intervention\Image\Facades\Image;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // Filtering by condition, location, keyword
        $user = $request->user();
        $query = Product::query();
        if ($request->has('condition')) {
            $query->where('condition', $request->condition);
        }
        if ($request->has('location_id')) {
            $query->where('location_id', $request->location_id);
        }
        if ($request->has('keyword')) {
            $query->where('title', 'like', '%'.$request->keyword.'%');
        }
        // Only show private products to editors/admins
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            $query->where('visibility', 'public');
        }
        return response()->json($query->with('images', 'location')->get());
    }

    public function show($id)
    {
        $product = Product::with('images', 'location')->findOrFail($id);
        return response()->json($product);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to create products.'], 403);
        }
    $result = $this->processProductData($request, null);
        if (isset($result['error'])) {
            return response()->json($result, $result['status'] ?? 422);
        }
        return response()->json($result['product']->load('images'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to update products.'], 403);
        }
        $product = Product::findOrFail($id);
        $result = $this->processProductData($request, $product);
        if (isset($result['error'])) {
            return response()->json($result, $result['status'] ?? 422);
        }
        return response()->json($result['product']->load('images'));
    }
    /**
     * Handle validation, normalization, and color/condition creation for store/update
     */
    private function processProductData(Request $request, ?Product $product)
    {
        $rules = [
            'title' => $product ? 'sometimes|required|string|max:255' : 'required|string|max:255',
            'description' => 'nullable|string',
            'condition' => $product ? 'sometimes|required|string' : 'required|string',
            'quantity' => $product ? 'sometimes|required|integer|min:0' : 'required|integer|min:0',
            'estimated_value' => 'nullable|numeric|regex:/^\d+(\.\d{1,2})?$/',
            'length' => 'nullable|numeric|regex:/^\d+(\.\d{1,2})?$/',
            'width' => 'nullable|numeric|regex:/^\d+(\.\d{1,2})?$/',
            'height' => 'nullable|numeric|regex:/^\d+(\.\d{1,2})?$/',
            'weight' => 'nullable|numeric|regex:/^\d+(\.\d{1,2})?$/',
            'location_id' => $product ? 'sometimes|required|exists:locations,id' : 'required|exists:locations,id',
            'barcode' => 'nullable|string',
            'color' => 'nullable|string',
            'destination' => 'nullable|string',
            'visibility' => 'nullable|in:private,public',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:4096',
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return [
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors(),
                'status' => 422
            ];
        }
        // Ensure color exists
        if ($request->filled('color')) {
            $colorName = strtolower($request->color);
            ProductColor::firstOrCreate(['name' => $colorName]);
        }
        // Ensure condition exists
        if ($request->filled('condition')) {
            $conditionName = strtolower($request->condition);
            ProductCondition::firstOrCreate(['name' => $conditionName]);
        }
        if ($product) {
            $product->update($request->all());
        } else {
            $product = Product::create($request->all());
        }
        return ['product' => $product];
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
    return response()->json(['success' => true]);
    }
}
