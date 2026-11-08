package com.estore.server.service;

import com.estore.server.entity.Order;
import com.estore.server.entity.OrderItem;
import com.estore.server.repository.OrderItemRepository;
import com.estore.server.repository.OrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.LineItem;
import com.stripe.model.LineItemCollection;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionListLineItemsParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    @Value("${stripe.webhook.secret:}")
    private String webhookSecret;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartService cartService;
    private final ObjectMapper objectMapper;

    public WebhookService(OrderRepository orderRepository,
                          OrderItemRepository orderItemRepository,
                          CartService cartService,
                          ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartService = cartService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) throws Exception {
        Event event;

        if (webhookSecret != null && !webhookSecret.isBlank() && sigHeader != null && !sigHeader.isBlank()) {
            try {
                event = Webhook.constructEvent(payload, sigHeader, webhookSecret.trim());
            } catch (SignatureVerificationException e) {
                log.error("Stripe signature verification failed: {}", e.getMessage());
                throw e;
            }
        } else {
            // In local development or testing without a configured secret, parse payload directly
            log.info("Processing webhook event without signature check (webhook secret not set or signature missing)");
            event = Event.GSON.fromJson(payload, Event.class);
        }

        if (event == null) {
            throw new IllegalArgumentException("Invalid webhook payload.");
        }

        if ("checkout.session.completed".equals(event.getType())) {
            EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
            StripeObject stripeObject = dataObjectDeserializer.getObject().orElse(null);

            if (stripeObject instanceof Session session) {
                processCheckoutSessionCompleted(session);
            } else {
                // If deserializer couldn't unmarshal nested object (e.g. version mismatch), retrieve session directly
                String sessionId = extractSessionId(payload);
                if (sessionId != null) {
                    Session session = Session.retrieve(sessionId);
                    processCheckoutSessionCompleted(session);
                } else {
                    log.warn("Could not extract checkout session from event {}", event.getId());
                }
            }
        } else {
            log.info("Unhandled Stripe event type: {}", event.getType());
        }
    }

    public void processCheckoutSessionCompleted(Session session) throws Exception {


        log.info("Processing completed checkout for session: {}", session.getId());

        // 1. Check idempotency: avoid duplicate order creations on retried webhooks
        Optional<Order> existingOpt = orderRepository.findByStripeSessionId(session.getId());
        Order order = existingOpt.orElseGet(Order::new);

        // 2. Extract user ID from metadata
        UUID userId = null;
        if (session.getMetadata() != null && session.getMetadata().containsKey("userId")) {
            String uIdStr = session.getMetadata().get("userId");
            if (uIdStr != null && !uIdStr.isBlank()) {
                try {
                    userId = UUID.fromString(uIdStr);
                } catch (IllegalArgumentException e) {
                    log.warn("Could not parse userId UUID '{}' from session metadata", uIdStr);
                }
            }
        }

        // 3. Extract email
        String email = null;
        if (session.getCustomerDetails() != null && session.getCustomerDetails().getEmail() != null) {
            email = session.getCustomerDetails().getEmail();
        } else if (session.getCustomerEmail() != null) {
            email = session.getCustomerEmail();
        }

        // 4. Calculate total & currency
        BigDecimal total = BigDecimal.ZERO;
        if (session.getAmountTotal() != null) {
            total = BigDecimal.valueOf(session.getAmountTotal())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        String currency = session.getCurrency() != null ? session.getCurrency() : "usd";

        // 5. Serialize shipping address
        String shippingAddressJson = null;
        Object addressObj = null;
        if (session.getShippingDetails() != null && session.getShippingDetails().getAddress() != null) {
            addressObj = session.getShippingDetails().getAddress();
        } else if (session.getCustomerDetails() != null && session.getCustomerDetails().getAddress() != null) {
            addressObj = session.getCustomerDetails().getAddress();
        }

        if (addressObj != null) {
            try {
                shippingAddressJson = objectMapper.writeValueAsString(addressObj);
            } catch (Exception e) {
                shippingAddressJson = addressObj.toString();
            }
        }

        // 6. Save or update Order
        order.setUserId(userId);
        order.setEmail(email);
        order.setStripeSessionId(session.getId());
        order.setStatus("paid");
        order.setTotal(total);
        order.setCurrency(currency);
        order.setShippingAddress(shippingAddressJson);
        if (order.getCreatedAt() == null) {
            order.setCreatedAt(OffsetDateTime.now());
        }

        Order savedOrder = orderRepository.save(order);
        log.info("Saved order with ID: {}", savedOrder.getId());

        // 7. Retrieve line items with product metadata expanded
        SessionListLineItemsParams params = SessionListLineItemsParams.builder()
                .addExpand("data.price.product")
                .build();

        LineItemCollection lineItems = session.listLineItems(params);

        if (lineItems != null && lineItems.getData() != null) {
            // Delete old items if this was an existing order retry
            if (existingOpt.isPresent()) {
                orderItemRepository.deleteByOrderId(savedOrder.getId());
            }

            List<OrderItem> itemsToSave = new ArrayList<>();
            for (LineItem item : lineItems.getData()) {
                OrderItem orderItem = new OrderItem();
                orderItem.setOrderId(savedOrder.getId());
                orderItem.setTitle(item.getDescription() != null ? item.getDescription() : "Item");
                orderItem.setQuantity(item.getQuantity() != null ? item.getQuantity().intValue() : 1);

                if (item.getPrice() != null && item.getPrice().getUnitAmount() != null) {
                    orderItem.setPrice(BigDecimal.valueOf(item.getPrice().getUnitAmount())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
                } else {
                    orderItem.setPrice(BigDecimal.ZERO);
                }

                String productId = null;
                String img = null;
                if (item.getPrice() != null && item.getPrice().getProductObject() != null) {
                    com.stripe.model.Product stripeProduct = item.getPrice().getProductObject();
                    if (stripeProduct.getMetadata() != null) {
                        productId = stripeProduct.getMetadata().get("productId");
                    }
                    if (stripeProduct.getImages() != null && !stripeProduct.getImages().isEmpty()) {
                        img = stripeProduct.getImages().get(0);
                    }
                }

                orderItem.setProductId(productId);
                orderItem.setImg(img);
                itemsToSave.add(orderItem);
            }

            orderItemRepository.saveAll(itemsToSave);
            log.info("Saved {} order items for order {}", itemsToSave.size(), savedOrder.getId());
        }

        // 8. Clear user cart
        if (userId != null) {
            try {
                cartService.upsertCart(userId, "[]");
                log.info("Cleared cart for user {}", userId);
            } catch (Exception e) {
                log.error("Failed to clear cart for user {}: {}", userId, e.getMessage());
            }
        }
    }

    private String extractSessionId(String payload) {
        try {
            if (payload != null && !payload.isBlank()) {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(payload);
                com.fasterxml.jackson.databind.JsonNode idNode = root.path("data").path("object").path("id");
                if (!idNode.isMissingNode() && !idNode.isNull()) {
                    return idNode.asText();
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}
