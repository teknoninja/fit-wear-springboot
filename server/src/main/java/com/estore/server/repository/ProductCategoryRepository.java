package com.estore.server.repository;

import com.estore.server.entity.ProductCategory;
import com.estore.server.entity.id.ProductCategoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, ProductCategoryId> {
    List<ProductCategory> findByIdCategoryId(String categoryId);
    List<ProductCategory> findByIdProductId(String productId);
}
