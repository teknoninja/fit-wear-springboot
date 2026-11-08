package com.estore.server.entity;

import com.estore.server.entity.id.ProductSubcategoryId;
import jakarta.persistence.*;

@Entity
@Table(name = "product_subcategories")
public class ProductSubcategory {

    @EmbeddedId
    private ProductSubcategoryId id;

    public ProductSubcategory() {}

    public ProductSubcategoryId getId() { return id; }
    public void setId(ProductSubcategoryId id) { this.id = id; }
}
