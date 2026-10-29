package com.estore.server.service;

import com.estore.server.entity.Product;
import com.estore.server.entity.ProductView;
import com.estore.server.repository.ProductRepository;
import com.estore.server.repository.ProductViewRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductViewRepository productViewRepository;

    public ProductService(ProductRepository productRepository, ProductViewRepository productViewRepository) {
        this.productRepository = productRepository;
        this.productViewRepository = productViewRepository;
    }

    public Page<Product> getProducts(String categoryId, String subcategoryId, String type,
                                    BigDecimal maxPrice, int page, int size, String sort) {
        Sort sortObj = Sort.by(Sort.Direction.ASC, "price");
        if ("desc".equalsIgnoreCase(sort) || "price_desc".equalsIgnoreCase(sort)) {
            sortObj = Sort.by(Sort.Direction.DESC, "price");
        } else if ("newest".equalsIgnoreCase(sort)) {
            sortObj = Sort.by(Sort.Direction.DESC, "createdAt");
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sortObj);
        return productRepository.findWithFilters(categoryId, subcategoryId, type, maxPrice, pageable);
    }

    public Optional<Product> getProductById(String id) {
        return productRepository.findById(id);
    }

    public List<Product> getProductsByType(String type, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "createdAt"));
        return productRepository.findByType(type, pageable);
    }

    public List<Product> searchProducts(String query, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, limit));
        return productRepository.searchProducts(query, pageable);
    }

    public ProductView recordProductView(String productId, UUID userId, String sessionId) {
        ProductView pv = new ProductView();
        pv.setProductId(productId);
        pv.setUserId(userId);
        pv.setSessionId(sessionId);
        pv.setViewedAt(OffsetDateTime.now());
        return productViewRepository.save(pv);
    }
}
