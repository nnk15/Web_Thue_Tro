package com.nhatro.repository;

import com.nhatro.entity.Room;
import com.nhatro.entity.RoomReview;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

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

    public List<RoomReviewStats> statsByRoomIds(List<Long> roomIds) {
        if (roomIds == null || roomIds.isEmpty()) {
            return List.of();
        }

        List<Object[]> rows = getEntityManager()
                .createQuery("""
                        select r.room.id, count(r), avg(r.rating)
                        from RoomReview r
                        where r.room.id in :roomIds
                        group by r.room.id
                        """, Object[].class)
                .setParameter("roomIds", roomIds)
                .getResultList();

        return rows.stream()
                .map(row -> new RoomReviewStats(
                        (Long) row[0],
                        ((Number) row[1]).longValue(),
                        row[2] == null ? null : ((Number) row[2]).doubleValue()
                ))
                .toList();
    }

    public record RoomReviewStats(Long roomId, long reviewCount, Double averageRating) {
    }
}
