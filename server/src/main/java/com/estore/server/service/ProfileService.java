package com.estore.server.service;

import com.estore.server.dto.ProfileResponseDto;
import com.estore.server.dto.ProfileUpdateRequest;
import com.estore.server.entity.Profile;
import com.estore.server.repository.ProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final ObjectMapper objectMapper;

    public ProfileService(ProfileRepository profileRepository, ObjectMapper objectMapper) {
        this.profileRepository = profileRepository;
        this.objectMapper = objectMapper;
    }

    public Optional<ProfileResponseDto> getProfile(UUID id) {
        return profileRepository.findById(id).map(this::toDto);
    }

    public ProfileResponseDto updateProfile(UUID id, ProfileUpdateRequest req) {
        Profile profile = profileRepository.findById(id).orElseGet(() -> {
            Profile p = new Profile();
            p.setId(id);
            p.setCreatedAt(OffsetDateTime.now());
            return p;
        });

        if (req.getFullName() != null) profile.setFullName(req.getFullName());
        if (req.getPhone() != null) profile.setPhone(req.getPhone());
        if (req.getAvatarUrl() != null) profile.setAvatarUrl(req.getAvatarUrl());
        if (req.getAddress() != null) {
            try {
                if (req.getAddress() instanceof String str) {
                    profile.setAddress(str);
                } else {
                    profile.setAddress(objectMapper.writeValueAsString(req.getAddress()));
                }
            } catch (Exception ignored) {}
        }
        profile.setUpdatedAt(OffsetDateTime.now());

        Profile saved = profileRepository.save(profile);
        return toDto(saved);
    }

    private ProfileResponseDto toDto(Profile p) {
        ProfileResponseDto dto = new ProfileResponseDto();
        dto.setId(p.getId());
        dto.setFullName(p.getFullName());
        dto.setPhone(p.getPhone());
        dto.setAvatarUrl(p.getAvatarUrl());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());

        if (p.getAddress() != null && !p.getAddress().isBlank()) {
            try {
                dto.setAddress(objectMapper.readTree(p.getAddress()));
            } catch (Exception e) {
                dto.setAddress(null);
            }
        }
        return dto;
    }
}
