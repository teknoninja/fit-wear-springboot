package com.estore.server.dto;

public class CartSyncRequest {
    private Object items;

    public CartSyncRequest() {}

    public Object getItems() { return items; }
    public void setItems(Object items) { this.items = items; }
}
