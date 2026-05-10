package com.nhatro.dto;

public final class AdminDtos {
    private AdminDtos() {
    }

    public record StatisticsResponse(
            long users,
            long tenants,
            long landlords,
            long admins,
            long rooms,
            long pendingRooms,
            long rentalRequests,
            long viewingAppointments,
            long favoriteRooms,
            long violationReports
    ) {
    }
}
