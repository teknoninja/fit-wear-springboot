package com.estore.server.repository;

import com.estore.server.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    List<Product> findByType(String type, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE " +
           "LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.brand) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Product> searchProducts(@Param("query") String query, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE " +
           "(:categoryId IS NULL OR p.id IN (SELECT pc.id.productId FROM ProductCategory pc WHERE pc.id.categoryId = :categoryId)) AND " +
           "(:subcategoryId IS NULL OR p.id IN (SELECT ps.id.productId FROM ProductSubcategory ps WHERE ps.id.subcategoryId = :subcategoryId)) AND " +
           "(:type IS NULL OR p.type = :type) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice)")
    Page<Product> findWithFilters(
            @Param("categoryId") String categoryId,
            @Param("subcategoryId") String subcategoryId,
            @Param("type") String type,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable
    );
}
