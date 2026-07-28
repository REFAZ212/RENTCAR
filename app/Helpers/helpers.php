<?php

if (! function_exists('escapeLike')) {
    function escapeLike(string $value): string
    {
        return str_replace(['%', '_'], ['#%', '#_'], $value);
    }
}

if (! function_exists('whereLikeEscaped')) {
    function whereLikeEscaped($query, string $column, string $search): void
    {
        $escaped = escapeLike($search);
        $query->whereRaw("{$column} LIKE ? ESCAPE '#'", ["%{$escaped}%"]);
    }
}
