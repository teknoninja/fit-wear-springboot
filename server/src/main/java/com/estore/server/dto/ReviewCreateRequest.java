package com.estore.server.dto;

import java.util.UUID;

public class ReviewCreateRequest {
    private UUID userId;
    private Integer rating;
    private String comment;
    private String reviewerName;

    public ReviewCreateRequest() {}

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getReviewerName() { return reviewerName; }
    public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }
}
