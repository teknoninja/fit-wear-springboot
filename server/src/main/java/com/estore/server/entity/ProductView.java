package com.estore.server.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "product_views")
public class ProductView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "product_id", nullable = false)
    private String productId;

    @Column(name = "viewed_at", nullable = false)
    private OffsetDateTime viewedAt;

    public ProductView() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public OffsetDateTime getViewedAt() { return viewedAt; }
    public void setViewedAt(OffsetDateTime viewedAt) { this.viewedAt = viewedAt; }
}
