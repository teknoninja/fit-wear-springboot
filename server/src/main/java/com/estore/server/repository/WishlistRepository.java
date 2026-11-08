package com.estore.server.repository;

import com.estore.server.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, UUID> {
    List<Wishlist> findByUserId(UUID userId);
    java.util.Optional<Wishlist> findByUserIdAndProductId(UUID userId, String productId);
    void deleteByUserIdAndProductId(UUID userId, String productId);
}
