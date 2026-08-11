package io.example.reservations.services.reservation;

import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.User;

public interface ReservationCancellationService {

    void cancel(User user, Reservation reservation);
}
