package com.nhatro.repository;

import com.nhatro.entity.RentalRequest;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class RentalRequestRepository implements PanacheRepository<RentalRequest> {
}
