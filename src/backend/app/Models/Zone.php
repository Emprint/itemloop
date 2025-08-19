<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Zone extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'building_id',
    ];

    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    public function locations()
    {
        return $this->hasMany(Location::class);
    }
}
