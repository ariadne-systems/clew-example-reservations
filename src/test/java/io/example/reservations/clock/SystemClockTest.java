package io.example.reservations.clock;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class SystemClockTest {

    private static final Instant BEFORE_THIS_TEST_WAS_WRITTEN = Instant.parse("2026-08-11T00:00:00Z");

    private final SystemClock systemClock = new SystemClock();

    @Test
    void the_system_clock_reports_the_passing_current_instant_and_not_a_fixed_one() {
        Instant firstReading = systemClock.now();
        Instant secondReading = systemClock.now();

        assertThat(firstReading).isAfter(BEFORE_THIS_TEST_WAS_WRITTEN);
        assertThat(secondReading).isAfter(BEFORE_THIS_TEST_WAS_WRITTEN);
        assertThat(secondReading).isAfterOrEqualTo(firstReading);
    }
}
