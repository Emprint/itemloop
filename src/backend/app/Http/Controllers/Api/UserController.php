<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller;

class UserController extends Controller
{
    // List all users (admin only)
    public function index(Request $request)
    {
        $authUser = $request->user();
        if (!$authUser || !$authUser->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $users = User::all();
        return response()->json($users);
    }

    // Save (create or update) a user
    public function save(Request $request)
    {
        $validated = $request->validate([
            'id' => 'nullable|integer|exists:users,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'password' => 'nullable|string|min:8',
            'role' => 'required|string|in:admin,editor,customer',
        ]);
            $authUser = $request->user();
            if (!$authUser || !$authUser->isAdmin()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

        if (isset($validated['id'])) {
            $user = User::find($validated['id']);
            $user->name = $validated['name'];
            $user->email = $validated['email'];
            $user->role = $validated['role'];
            if (!empty($validated['password'])) {
                $user->password = Hash::make($validated['password']);
            }
            $user->save();
        } else {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'role' => $validated['role'],
                'password' => Hash::make($validated['password'] ?? ''),
            ]);
        }

        return response()->json($user);
    }

    // Delete a user
    public function delete(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|integer|exists:users,id',
        ]);
            $authUser = $request->user();
            if (!$authUser || !$authUser->isAdmin()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

        $user = User::find($validated['id']);
        if ($user) {
            // Prevent deletion of last admin
            if ($user->role === 'admin') {
                $adminCount = User::where('role', 'admin')->count();
                if ($adminCount <= 1) {
                    return response()->json(['error' => 'Cannot delete the last admin account.'], 403);
                }
            }
            $user->delete();
            return response()->json(['success' => true]);
        }
        return response()->json(['success' => false], 404);
    }
}
