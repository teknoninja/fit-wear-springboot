package com.estore.server.dto;

import java.util.UUID;

public class ProductViewRequest {
    private UUID userId;
    private String sessionId;

    public ProductViewRequest() {}

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}
