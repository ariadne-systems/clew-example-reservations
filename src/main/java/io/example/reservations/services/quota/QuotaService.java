package io.example.reservations.services.quota;

import io.example.reservations.entities.User;

public interface QuotaService {

    void requireHeadroomFor(User user);
}
