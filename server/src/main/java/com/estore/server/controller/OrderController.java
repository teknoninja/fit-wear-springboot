package com.estore.server.controller;

import com.estore.server.dto.OrderCreateRequest;
import com.estore.server.entity.Order;
import com.estore.server.entity.OrderItem;
import com.estore.server.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import com.estore.server.dto.OrderResponseDto;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/user/{userId}")
    public List<OrderResponseDto> getOrdersByUser(@PathVariable UUID userId) {
        return orderService.getOrdersWithItemsByUser(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable UUID id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/items")
    public List<OrderItem> getOrderItems(@PathVariable UUID id) {
        return orderService.getOrderItems(id);
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderCreateRequest req) {
        Order order = orderService.createOrder(req);
        return ResponseEntity.ok(order);
    }
}
