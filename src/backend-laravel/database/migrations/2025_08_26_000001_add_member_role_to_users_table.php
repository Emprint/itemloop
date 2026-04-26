<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Change enum to include 'member'
        \DB::statement("ALTER TABLE users MODIFY role ENUM('admin','editor','member','customer') NOT NULL DEFAULT 'customer'");
    }

    public function down(): void
    {
        // Revert to original enum
        \DB::statement("ALTER TABLE users MODIFY role ENUM('admin','editor','customer') NOT NULL DEFAULT 'customer'");
    }
};
