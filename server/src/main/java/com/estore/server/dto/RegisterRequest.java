package com.estore.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RegisterRequest {
    private String email;
    private String password;

    @JsonProperty("fullName")
    private String fullName;

    public RegisterRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
}
