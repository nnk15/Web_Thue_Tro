package com.nhatro.repository;

import com.nhatro.entity.ViewingAppointment;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ViewingAppointmentRepository implements PanacheRepository<ViewingAppointment> {
}
