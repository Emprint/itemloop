<?php

namespace App\Http\Controllers\Api;

use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;

class LocationController extends Controller
{
    public function index()
    {
        return response()->json(Location::all());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'building' => 'required|string|max:255',
            'zone' => 'required|string|max:255',
            'shelf' => 'required|string|max:255',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }
        $location = Location::create($request->all());
        return response()->json($location, 201);
    }

    public function update(Request $request, $id)
    {
        $location = Location::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'building' => 'sometimes|required|string|max:255',
            'zone' => 'sometimes|required|string|max:255',
            'shelf' => 'sometimes|required|string|max:255',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }
        $location->update($request->all());
        return response()->json($location);
    }

    public function destroy($id)
    {
        $location = Location::findOrFail($id);
        $location->delete();
    return response()->json(['success' => true]);
    }
}
