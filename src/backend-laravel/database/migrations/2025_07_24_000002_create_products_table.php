<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('condition');
            $table->integer('quantity')->default(1);
            $table->decimal('estimated_value', 10, 2)->nullable();
            $table->foreignId('location_id')->constrained()->onDelete('cascade');
            $table->string('barcode')->nullable();
            $table->float('length')->nullable();
            $table->float('width')->nullable();
            $table->float('height')->nullable();
            $table->string('color')->nullable();
            $table->float('weight')->nullable();
            $table->string('destination')->nullable();
            $table->boolean('visibility')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
