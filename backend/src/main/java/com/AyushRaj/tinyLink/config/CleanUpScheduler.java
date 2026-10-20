package com.AyushRaj.tinyLink.config;

import com.AyushRaj.tinyLink.services.UrlShortenerService;
import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CleanUpScheduler {
    private final UrlShortenerService urlShortenerService;


    @Scheduled(fixedRateString = "#{${tinyLink.cleanup.interval-minutes}*60*1000}")
    public void cleanUpExpiredUrl(){
        try {
            log.debug("Running Scheduled CleanUp of Expired URLs");
            urlShortenerService.cleanupExpiredUrls();

        }catch (Exception e)
        {
            log.error("Failed to clean up expired URLs}", e);
        }
    }
}
