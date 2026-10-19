<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class GarasiPartnerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nama_garasi' => ['required', 'string', 'max:100'],
            'nama_pemilik' => ['required', 'string', 'max:100'],
            'no_hp' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'alamat' => ['required', 'string', 'max:500'],
            'kota' => ['nullable', 'string', 'max:100'],
            'deskripsi_singkat' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_utama' => ['nullable', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nama_garasi' => 'Nama Garasi',
            'nama_pemilik' => 'Nama Pemilik',
            'no_hp' => 'No. HP',
            'alamat' => 'Alamat',
            'kota' => 'Kota/Kabupaten',
            'deskripsi_singkat' => 'Deskripsi singkat',
        ];
    }
}
