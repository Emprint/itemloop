<?php

namespace App\Http\Controllers\Api;

use Illuminate\Support\Facades\DB;
use App\Models\Location;
use App\Models\Building;
use App\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;

class LocationController extends Controller
{
    // Buildings CRUD
    public function buildingsIndex()
    {
        return response()->json(Building::all());
    }

    public function buildingsStore(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to create buildings.'], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:buildings,name',
            'code' => 'required|string|size:3|regex:/^[A-Z0-9]{3}$/|unique:buildings,code',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }
        $building = Building::create($request->all());
        return response()->json($building, 201);
    }

    public function buildingsUpdate(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to update buildings.'], 403);
        }
        $building = Building::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:buildings,name,' . $id,
            'code' => 'sometimes|required|string|size:3|regex:/^[A-Z0-9]{3}$/|unique:buildings,code,' . $id,
        ]);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }
        $building->update($request->all());
        return response()->json($building);
    }

    public function buildingsDestroy($id)
    {
        $user = request()->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to delete buildings.'], 403);
        }
        $building = Building::findOrFail($id);
        $building->delete();
        return response()->json(['success' => true]);
    }

    // Zones CRUD
    public function zonesIndex()
    {
        return response()->json(Zone::with('building')->get());
    }

    public function zonesStore(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to create zones.'], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'building_id' => 'required|exists:buildings,id',
            'code' => [
                'required',
                'string',
                'size:3',
                'regex:/^[A-Z0-9]{3}$/',
                function ($attribute, $value, $fail) use ($request) {
                    $exists = \DB::table('zones')
                        ->where('code', $value)
                        ->where('building_id', $request->building_id)
                        ->exists();
                    if ($exists) {
                        $fail('The code has already been taken for this building.');
                    }
                },
            ],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }
        $zone = Zone::create($request->all());
        return response()->json($zone, 201);
    }

    public function zonesUpdate(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to update zones.'], 403);
        }
        $zone = Zone::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'building_id' => 'required|exists:buildings,id',
            'code' => [
                'sometimes',
                'required',
                'string',
                'size:3',
                'regex:/^[A-Z0-9]{3}$/',
                function ($attribute, $value, $fail) use ($request, $id) {
                    $exists = \DB::table('zones')
                        ->where('code', $value)
                        ->where('building_id', $request->building_id)
                        ->where('id', '!=', $id)
                        ->exists();
                    if ($exists) {
                        $fail('The code has already been taken for this building.');
                    }
                },
            ],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }
        $zone->update($request->all());
        return response()->json($zone);
    }

    public function zonesDestroy($id)
    {
        $user = request()->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to delete zones.'], 403);
        }
        $zone = Zone::findOrFail($id);
        $zone->delete();
        return response()->json(['success' => true]);
    }

    // Locations CRUD
    public function index()
    {
    return response()->json(Location::with(['zone.building'])->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to create locations.'], 403);
        }
        $validator = Validator::make($request->all(), [
            'zone_id' => 'required|exists:zones,id',
            'shelf' => 'required|string|max:255',
            'code' => [
                'required',
                'string',
                'size:3',
                'regex:/^[A-Z0-9]{3}$/',
                function ($attribute, $value, $fail) use ($request) {
                    $exists = \DB::table('locations')
                        ->where('code', $value)
                        ->where('zone_id', $request->zone_id)
                        ->exists();
                    if ($exists) {
                        $fail('The code has already been taken for this zone.');
                    }
                },
            ],
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
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to update locations.'], 403);
        }
        $location = Location::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'zone_id' => 'sometimes|required|exists:zones,id',
            'shelf' => 'sometimes|required|string|max:255',
            'code' => [
                'sometimes',
                'required',
                'string',
                'size:3',
                'regex:/^[A-Z0-9]{3}$/',
                function ($attribute, $value, $fail) use ($request, $id) {
                    $exists = \DB::table('locations')
                        ->where('code', $value)
                        ->where('zone_id', $request->zone_id)
                        ->where('id', '!=', $id)
                        ->exists();
                    if ($exists) {
                        $fail('The code has already been taken for this zone.');
                    }
                },
            ],
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
        $user = request()->user();
        if (!$user || (!$user->isAdmin() && !$user->isEditor())) {
            return response()->json(['error' => 'FORBIDDEN', 'message' => 'You do not have permission to delete locations.'], 403);
        }
        $location = Location::findOrFail($id);
        $location->delete();
        return response()->json(['success' => true]);
    }
}
