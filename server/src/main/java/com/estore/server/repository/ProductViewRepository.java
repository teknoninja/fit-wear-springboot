package com.estore.server.repository;

import com.estore.server.entity.ProductView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductViewRepository extends JpaRepository<ProductView, Long> {
    List<ProductView> findByProductId(String productId);
    List<ProductView> findByUserId(UUID userId);
}
