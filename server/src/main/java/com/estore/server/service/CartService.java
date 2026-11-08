package com.estore.server.service;

import com.estore.server.entity.Cart;
import com.estore.server.repository.CartRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class CartService {

    private final CartRepository cartRepository;

    public CartService(CartRepository cartRepository) {
        this.cartRepository = cartRepository;
    }

    public Optional<Cart> getCart(UUID userId) {
        return cartRepository.findById(userId);
    }

    public Cart upsertCart(UUID userId, String items) {
        Cart cart = cartRepository.findById(userId).orElseGet(() -> {
            Cart c = new Cart();
            c.setUserId(userId);
            return c;
        });

        cart.setItems(items != null ? items : "[]");
        cart.setUpdatedAt(OffsetDateTime.now());
        return cartRepository.save(cart);
    }
}
