package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;

@RealizesEnt(EntTraceables.ENT_003_USER)
public record User(String id) {
}
