package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;

@RealizesEnt(EntTraceables.ENT_004_RESERVATION)
public record Reservation(User user, Item item, TimeWindow window) {
}
