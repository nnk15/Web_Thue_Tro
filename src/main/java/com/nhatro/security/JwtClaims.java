package com.nhatro.security;

import com.nhatro.entity.Role;

public record JwtClaims(Long userId, Role role) {
}
