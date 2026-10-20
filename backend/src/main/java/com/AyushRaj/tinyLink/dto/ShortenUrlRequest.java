package com.AyushRaj.tinyLink.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortenUrlRequest {
    @NotBlank(message = "Original URL is required")
    @Pattern(regexp = "^https?://.*",message = "Invalid URL format")
    private String originalUrl;
    private String customAlias;
    private LocalDateTime expiresAt;
}
