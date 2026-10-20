package com.AyushRaj.tinyLink.services;

import com.AyushRaj.tinyLink.controller.UrlStatsResponse;
import com.AyushRaj.tinyLink.dto.ShortenUrlRequest;
import com.AyushRaj.tinyLink.dto.ShortenUrlResponse;
import com.AyushRaj.tinyLink.dto.UrlAnalyticsResponse;
import com.AyushRaj.tinyLink.models.UrlData;
import com.AyushRaj.tinyLink.models.ClickEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UrlShortenerService {
    private final RedisTemplate<String, Object> redisTemplate;
    private final Map<String, UrlData> urlMapping = new ConcurrentHashMap<>();
    private final Map<String, List<ClickEvent>> clickAnalytics = new ConcurrentHashMap<>();

    @Value("${tinyLink.base-url}")
    private String baseUrl;
    @Value("${tinyLink.short-code.length}")
    private int shortCodeLength;
    @Value("${tinyLink.max-generation-attempts}")
    private int maxGenerationAttempts;
    @Value("${tinyLink.cache-ttl-minutes}")
    private int cacheTtlMinutes;

    private static final String Base_62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";


    public ShortenUrlResponse shortenUrl( ShortenUrlRequest request, String clientIp) {
        String shortCode = request.getCustomAlias();
        if(shortCode == null || shortCode.trim().isEmpty())
        {
            shortCode = generateUniqueShortCode();
        }else {
            shortCode = shortCode.trim();
            if(shortCodeExist(shortCode))
            {
                throw new IllegalArgumentException("Short code already exists");
            }
        }

        UrlData urlData = UrlData.builder()
                .originalUrl(request.getOriginalUrl())
                .shortCode(shortCode)
                .expiresAt(request.getExpiresAt())
                .createdAt(LocalDateTime.now())
                .createdBy(clientIp)
                .clickCount(0)
                .isActive(true)
                .clickEvents(new ArrayList<>())
                .build();

        urlMapping.put(shortCode,urlData);
        clickAnalytics.put(shortCode,new ArrayList<>());


        cacheUrl(shortCode,request.getOriginalUrl());

        log.info("Created short code: {} for URL: {}", shortCode, request.getOriginalUrl());

        return ShortenUrlResponse.builder()
                .shortUrl(buildShortUrl(shortCode))
                .shortCode(shortCode)
                .originalUrl(request.getOriginalUrl())
                .createdAt(urlData.getCreatedAt())
                .expiresAt(urlData.getExpiresAt())
                .build();
    }

    private String buildShortUrl(String shortCode) {

        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0,baseUrl.length()-1) : baseUrl;
        return normalizedBaseUrl + "/api/" + shortCode;
    }

    private void cacheUrl(String shortCode,  String originalUrl) {
        try{
            redisTemplate.opsForValue().set("url"+shortCode,originalUrl,cacheTtlMinutes, TimeUnit.MINUTES);
        }catch (Exception e)
        {
            log.warn("Failed to cache URL: {} :{}", shortCode, e.getMessage());
        }
    }

    private String generateUniqueShortCode() {
        for(int attempt =0; attempt<maxGenerationAttempts; attempt++)
        {
            String code = generateRandomBase62();
            if(!shortCodeExist(code))
            {
                return code;
            }
        }
        throw new RuntimeException("Failed to generate unique short code"+ maxGenerationAttempts + " attempts");
    }

    private boolean shortCodeExist(String code) {
        return urlMapping.containsKey(code);
    }

    private String generateRandomBase62() {
        StringBuilder sb = new StringBuilder(shortCodeLength);
        for (int i =0 ; i < shortCodeLength;i++)
        {
            int index = ThreadLocalRandom.current().nextInt(Base_62_CHARS.length());
            sb.append(Base_62_CHARS.charAt(index));
        }
        return sb.toString();
    }

    public Optional<String> getOriginalUrl(String shortCode) {
        String cachedUrl = getCachedUrl(shortCode);
        if(cachedUrl != null)
        {
            return Optional.of(cachedUrl);
        }
        UrlData urlData = urlMapping.get(shortCode);
        if(urlData != null && urlData.isActive())
        {
            if(isExpired(urlData))
            {
                urlData.setActive(false);
                log.info("Short code: {} has expired", shortCode);
                return Optional.empty();
            }
            cacheUrl(shortCode,urlData.getOriginalUrl());
            return Optional.of(urlData.getOriginalUrl());
        }
        return Optional.empty();
    }

    private boolean isExpired(UrlData urlData) {
        return urlData.getExpiresAt() != null && urlData.getExpiresAt().isBefore(LocalDateTime.now());
    }
    private String getCachedUrl(String shortCode) {
        try{
            return (String) redisTemplate.opsForValue().get("url"+shortCode);
        }catch (Exception e)
        {
            log.warn("Failed to get cached URL for {}: {}", shortCode,e.getMessage());
            return null;
        }
    }

    public void recordClick(String shortCode, String clientIp, String userAgent, String referer) {
        UrlData urlData = urlMapping.get(shortCode);
        if(urlData != null && urlData.isActive())
        {
            urlData.setClickCount(urlData.getClickCount() + 1);
            ClickEvent clickEvent = ClickEvent.builder()
                    .timestamp(LocalDateTime.now())
                    .ipAddress(clientIp)
                    .userAgent(userAgent)
                    .referer(referer)
                    .build();
            clickAnalytics.get(shortCode).add(clickEvent);
            log.debug("Click event recorded for short code: {} at {}", shortCode, clickEvent.getTimestamp());


        }
    }

    public Optional<UrlStatsResponse> getUrlStats(String shortcode) {
        UrlData urlData = urlMapping.get(shortcode);
        if(urlData == null)
        {
            return Optional.empty();
        }
        return Optional.of(
            UrlStatsResponse.builder()
                    .shortCode(shortcode)
                    .originalUrl(urlData.getOriginalUrl())
                    .clickCount(urlData.getClickCount())
                    .createdAt(urlData.getCreatedAt())
                    .expiresAt(urlData.getExpiresAt())
                    .isActive(urlData.isActive())
                    .createdBy(urlData.getCreatedBy())
                    .build()
        );
    }

    public Optional<UrlAnalyticsResponse> getUrlAnalytics(String shortcode) {
        UrlData urlData = urlMapping.get(shortcode);
        if(urlData == null)
        {
            return Optional.empty();
        }
        List<ClickEvent>clicks = clickAnalytics.getOrDefault(shortcode,new ArrayList<>());
        Map<String,Integer>clickByReferrer = clicks.stream()
                .filter(c->c.getReferer() != null)
                .collect(Collectors.groupingBy(
                        ClickEvent::getReferer ,Collectors.summingInt(e->1)
                ));

        Map<String,Integer> clickByHour = clicks.stream()
                .collect(Collectors.groupingBy(
                        c->c.getTimestamp().getHour() +":00",
                        Collectors.summingInt(e->1)
                ));

        Map<String ,Integer> clickByDay = clicks.stream()
                .collect(Collectors.groupingBy(
                        c->c.getTimestamp().toLocalDate().toString(),
                        Collectors.summingInt(e->1)
                ));

        List<ClickEvent> recentClicks = clicks.stream()
                .sorted((a,b)->b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(10)
                .toList();

        return Optional.of(
                UrlAnalyticsResponse.builder()
                        .shortCode(shortcode)
                        .originalUrl(urlData.getOriginalUrl())
                        .totalClicks(urlData.getClickCount())
                        .createdAt(urlData.getCreatedAt())
                        .expiresAt(urlData.getExpiresAt())
                        .recentClicks(recentClicks)
                        .clickByReferrer(clickByReferrer)
                        .clickByHour(clickByHour)
                        .clickByDay(clickByDay)
                        .build()
        );
    }

    public boolean deleteUrl(String shortcode) {
        UrlData urlData = urlMapping.get(shortcode);
        if(urlData != null)
        {
            urlData.setActive(false);
            deleteCacheUrl(shortcode);
            log.info("Deleted URL : {}", shortcode);
            return true;
        }
        return false;
    }

    private void deleteCacheUrl(String shortcode) {
        try{
            redisTemplate.delete("url"+shortcode);
        }catch (Exception e)
        {
            log.warn("Failed to delete cached URL for {}: {}", shortcode,e.getMessage());
        }
    }

    public void cleanupExpiredUrls() {
        int cleanedUpCount = 0;
        for(Map.Entry<String, UrlData> entry : urlMapping.entrySet()) {
            UrlData urlData = entry.getValue();
            if(urlData.getExpiresAt() != null && urlData.getExpiresAt().isBefore(LocalDateTime.now())&& urlData.isActive()) {
                urlData.setActive(false);
                deleteCacheUrl(entry.getKey());
                cleanedUpCount++;
            }
        }
        if (cleanedUpCount > 0)
        {
            log.info("Cleaned up {} expired URLs", cleanedUpCount);
        }
    }
}
