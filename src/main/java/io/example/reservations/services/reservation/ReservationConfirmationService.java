package io.example.reservations.services.reservation;

import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;

public interface ReservationConfirmationService {

    Reservation confirm(User user, Item item, TimeWindow window);
}
