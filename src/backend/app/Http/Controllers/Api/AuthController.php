<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                'min:8',
                'regex:/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/'
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'ERROR_VALIDATION',
                'errors' => $validator->errors()
            ], 422);
        }

        // Determine role: first user is admin, others are customer by default
        $role = User::count() === 0 ? 'admin' : 'customer';
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $role,
        ]);

        $request->session()->regenerate();
        Auth::login($user);
        return response()->json([
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (Auth::attempt($credentials)) {
            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                Auth::logout();
                $request->session()->invalidate();
                return response()->json(['error' => 'INVALID_CREDENTIALS'], 401);
            }

            $request->session()->regenerate();
            return response()->json(['user' => $user], 200);
        }

        return response()->json(['error' => 'INVALID_CREDENTIALS'], 401);
    }

    public function logout(Request $request)
    {
        $request->session()->invalidate();
        return response()->json(['success' => true]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => $user
        ]);
    }
}
