package com.AyushRaj.tinyLink.controller;

import com.AyushRaj.tinyLink.dto.ShortenUrlRequest;
import com.AyushRaj.tinyLink.dto.ShortenUrlResponse;
import com.AyushRaj.tinyLink.dto.UrlAnalyticsResponse;
import com.AyushRaj.tinyLink.services.RateLimitService;
import com.AyushRaj.tinyLink.services.UrlShortenerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@Slf4j
@RequiredArgsConstructor
public class UrlShortenerController {
    private final UrlShortenerService urlShortenerService;
    private final RateLimitService rateLimitService;


    @PostMapping("/shorten")
    public ResponseEntity<?> shortenUrl(@Valid @RequestBody ShortenUrlRequest request, HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        if(!rateLimitService.isAlloed(clientIp))
        {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate limit exceeded. Please try again later.",
                            "remainingRequest",rateLimitService.getRemainingRequests(clientIp),
                            "timeUntilReset",rateLimitService.getTimeUntilReset(clientIp)));
        }

        try{
            ShortenUrlResponse response = urlShortenerService.shortenUrl(request,clientIp);
            return ResponseEntity.ok(response);
        }catch (IllegalArgumentException e)
        {
            return ResponseEntity.badRequest().body(Map.of("error",e.getMessage()));
        }catch (Exception e)
            {
            return ResponseEntity.internalServerError().body(Map.of("error",
                    "Internal Server Error. Please try again later."));
            }
    }

    @GetMapping("/{shortCode}")
    public ResponseEntity<Void> redirectToUrl(@PathVariable String shortCode ,
                                              HttpServletRequest request, HttpServletResponse response) {
        String clientIp = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        String referer = request.getHeader("Referer");

        Optional<String>OriginalUrl = urlShortenerService.getOriginalUrl(shortCode);
        if(OriginalUrl.isPresent())
        {
            urlShortenerService.recordClick(shortCode , clientIp , userAgent ,referer);
            response.setHeader("Location", OriginalUrl.get());
            return ResponseEntity.status(HttpStatus.FOUND).build();
        }
        else {
            return ResponseEntity.notFound().build();
        }
    }
    @GetMapping("/stats/{shortcode}")
    public ResponseEntity<?> getUrlStatus(@PathVariable String shortcode)
    {
        Optional<UrlStatsResponse> stats = urlShortenerService.getUrlStats(shortcode);
        if(stats.isPresent())
        {
            return ResponseEntity.ok(stats.get());
        }else
        {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error","Short code not found"));
        }
    }

    @GetMapping("/analytics/{shortcode}")
    public ResponseEntity<?> getUrlAnalytics(@PathVariable String shortcode)
    {
        Optional<UrlAnalyticsResponse> analytics = urlShortenerService.getUrlAnalytics(shortcode);
        if(analytics.isPresent())
        {
            return ResponseEntity.ok(analytics.get());
        }else
        {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error","Short code not found"));
        }
    }

    @DeleteMapping("/{shortcode}")
    public ResponseEntity<?>deleteUrl(@PathVariable String shortcode)
    {
        boolean deleted = urlShortenerService.deleteUrl(shortcode);
        if(deleted)
        {
            return ResponseEntity.ok().build();
        }else
        {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error","Short code not found"));
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}
