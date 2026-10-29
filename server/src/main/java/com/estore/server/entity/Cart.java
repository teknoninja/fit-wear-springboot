package com.estore.server.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "carts")
public class Cart {

    // carts table uses user_id as its primary key (no separate id column)
    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    // jsonb column — stored as a raw JSON String in Java
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "items", nullable = false, columnDefinition = "jsonb")
    private String items;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public Cart() {}

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getItems() { return items; }
    public void setItems(String items) { this.items = items; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
