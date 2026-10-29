package com.estore.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ProfileUpdateRequest {
    @JsonProperty("full_name")
    private String fullName;

    private String phone;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    private Object address;

    public ProfileUpdateRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public Object getAddress() { return address; }
    public void setAddress(Object address) { this.address = address; }
}
