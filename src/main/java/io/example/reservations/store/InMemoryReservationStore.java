package io.example.reservations.store;

import clew.traceables.clew.ArchTraceables;
import clew.traceables.clew.annotation.RealizesArch;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.User;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RealizesArch(ArchTraceables.ARCH_001_STATE_CHANGE_THROUGH_STORE)
public final class InMemoryReservationStore implements ReservationStore {

    private final Map<Item, List<Reservation>> reservationsByItem = new HashMap<>();
    private final Map<Item, List<Hold>> holdsByItem = new HashMap<>();

    @Override
    public synchronized List<Reservation> reservationsFor(Item item) {
        return List.copyOf(reservationsByItem.getOrDefault(item, List.of()));
    }

    @Override
    public synchronized List<Hold> holdsFor(Item item) {
        return List.copyOf(holdsByItem.getOrDefault(item, List.of()));
    }

    @Override
    public synchronized List<Reservation> reservationsOwnedBy(User user) {
        return reservationsByItem.values().stream()
                .flatMap(List::stream)
                .filter(reservation -> reservation.user().equals(user))
                .toList();
    }

    @Override
    public synchronized List<Hold> holdsOwnedBy(User user) {
        return holdsByItem.values().stream()
                .flatMap(List::stream)
                .filter(hold -> hold.user().equals(user))
                .toList();
    }

    @Override
    @MutatesState
    public synchronized void record(Reservation reservation) {
        reservationsByItem.computeIfAbsent(reservation.item(), reservedItem -> new ArrayList<>()).add(reservation);
    }

    @Override
    @MutatesState
    public synchronized void record(Hold hold) {
        holdsByItem.computeIfAbsent(hold.item(), heldItem -> new ArrayList<>()).add(hold);
    }

    @Override
    @MutatesState
    public synchronized void replaceHoldWithReservation(Hold hold, Reservation reservation) {
        holdsByItem.getOrDefault(hold.item(), new ArrayList<>()).remove(hold);
        reservationsByItem.computeIfAbsent(reservation.item(), reservedItem -> new ArrayList<>()).add(reservation);
    }

    @Override
    @MutatesState
    public synchronized void remove(Reservation reservation) {
        reservationsByItem.getOrDefault(reservation.item(), new ArrayList<>()).remove(reservation);
    }

    @Override
    @MutatesState
    public synchronized void remove(Hold hold) {
        holdsByItem.getOrDefault(hold.item(), new ArrayList<>()).remove(hold);
    }
}
