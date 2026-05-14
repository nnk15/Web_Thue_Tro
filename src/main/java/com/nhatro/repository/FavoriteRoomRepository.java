package com.nhatro.repository;

import com.nhatro.entity.FavoriteRoom;
import com.nhatro.entity.Room;
import com.nhatro.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class FavoriteRoomRepository implements PanacheRepository<FavoriteRoom> {
    public List<Room> listRoomsByUser(User user) {
        return getEntityManager()
                .createQuery("""
                        select r
                        from FavoriteRoom f
                        join f.room r
                        join fetch r.landlord
                        where f.user = :user
                        order by f.createdAt desc
                        """, Room.class)
                .setParameter("user", user)
                .getResultList();
    }
}
