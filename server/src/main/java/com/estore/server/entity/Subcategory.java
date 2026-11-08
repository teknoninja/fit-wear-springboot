package com.estore.server.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "subcategories")
public class Subcategory {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "slug")
    private String slug;

    @Column(name = "title", nullable = false)
    private String title;

    public Subcategory() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}
