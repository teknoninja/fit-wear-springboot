package com.estore.server.repository;

import com.estore.server.entity.CategorySubcategory;
import com.estore.server.entity.id.CategorySubcategoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategorySubcategoryRepository extends JpaRepository<CategorySubcategory, CategorySubcategoryId> {
    List<CategorySubcategory> findByIdCategoryId(String categoryId);
}
