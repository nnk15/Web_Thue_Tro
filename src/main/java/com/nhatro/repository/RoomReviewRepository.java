package com.nhatro.repository;

import com.nhatro.entity.Room;
import com.nhatro.entity.RoomReview;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class RoomReviewRepository implements PanacheRepository<RoomReview> {
    public long countByRoom(Room room) {
        return count("room", room);
    }

    public Double averageRating(Room room) {
        return getEntityManager()
                .createQuery("select avg(r.rating) from RoomReview r where r.room = :room", Double.class)
                .setParameter("room", room)
                .getSingleResult();
    }
}
