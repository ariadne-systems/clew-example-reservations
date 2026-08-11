package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;
import java.util.Set;

@RealizesEnt(EntTraceables.ENT_004_RESERVATION)
public record Reservation(User user, Set<Item> items, TimeWindow window) {

    public Reservation {
        items = Set.copyOf(items);
        if (items.isEmpty()) {
            throw new IllegalArgumentException("A reservation must cover at least one item");
        }
    }

    public Reservation(User user, Item item, TimeWindow window) {
        this(user, Set.of(item), window);
    }
}
