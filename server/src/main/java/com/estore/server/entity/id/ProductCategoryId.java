package com.estore.server.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ProductCategoryId implements Serializable {

    @Column(name = "product_id", nullable = false)
    private String productId;

    @Column(name = "category_id", nullable = false)
    private String categoryId;

    public ProductCategoryId() {}

    public ProductCategoryId(String productId, String categoryId) {
        this.productId = productId;
        this.categoryId = categoryId;
    }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductCategoryId)) return false;
        ProductCategoryId that = (ProductCategoryId) o;
        return Objects.equals(productId, that.productId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() { return Objects.hash(productId, categoryId); }
}
