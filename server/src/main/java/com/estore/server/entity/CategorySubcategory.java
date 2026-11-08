package com.estore.server.entity;

import com.estore.server.entity.id.CategorySubcategoryId;
import jakarta.persistence.*;

@Entity
@Table(name = "category_subcategories")
public class CategorySubcategory {

    @EmbeddedId
    private CategorySubcategoryId id;

    public CategorySubcategory() {}

    public CategorySubcategoryId getId() { return id; }
    public void setId(CategorySubcategoryId id) { this.id = id; }
}
