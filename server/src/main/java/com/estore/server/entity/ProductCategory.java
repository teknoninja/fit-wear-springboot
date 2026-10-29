package com.estore.server.entity;

import com.estore.server.entity.id.ProductCategoryId;
import jakarta.persistence.*;

@Entity
@Table(name = "product_categories")
public class ProductCategory {

    @EmbeddedId
    private ProductCategoryId id;

    public ProductCategory() {}

    public ProductCategoryId getId() { return id; }
    public void setId(ProductCategoryId id) { this.id = id; }
}
