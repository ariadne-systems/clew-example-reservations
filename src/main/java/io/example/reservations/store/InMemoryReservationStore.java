package io.example.reservations.store;

import clew.traceables.clew.ArchTraceables;
import clew.traceables.clew.annotation.RealizesArch;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RealizesArch(ArchTraceables.ARCH_001_STATE_CHANGE_THROUGH_STORE)
public final class InMemoryReservationStore implements ReservationStore {

    private final Map<Item, List<Reservation>> reservationsByItem = new HashMap<>();

    @Override
    public synchronized List<Reservation> reservationsFor(Item item) {
        return List.copyOf(reservationsByItem.getOrDefault(item, List.of()));
    }

    @Override
    public synchronized void record(Reservation reservation) {
        reservationsByItem.computeIfAbsent(reservation.item(), reservedItem -> new ArrayList<>()).add(reservation);
    }
}
