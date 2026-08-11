package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;

@RealizesEnt(EntTraceables.ENT_001_ITEM)
public record Item(String id) {
}
