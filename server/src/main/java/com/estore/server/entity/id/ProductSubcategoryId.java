package com.estore.server.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ProductSubcategoryId implements Serializable {

    @Column(name = "product_id", nullable = false)
    private String productId;

    @Column(name = "subcategory_id", nullable = false)
    private String subcategoryId;

    public ProductSubcategoryId() {}

    public ProductSubcategoryId(String productId, String subcategoryId) {
        this.productId = productId;
        this.subcategoryId = subcategoryId;
    }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getSubcategoryId() { return subcategoryId; }
    public void setSubcategoryId(String subcategoryId) { this.subcategoryId = subcategoryId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductSubcategoryId)) return false;
        ProductSubcategoryId that = (ProductSubcategoryId) o;
        return Objects.equals(productId, that.productId) && Objects.equals(subcategoryId, that.subcategoryId);
    }

    @Override
    public int hashCode() { return Objects.hash(productId, subcategoryId); }
}
