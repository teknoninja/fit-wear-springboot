package com.estore.server.controller;

import com.estore.server.dto.WishlistAddRequest;
import com.estore.server.entity.Wishlist;
import com.estore.server.service.WishlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping("/{userId}")
    public List<Wishlist> getWishlist(@PathVariable UUID userId) {
        return wishlistService.getWishlist(userId);
    }

    @PostMapping
    public ResponseEntity<Wishlist> addToWishlist(@RequestBody WishlistAddRequest req) {
        Wishlist created = wishlistService.addToWishlist(req);
        return ResponseEntity.ok(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeFromWishlist(@PathVariable UUID id) {
        wishlistService.removeFromWishlist(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}/product/{productId}")
    public ResponseEntity<Void> removeFromWishlistByUserAndProduct(
            @PathVariable UUID userId,
            @PathVariable String productId
    ) {
        wishlistService.removeFromWishlistByUserAndProduct(userId, productId);
        return ResponseEntity.noContent().build();
    }
}
