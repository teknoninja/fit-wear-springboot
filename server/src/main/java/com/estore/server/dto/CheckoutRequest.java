package com.estore.server.dto;

import java.util.List;

public class CheckoutRequest {

    private List<CheckoutItemDto> products;

    public CheckoutRequest() {}

    public CheckoutRequest(List<CheckoutItemDto> products) {
        this.products = products;
    }

    public List<CheckoutItemDto> getProducts() {
        return products;
    }

    public void setProducts(List<CheckoutItemDto> products) {
        this.products = products;
    }
}
