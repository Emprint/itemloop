<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    public const DESTINATION_REVIEW = 'review';
    public const DESTINATION_KEEP = 'keep';
    public const DESTINATION_REUSE = 'reuse';
    public const DESTINATION_SELL = 'sell';
    public const DESTINATION_DONATE = 'donate';
    public const DESTINATION_RECYCLE = 'recycle';
    public const DESTINATION_TRASH = 'trash';

    public static function destinationOptions(): array
    {
        return [
            self::DESTINATION_REVIEW,
            self::DESTINATION_KEEP,
            self::DESTINATION_REUSE,
            self::DESTINATION_SELL,
            self::DESTINATION_DONATE,
            self::DESTINATION_RECYCLE,
            self::DESTINATION_TRASH,
        ];
    }

    protected $fillable = [
        'title',
        'description',
        'condition_id',
        'quantity',
        'estimated_value',
        'location_id',
        'barcode',
        'length',
        'width',
        'height',
        'color_id',
        'category_id',
        'weight',
        'destination',
        'visibility'
    ];

    public function isPublic(): bool
    {
        return $this->visibility === 'public';
    }

    public function isPrivate(): bool
    {
        return $this->visibility === 'private';
    }

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function images()
    {
        return $this->hasMany(Image::class);
    }

    public function color()
    {
        return $this->belongsTo(ProductColor::class, 'color_id');
    }

    public function condition()
    {
        return $this->belongsTo(ProductCondition::class, 'condition_id');
    }

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    protected $with = ['color', 'condition', 'category', 'location', 'images'];
}
