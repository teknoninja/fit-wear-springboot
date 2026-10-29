package com.estore.server.repository;

import com.estore.server.entity.ProductSubcategory;
import com.estore.server.entity.id.ProductSubcategoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductSubcategoryRepository extends JpaRepository<ProductSubcategory, ProductSubcategoryId> {
    List<ProductSubcategory> findByIdSubcategoryId(String subcategoryId);
    List<ProductSubcategory> findByIdSubcategoryIdIn(List<String> subcategoryIds);
    List<ProductSubcategory> findByIdProductId(String productId);
}
