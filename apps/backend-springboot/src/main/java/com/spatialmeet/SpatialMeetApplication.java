package com.spatialmeet;

import com.spatialmeet.service.RoomService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SpatialMeetApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpatialMeetApplication.class, args);
    }

    @Bean
    public CommandLineRunner initializeCache(RoomService roomService) {
        return args -> {
            roomService.syncCache();
        };
    }
}