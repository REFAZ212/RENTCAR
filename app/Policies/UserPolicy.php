<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin_utama';
    }

    public function view(User $user, User $target): bool
    {
        return $user->role === 'admin_utama';
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin_utama';
    }

    public function update(User $user, User $target): bool
    {
        return $user->role === 'admin_utama';
    }

    public function delete(User $user, User $target): bool
    {
        return $user->role === 'admin_utama' && $user->id !== $target->id;
    }
}
