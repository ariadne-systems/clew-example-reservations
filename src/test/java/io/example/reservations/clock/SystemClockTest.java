package io.example.reservations.clock;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class SystemClockTest {

    private final SystemClock systemClock = new SystemClock();

    @Test
    void the_system_clock_never_reports_an_instant_earlier_than_one_it_reported_before() {
        Instant firstReading = systemClock.now();
        Instant secondReading = systemClock.now();

        assertThat(secondReading).isAfterOrEqualTo(firstReading);
    }
}
