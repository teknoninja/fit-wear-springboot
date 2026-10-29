package com.estore.server.repository;

import com.estore.server.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUserId(UUID userId);
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Order> findByEmail(String email);
    java.util.Optional<Order> findByStripeSessionId(String stripeSessionId);
}

