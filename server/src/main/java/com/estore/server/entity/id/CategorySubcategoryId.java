package com.estore.server.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class CategorySubcategoryId implements Serializable {

    @Column(name = "category_id", nullable = false)
    private String categoryId;

    @Column(name = "subcategory_id", nullable = false)
    private String subcategoryId;

    public CategorySubcategoryId() {}

    public CategorySubcategoryId(String categoryId, String subcategoryId) {
        this.categoryId = categoryId;
        this.subcategoryId = subcategoryId;
    }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public String getSubcategoryId() { return subcategoryId; }
    public void setSubcategoryId(String subcategoryId) { this.subcategoryId = subcategoryId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CategorySubcategoryId)) return false;
        CategorySubcategoryId that = (CategorySubcategoryId) o;
        return Objects.equals(categoryId, that.categoryId) &&
               Objects.equals(subcategoryId, that.subcategoryId);
    }

    @Override
    public int hashCode() { return Objects.hash(categoryId, subcategoryId); }
}
