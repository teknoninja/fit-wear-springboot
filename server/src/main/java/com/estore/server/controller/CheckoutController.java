package com.estore.server.controller;

import com.estore.server.dto.CheckoutRequest;
import com.estore.server.dto.CheckoutResponse;
import com.estore.server.service.CheckoutService;
import com.stripe.exception.StripeException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping
    public ResponseEntity<?> checkout(@RequestBody CheckoutRequest request, HttpServletRequest httpRequest) {
        try {
            String userEmail = null;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                if (auth.getPrincipal() instanceof UserDetails userDetails) {
                    userEmail = userDetails.getUsername();
                } else if (auth.getPrincipal() instanceof String email) {
                    userEmail = email;
                }
            }

            String origin = httpRequest.getHeader("Origin");
            if (origin == null || origin.isBlank()) {
                origin = httpRequest.getHeader("Referer");
            }

            CheckoutResponse response = checkoutService.createCheckoutSession(request, userEmail, origin);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Stripe payment error: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Checkout failed: " + e.getMessage()));
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirmCheckout(@RequestBody Map<String, String> body) {
        try {
            String sessionId = body != null ? body.get("sessionId") : null;
            checkoutService.confirmCheckoutSession(sessionId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Confirmation failed: " + e.getMessage()));
        }
    }
}
