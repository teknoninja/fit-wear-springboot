package com.estore.server.service;

import com.estore.server.dto.CheckoutItemDto;
import com.estore.server.dto.CheckoutRequest;
import com.estore.server.dto.CheckoutResponse;
import com.estore.server.entity.Product;
import com.estore.server.entity.User;
import com.estore.server.repository.ProductRepository;
import com.estore.server.repository.UserRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CheckoutService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final WebhookService webhookService;

    public CheckoutService(ProductRepository productRepository, UserRepository userRepository, WebhookService webhookService) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.webhookService = webhookService;
    }

    public CheckoutResponse createCheckoutSession(CheckoutRequest req, String userEmail, String origin) throws StripeException {
        if (req == null || req.getProducts() == null || req.getProducts().isEmpty()) {
            throw new IllegalArgumentException("Cart is empty.");
        }

        // Fetch products from database to ensure genuine prices
        List<String> productIds = req.getProducts().stream()
                .map(CheckoutItemDto::getId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toList());

        List<Product> catalogProducts = productRepository.findAllById(productIds);
        Map<String, Product> productMap = catalogProducts.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();

        for (CheckoutItemDto item : req.getProducts()) {
            if (item.getId() == null) continue;
            Product product = productMap.get(item.getId());
            if (product == null) {
                throw new IllegalArgumentException("Product no longer available: " + item.getId());
            }

            int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
            quantity = Math.max(1, Math.min(quantity, 99));

            if (product.getStock() != null && product.getStock() < quantity) {
                throw new IllegalArgumentException("Only " + product.getStock() + " left of \"" + product.getTitle() + "\".");
            }

            long unitAmountCents = product.getPrice()
                    .multiply(new BigDecimal("100"))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValue();

            SessionCreateParams.LineItem.PriceData.ProductData.Builder productDataBuilder =
                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName(product.getTitle() != null ? product.getTitle() : "Item")
                            .putMetadata("productId", product.getId());

            if (product.getImages() != null && product.getImages().length > 0 && product.getImages()[0] != null) {
                String firstImg = product.getImages()[0].trim();
                if (firstImg.startsWith("http://") || firstImg.startsWith("https://")) {
                    productDataBuilder.addImage(firstImg);
                }
            }

            SessionCreateParams.LineItem.PriceData priceData =
                    SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency("usd")
                            .setUnitAmount(unitAmountCents)
                            .setProductData(productDataBuilder.build())
                            .build();

            SessionCreateParams.LineItem lineItem =
                    SessionCreateParams.LineItem.builder()
                            .setQuantity((long) quantity)
                            .setPriceData(priceData)
                            .build();

            lineItems.add(lineItem);
        }

        if (lineItems.isEmpty()) {
            throw new IllegalArgumentException("No valid products found for checkout.");
        }

        String baseOrigin = origin != null && !origin.isBlank() ? origin : "http://localhost:5173";
        if (baseOrigin.endsWith("/")) {
            baseOrigin = baseOrigin.substring(0, baseOrigin.length() - 1);
        }

        SessionCreateParams.Builder sessionBuilder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(baseOrigin + "/orders?success=true&session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(baseOrigin + "/?canceled=true")
                .addAllLineItem(lineItems)
                .setShippingAddressCollection(
                        SessionCreateParams.ShippingAddressCollection.builder()
                                .addAllAllowedCountry(List.of(
                                        SessionCreateParams.ShippingAddressCollection.AllowedCountry.US,
                                        SessionCreateParams.ShippingAddressCollection.AllowedCountry.IN,
                                        SessionCreateParams.ShippingAddressCollection.AllowedCountry.GB,
                                        SessionCreateParams.ShippingAddressCollection.AllowedCountry.CA,
                                        SessionCreateParams.ShippingAddressCollection.AllowedCountry.AU
                                ))
                                .build()
                );

        // Associate user if authenticated
        if (userEmail != null && !userEmail.isBlank()) {
            userRepository.findByEmail(userEmail).ifPresent(user -> {
                sessionBuilder.putMetadata("userId", user.getId().toString());
                sessionBuilder.setCustomerEmail(user.getEmail());
            });
        }

        Session session = Session.create(sessionBuilder.build());
        return new CheckoutResponse(session.getId(), session.getUrl());
    }

    public void confirmCheckoutSession(String sessionId) throws Exception {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("Session ID is required.");
        }
        Session session = Session.retrieve(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Stripe session not found: " + sessionId);
        }
        webhookService.processCheckoutSessionCompleted(session);
    }
}
