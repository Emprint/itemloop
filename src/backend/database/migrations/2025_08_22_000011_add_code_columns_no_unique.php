<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->string('code', 3)->nullable()->after('name');
        });
        Schema::table('zones', function (Blueprint $table) {
            $table->string('code', 3)->nullable()->after('name');
        });
        Schema::table('locations', function (Blueprint $table) {
            $table->string('code', 3)->nullable()->after('shelf');
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropColumn('code');
        });
        Schema::table('zones', function (Blueprint $table) {
            $table->dropColumn('code');
        });
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};
