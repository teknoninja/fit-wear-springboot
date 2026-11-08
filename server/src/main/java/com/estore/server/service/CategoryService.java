package com.estore.server.service;

import com.estore.server.entity.Category;
import com.estore.server.entity.CategorySubcategory;
import com.estore.server.entity.Subcategory;
import com.estore.server.repository.CategoryRepository;
import com.estore.server.repository.CategorySubcategoryRepository;
import com.estore.server.repository.SubcategoryRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategorySubcategoryRepository categorySubcategoryRepository;
    private final SubcategoryRepository subcategoryRepository;

    public CategoryService(CategoryRepository categoryRepository,
                           CategorySubcategoryRepository categorySubcategoryRepository,
                           SubcategoryRepository subcategoryRepository) {
        this.categoryRepository = categoryRepository;
        this.categorySubcategoryRepository = categorySubcategoryRepository;
        this.subcategoryRepository = subcategoryRepository;
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "sortOrder"));
    }

    public Optional<Category> getCategoryById(String id) {
        return categoryRepository.findById(id);
    }

    public List<Subcategory> getSubcategoriesForCategory(String categoryId) {
        List<CategorySubcategory> links = categorySubcategoryRepository.findByIdCategoryId(categoryId);
        if (links.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> subcatIds = links.stream()
                .map(link -> link.getId().getSubcategoryId())
                .toList();

        return subcategoryRepository.findAllById(subcatIds);
    }
}
