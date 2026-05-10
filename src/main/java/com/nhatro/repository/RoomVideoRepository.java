package com.nhatro.repository;

import com.nhatro.entity.RoomVideo;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class RoomVideoRepository implements PanacheRepository<RoomVideo> {
}
