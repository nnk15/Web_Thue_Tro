package com.nhatro.repository;

import com.nhatro.entity.FavoriteRoom;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class FavoriteRoomRepository implements PanacheRepository<FavoriteRoom> {
}
