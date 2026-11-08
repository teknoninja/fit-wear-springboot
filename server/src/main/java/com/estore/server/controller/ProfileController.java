package com.estore.server.controller;

import com.estore.server.dto.ProfileResponseDto;
import com.estore.server.dto.ProfileUpdateRequest;
import com.estore.server.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfileResponseDto> getProfile(@PathVariable UUID id) {
        return profileService.getProfile(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProfileResponseDto> updateProfile(
            @PathVariable UUID id,
            @RequestBody ProfileUpdateRequest profile
    ) {
        ProfileResponseDto updated = profileService.updateProfile(id, profile);
        return ResponseEntity.ok(updated);
    }
}
