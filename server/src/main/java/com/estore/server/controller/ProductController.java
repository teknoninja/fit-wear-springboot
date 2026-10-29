package com.estore.server.controller;

import com.estore.server.dto.ProductViewRequest;
import com.estore.server.entity.Product;
import com.estore.server.entity.ProductView;
import com.estore.server.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public Page<Product> getProducts(
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String subcategoryId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "asc") String sort
    ) {
        return productService.getProducts(categoryId, subcategoryId, type, maxPrice, page, size, sort);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable String id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/type/{type}")
    public List<Product> getProductsByType(
            @PathVariable String type,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return productService.getProductsByType(type, limit);
    }

    @GetMapping("/search")
    public List<Product> searchProducts(
            @RequestParam String q,
            @RequestParam(defaultValue = "48") int limit
    ) {
        return productService.searchProducts(q, limit);
    }

    @PostMapping("/{id}/views")
    public ResponseEntity<ProductView> recordProductView(
            @PathVariable String id,
            @RequestBody(required = false) ProductViewRequest req
    ) {
        ProductView pv = productService.recordProductView(
                id,
                req != null ? req.getUserId() : null,
                req != null ? req.getSessionId() : null
        );
        return ResponseEntity.ok(pv);
    }
}
