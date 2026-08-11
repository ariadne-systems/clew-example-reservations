package io.example.reservations.clock;

import clew.traceables.clew.NfTraceables;
import clew.traceables.clew.annotation.RealizesNf;
import java.time.Instant;

@RealizesNf(NfTraceables.NF_001_DETERMINISTIC_EXPIRY)
public interface Clock {

    Instant now();
}
