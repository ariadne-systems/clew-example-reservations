package io.example.reservations.clock;

import java.time.Instant;

public final class SystemClock implements Clock {

    @Override
    public Instant now() {
        return Instant.now();
    }
}
