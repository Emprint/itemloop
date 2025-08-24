<?php
namespace App\Http\Controllers\Api;

use App\Models\ProductCondition;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Http\Controllers\Controller;

class ProductConditionController extends Controller
{
    public function index()
    {
        return ProductCondition::all();
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to add conditions.'], 403);
        }
    $request->validate(['name' => 'required|string|max:255|unique:product_conditions,name']);
    $normalized = mb_strtolower($request->name);
    $condition = ProductCondition::create(['name' => $normalized]);
    return response()->json($condition, Response::HTTP_CREATED);
    }

    public function destroy($id, Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to delete conditions.'], 403);
        }
        $condition = ProductCondition::findOrFail($id);
        $condition->delete();
        return response()->json(['success' => true]);
    }
}
