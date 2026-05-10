package com.nhatro.repository;

import com.nhatro.entity.RoomImage;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class RoomImageRepository implements PanacheRepository<RoomImage> {
}
