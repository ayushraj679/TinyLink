package com.AyushRaj.tinyLink.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Disable CSRF — stateless REST API, no session cookies
                .csrf(csrf -> csrf.disable())

                // 2. Delegate preflight & actual requests to the MVC CORS config (WebConfig.java)
                //    This MUST be here so Spring Security doesn't block OPTIONS preflight with 403
                .cors(withDefaults())

                // 3. Public endpoints
                .authorizeHttpRequests(auth -> auth
                        // URL shortening (POST /api/shorten)
                        .requestMatchers("/api/shorten").permitAll()
                        // Redirect endpoint (GET /api/{shortCode})
                        .requestMatchers("/api/**").permitAll()
                        // Swagger / OpenAPI UI (springdoc)
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
