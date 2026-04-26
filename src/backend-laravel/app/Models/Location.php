<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    protected $fillable = [
        'building_id',
        'zone_id',
        'shelf',
        'code',
    ];

    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
