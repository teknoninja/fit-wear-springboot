package com.estore.server.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public class CheckoutItemDto {

    @JsonAlias({"_id", "id"})
    private String id;

    private Integer quantity;

    public CheckoutItemDto() {}

    public CheckoutItemDto(String id, Integer quantity) {
        this.id = id;
        this.quantity = quantity;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
