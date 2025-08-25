<?php
namespace App\Http\Controllers\Api;

use App\Models\ProductColor;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Http\Controllers\Controller;

class ProductColorController extends Controller
{
    public function index()
    {
        return response()->json(ProductColor::all(['id', 'name']));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to add colors.'], 403);
        }
    $request->validate(['name' => 'required|string|max:255|unique:product_colors,name']);
    $normalized = mb_strtolower($request->name);
    $color = ProductColor::create(['name' => $normalized]);
    return response()->json($color, Response::HTTP_CREATED);
    }

    public function destroy($id, Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to delete colors.'], 403);
        }
        $color = ProductColor::findOrFail($id);
        $color->delete();
        return response()->json(['success' => true]);
    }
}
