package com.estore.server.service;

import com.estore.server.dto.WishlistAddRequest;
import com.estore.server.entity.Wishlist;
import com.estore.server.repository.WishlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;

    public WishlistService(WishlistRepository wishlistRepository) {
        this.wishlistRepository = wishlistRepository;
    }

    public List<Wishlist> getWishlist(UUID userId) {
        return wishlistRepository.findByUserId(userId);
    }

    public Wishlist addToWishlist(WishlistAddRequest req) {
        Optional<Wishlist> existing = wishlistRepository.findByUserIdAndProductId(req.getUserId(), req.getProductId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Wishlist w = new Wishlist();
        w.setUserId(req.getUserId());
        w.setProductId(req.getProductId());
        w.setTitle(req.getTitle());
        w.setPrice(req.getPrice());
        w.setImg(req.getImg());
        w.setCreatedAt(OffsetDateTime.now());
        return wishlistRepository.save(w);
    }

    public void removeFromWishlist(UUID id) {
        wishlistRepository.deleteById(id);
    }

    @Transactional
    public void removeFromWishlistByUserAndProduct(UUID userId, String productId) {
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
    }
}
