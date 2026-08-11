package io.example.reservations.store;

import clew.traceables.clew.ArchTraceables;
import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.annotation.RealizesArch;
import clew.traceables.clew.annotation.RealizesCon;
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
        // A reservation is indexed under each of its items, so the flattened view repeats a multi-item one.
        return reservationsByItem.values().stream()
                .flatMap(List::stream)
                .filter(reservation -> reservation.user().equals(user))
                .distinct()
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
        addToEveryItemOf(reservation);
    }

    @Override
    @MutatesState
    public synchronized void record(Hold hold) {
        holdsByItem.computeIfAbsent(hold.item(), heldItem -> new ArrayList<>()).add(hold);
    }

    @Override
    @MutatesState
    @RealizesCon(ConTraceables.CON_004_MULTI_ITEM_CONFIRMATION_NEVER_DEADLOCKS)
    public synchronized void replaceHoldsWithReservation(List<Hold> holds, Reservation reservation) {
        holds.forEach(hold -> holdsByItem.getOrDefault(hold.item(), new ArrayList<>()).remove(hold));
        addToEveryItemOf(reservation);
    }

    @Override
    @MutatesState
    public synchronized void remove(Reservation reservation) {
        reservation.items()
                .forEach(reservedItem -> reservationsByItem.getOrDefault(reservedItem, new ArrayList<>())
                        .remove(reservation));
    }

    private void addToEveryItemOf(Reservation reservation) {
        reservation.items()
                .forEach(reservedItem -> reservationsByItem.computeIfAbsent(reservedItem, item -> new ArrayList<>())
                        .add(reservation));
    }

    @Override
    @MutatesState
    public synchronized void remove(Hold hold) {
        holdsByItem.getOrDefault(hold.item(), new ArrayList<>()).remove(hold);
    }
}
