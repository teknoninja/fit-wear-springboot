package com.estore.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class UserDto {
    private UUID id;
    private String email;

    @JsonProperty("full_name")
    private String fullName;

    private String role;

    public UserDto() {}

    public UserDto(UUID id, String email, String fullName, String role) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
