package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;
import java.time.Instant;

@RealizesEnt(EntTraceables.ENT_002_TIME_WINDOW)
public record TimeWindow(Instant start, Instant end) {

    public TimeWindow {
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("A time window must end after it starts, but was [%s, %s)"
                    .formatted(start, end));
        }
    }

    public boolean overlaps(TimeWindow other) {
        return start.isBefore(other.end) && other.start.isBefore(end);
    }
}
