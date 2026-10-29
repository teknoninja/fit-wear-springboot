package com.estore.server.controller;

import com.estore.server.dto.ReviewCreateRequest;
import com.estore.server.entity.ProductReview;
import com.estore.server.service.ProductReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ProductReviewController {

    private final ProductReviewService reviewService;

    public ProductReviewController(ProductReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public List<ProductReview> getReviews(@PathVariable String productId) {
        return reviewService.getReviewsForProduct(productId);
    }

    @PostMapping
    public ResponseEntity<ProductReview> addReview(
            @PathVariable String productId,
            @RequestBody ReviewCreateRequest req
    ) {
        ProductReview created = reviewService.addReview(productId, req);
        return ResponseEntity.ok(created);
    }
}
