package io.example.reservations.clock;

import java.time.Duration;
import java.time.Instant;

public final class MutableClock implements Clock {

    private Instant currentInstant;

    public MutableClock(Instant initialInstant) {
        this.currentInstant = initialInstant;
    }

    @Override
    public Instant now() {
        return currentInstant;
    }

    public void setTo(Instant instant) {
        currentInstant = instant;
    }

    public void advanceBy(Duration amount) {
        currentInstant = currentInstant.plus(amount);
    }
}
