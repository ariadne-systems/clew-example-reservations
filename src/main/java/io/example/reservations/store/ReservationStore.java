package io.example.reservations.store;

import clew.traceables.clew.ArchTraceables;
import clew.traceables.clew.annotation.RealizesArch;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.User;
import java.util.List;

@RealizesArch(ArchTraceables.ARCH_001_STATE_CHANGE_THROUGH_STORE)
public interface ReservationStore {

    List<Reservation> reservationsFor(Item item);

    List<Hold> holdsFor(Item item);

    List<Reservation> reservationsOwnedBy(User user);

    List<Hold> holdsOwnedBy(User user);

    void record(Reservation reservation);

    void record(Hold hold);

    void replaceHoldWithReservation(Hold hold, Reservation reservation);

    void remove(Reservation reservation);

    void remove(Hold hold);
}
