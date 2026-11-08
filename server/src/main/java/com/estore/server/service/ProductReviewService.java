package com.estore.server.service;

import com.estore.server.dto.ReviewCreateRequest;
import com.estore.server.entity.ProductReview;
import com.estore.server.repository.ProductReviewRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class ProductReviewService {

    private final ProductReviewRepository reviewRepository;

    public ProductReviewService(ProductReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public List<ProductReview> getReviewsForProduct(String productId) {
        return reviewRepository.findByProductId(productId);
    }

    public ProductReview addReview(String productId, ReviewCreateRequest req) {
        ProductReview review = new ProductReview();
        review.setProductId(productId);
        review.setUserId(req.getUserId());
        review.setRating(req.getRating());
        review.setComment(req.getComment());
        review.setReviewerName(req.getReviewerName());
        review.setCreatedAt(OffsetDateTime.now());
        return reviewRepository.save(review);
    }
}
