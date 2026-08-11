package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;
import java.time.Instant;

@RealizesEnt(EntTraceables.ENT_005_HOLD)
public record Hold(User user, Item item, TimeWindow window, Instant expiresAt) {

    public boolean isActiveAt(Instant instant) {
        return instant.isBefore(expiresAt);
    }

    public Reservation toReservation() {
        return new Reservation(user, item, window);
    }
}
