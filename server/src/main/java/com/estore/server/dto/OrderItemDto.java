package com.estore.server.dto;

import java.math.BigDecimal;

public class OrderItemDto {
    private String productId;
    private String title;
    private BigDecimal price;
    private Integer quantity;
    private String img;

    public OrderItemDto() {}

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getImg() { return img; }
    public void setImg(String img) { this.img = img; }
}
