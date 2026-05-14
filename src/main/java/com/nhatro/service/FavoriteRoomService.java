package com.nhatro.service;

import com.nhatro.dto.RoomDtos;
import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.FavoriteRoom;
import com.nhatro.entity.Room;
import com.nhatro.entity.RoomStatus;
import com.nhatro.entity.User;
import com.nhatro.repository.FavoriteRoomRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.List;

@ApplicationScoped
public class FavoriteRoomService {
    @Inject
    FavoriteRoomRepository favoriteRepository;

    @Inject
    RoomService roomService;

    @Transactional
    public RoomDtos.RoomResponse add(Long roomId, User user) {
        Room room = roomService.getRoom(roomId);
        if (room.approvalStatus != ApprovalStatus.APPROVED || room.status == RoomStatus.HIDDEN) {
            throw new WebApplicationException("Không thể lưu phòng này", Response.Status.BAD_REQUEST);
        }

        favoriteRepository.find("user = ?1 and room = ?2", user, room)
                .firstResultOptional()
                .orElseGet(() -> {
                    FavoriteRoom favorite = new FavoriteRoom();
                    favorite.user = user;
                    favorite.room = room;
                    favoriteRepository.persist(favorite);
                    return favorite;
                });
        return roomService.toResponse(room);
    }

    @Transactional
    public List<RoomDtos.RoomResponse> list(User user) {
        return roomService.toResponses(favoriteRepository.listRoomsByUser(user));
    }

    @Transactional
    public void remove(Long roomId, User user) {
        Room room = roomService.getRoom(roomId);
        long deleted = favoriteRepository.delete("user = ?1 and room = ?2", user, room);
        if (deleted == 0) {
            throw new WebApplicationException("Phòng chưa được lưu yêu thích", Response.Status.NOT_FOUND);
        }
    }
}
