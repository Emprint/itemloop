<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Building extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
    ];

    public function zones()
    {
        return $this->hasMany(Zone::class);
    }

    public function locations()
    {
        return $this->hasMany(Location::class);
    }
}
