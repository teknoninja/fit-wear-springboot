package com.estore.server.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class WishlistAddRequest {
    private UUID userId;
    private String productId;
    private String title;
    private BigDecimal price;
    private String img;

    public WishlistAddRequest() {}

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getImg() { return img; }
    public void setImg(String img) { this.img = img; }
}
