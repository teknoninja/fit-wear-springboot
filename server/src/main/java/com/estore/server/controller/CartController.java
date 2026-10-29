package com.estore.server.controller;

import com.estore.server.dto.CartSyncRequest;
import com.estore.server.entity.Cart;
import com.estore.server.service.CartService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public CartController(CartService cartService, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.cartService = cartService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Cart> getCart(@PathVariable UUID userId) {
        return cartService.getCart(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(new Cart())); // Return empty cart representation if not yet saved
    }

    @PutMapping("/{userId}")
    public ResponseEntity<Cart> updateCart(
            @PathVariable UUID userId,
            @RequestBody CartSyncRequest req
    ) {
        String itemsStr = "[]";
        if (req.getItems() != null) {
            if (req.getItems() instanceof String str) {
                itemsStr = str;
            } else {
                try {
                    itemsStr = objectMapper.writeValueAsString(req.getItems());
                } catch (Exception e) {
                    itemsStr = req.getItems().toString();
                }
            }
        }
        Cart saved = cartService.upsertCart(userId, itemsStr);
        return ResponseEntity.ok(saved);
    }
}
