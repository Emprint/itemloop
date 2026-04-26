<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('color');
            $table->dropColumn('condition');
            $table->dropColumn('category');
            $table->unsignedBigInteger('color_id')->nullable()->after('height');
            $table->unsignedBigInteger('condition_id')->nullable()->after('color_id');
            $table->unsignedBigInteger('category_id')->nullable()->after('condition_id');

            $table->foreign('color_id')->references('id')->on('product_colors')->onDelete('set null');
            $table->foreign('condition_id')->references('id')->on('product_conditions')->onDelete('set null');
            $table->foreign('category_id')->references('id')->on('product_categories')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['color_id']);
            $table->dropForeign(['condition_id']);
            $table->dropForeign(['category_id']);
            $table->dropColumn(['color_id', 'condition_id', 'category_id']);
            $table->string('color')->nullable()->after('height');
            $table->string('condition')->after('color');
            $table->string('category')->nullable()->after('condition');
        });
    }
};
