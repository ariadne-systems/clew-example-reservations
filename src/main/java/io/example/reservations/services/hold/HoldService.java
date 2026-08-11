package io.example.reservations.services.hold;

import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import java.time.Instant;
import java.util.List;

public interface HoldService {

    Hold place(User user, Item item, TimeWindow window, Instant expiresAt);

    Reservation confirm(Hold hold);

    Reservation confirm(List<Hold> holds);

    void release(User user, Hold hold);
}
