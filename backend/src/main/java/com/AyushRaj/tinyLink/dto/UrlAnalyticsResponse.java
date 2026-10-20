package com.AyushRaj.tinyLink.dto;

import com.AyushRaj.tinyLink.models.ClickEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UrlAnalyticsResponse{
    private String shortCode;
    private String originalUrl;
    private int totalClicks;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private List<ClickEvent> recentClicks;
    private Map<String, Integer>clickByReferrer;
    private Map<String, Integer>clickByHour;
    private Map<String, Integer>clickByDay;
}
