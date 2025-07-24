<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Intervention\Image\Facades\Image;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // Filtering by condition, location, keyword
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
        return response()->json($query->with('images', 'location')->get());
    }

    public function show($id)
    {
        $product = Product::with('images', 'location')->findOrFail($id);
        return response()->json($product);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'condition' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'estimated_value' => 'nullable|numeric',
            'location_id' => 'required|exists:locations,id',
            'barcode' => 'nullable|string',
            'date' => 'nullable|date',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        $product = Product::create($request->all());

        return response()->json($product->load('images'), 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'condition' => 'sometimes|required|string',
            'quantity' => 'sometimes|required|integer|min:1',
            'estimated_value' => 'nullable|numeric',
            'location_id' => 'sometimes|required|exists:locations,id',
            'barcode' => 'nullable|string',
            'date' => 'nullable|date',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        $product->update($request->all());

        return response()->json($product->load('images'));
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }
}
