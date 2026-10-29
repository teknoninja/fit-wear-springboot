package com.estore.server.service;

import com.estore.server.dto.OrderCreateRequest;
import com.estore.server.dto.OrderItemDto;
import com.estore.server.entity.Order;
import com.estore.server.entity.OrderItem;
import com.estore.server.repository.OrderItemRepository;
import com.estore.server.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.estore.server.dto.OrderResponseDto;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    public OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
    }

    public List<OrderResponseDto> getOrdersWithItemsByUser(UUID userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return orders.stream().map(order -> {
            OrderResponseDto dto = new OrderResponseDto();
            dto.setId(order.getId());
            dto.setUserId(order.getUserId());
            dto.setEmail(order.getEmail());
            dto.setStripeSessionId(order.getStripeSessionId());
            dto.setStatus(order.getStatus());
            dto.setTotal(order.getTotal());
            dto.setCurrency(order.getCurrency());
            dto.setShippingAddress(order.getShippingAddress());
            dto.setCreatedAt(order.getCreatedAt());
            dto.setOrderItems(orderItemRepository.findByOrderId(order.getId()));
            return dto;
        }).toList();
    }

    public List<Order> getOrdersByUser(UUID userId) {
        return orderRepository.findByUserId(userId);
    }

    public Optional<Order> getOrderById(UUID id) {
        return orderRepository.findById(id);
    }

    public List<OrderItem> getOrderItems(UUID orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    @Transactional
    public Order createOrder(OrderCreateRequest req) {
        Order order = new Order();
        order.setUserId(req.getUserId());
        order.setEmail(req.getEmail());
        order.setStripeSessionId(req.getStripeSessionId());
        order.setStatus("processing");
        order.setTotal(req.getTotal());
        order.setCurrency(req.getCurrency() != null ? req.getCurrency() : "USD");
        order.setShippingAddress(req.getShippingAddress());
        order.setCreatedAt(OffsetDateTime.now());

        Order savedOrder = orderRepository.save(order);

        if (req.getItems() != null && !req.getItems().isEmpty()) {
            for (OrderItemDto itemDto : req.getItems()) {
                OrderItem item = new OrderItem();
                item.setOrderId(savedOrder.getId());
                item.setProductId(itemDto.getProductId());
                item.setTitle(itemDto.getTitle());
                item.setPrice(itemDto.getPrice());
                item.setQuantity(itemDto.getQuantity() != null ? itemDto.getQuantity() : 1);
                item.setImg(itemDto.getImg());
                orderItemRepository.save(item);
            }
        }

        return savedOrder;
    }
}
