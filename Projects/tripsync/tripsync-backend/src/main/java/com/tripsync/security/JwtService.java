package com.tripsync.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    @org.springframework.beans.factory.annotation.Value("${jwt.secret:super-secret-change-me-super-secret-change-me}")
    private String jwtSecret;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long userId, String email) {
        long now = System.currentTimeMillis();
        long expiryMs = 1000L * 60 * 60 * 24 * 7; // 7 days

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiryMs))
                .signWith(getKey())
                .compact();
    }

    /**
     * Central place to parse and verify a token.
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long extractUserId(String token) {
        return parseClaims(token).get("userId", Long.class);
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Used by JwtAuthFilter – just treat username as the email/subject.
     */
    public String extractUsername(String token) {
        return extractEmail(token);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        Date expiration = parseClaims(token).getExpiration();
        return expiration.before(new Date());
    }
}
