package com.nhatro.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "rooms")
public class Room extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "landlord_id", nullable = false)
    public User landlord;

    @Column(nullable = false)
    public String title;

    @Column(nullable = false, precision = 15, scale = 2)
    public BigDecimal price;

    @Column(nullable = false, precision = 15, scale = 2)
    public BigDecimal deposit;

    @Column(nullable = false)
    public Double area;

    @Column(nullable = false, length = 500)
    public String address;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(columnDefinition = "TEXT")
    public String amenities;

    @Column(columnDefinition = "TEXT")
    public String rules;

    @Column(name = "furniture_type", length = 100)
    public String furnitureType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    public RoomStatus status = RoomStatus.AVAILABLE;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 30)
    public ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    public Double latitude;

    public Double longitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
