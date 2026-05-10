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
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "rental_requests")
public class RentalRequest extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    public Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    public User tenant;

    @Column(name = "full_name", nullable = false, length = 150)
    public String fullName;

    @Column(nullable = false, length = 20)
    public String phone;

    @Column(name = "citizen_id", nullable = false, length = 30)
    public String citizenId;

    @Column(name = "date_of_birth")
    public LocalDate dateOfBirth;

    @Column(name = "permanent_address", length = 500)
    public String permanentAddress;

    @Column(name = "expected_rental_time", nullable = false, length = 100)
    public String expectedRentalTime;

    @Column(columnDefinition = "TEXT")
    public String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    public RequestStatus status = RequestStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
