package com.nhatro.repository;

import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;

@ApplicationScoped
public class UserRepository implements PanacheRepository<User> {
    public Optional<User> findByEmailOrPhone(String login) {
        String normalized = login == null ? "" : login.trim().toLowerCase();
        return find("lower(email) = ?1 or phone = ?2", normalized, login).firstResultOptional();
    }

    public boolean existsByEmail(String email) {
        return count("lower(email) = ?1", email.trim().toLowerCase()) > 0;
    }

    public boolean existsByPhone(String phone) {
        return count("phone = ?1", phone.trim()) > 0;
    }

    public boolean existsByCitizenId(String citizenId) {
        return count("citizenId = ?1", citizenId.trim()) > 0;
    }

    public boolean existsByEmailExceptId(String email, Long id) {
        return count("lower(email) = ?1 and id <> ?2", email.trim().toLowerCase(), id) > 0;
    }

    public boolean existsByPhoneExceptId(String phone, Long id) {
        return count("phone = ?1 and id <> ?2", phone.trim(), id) > 0;
    }

    public boolean existsByCitizenIdExceptId(String citizenId, Long id) {
        return count("citizenId = ?1 and id <> ?2", citizenId.trim(), id) > 0;
    }

    public long countByRole(Role role) {
        return count("role", role);
    }
}
