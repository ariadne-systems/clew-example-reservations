package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class TimeWindowTest {

    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");

    @Test
    @VerifiesEnt(EntTraceables.ENT_002_TIME_WINDOW)
    void windows_overlap_when_they_share_time_and_adjacent_windows_do_not() {
        TimeWindow tenToEleven = new TimeWindow(TEN, ELEVEN);

        assertThat(tenToEleven.overlaps(new TimeWindow(HALF_PAST_TEN, TWELVE))).isTrue();
        assertThat(tenToEleven.overlaps(new TimeWindow(HALF_PAST_TEN, ELEVEN))).isTrue();
        assertThat(new TimeWindow(TEN, TWELVE).overlaps(new TimeWindow(HALF_PAST_TEN, ELEVEN))).isTrue();
        assertThat(tenToEleven.overlaps(new TimeWindow(ELEVEN, TWELVE))).isFalse();
        assertThat(new TimeWindow(ELEVEN, TWELVE).overlaps(tenToEleven)).isFalse();
    }

    @Test
    @VerifiesEnt(EntTraceables.ENT_002_TIME_WINDOW)
    void a_window_whose_end_is_not_after_its_start_is_rejected() {
        assertThatThrownBy(() -> new TimeWindow(ELEVEN, TEN)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TimeWindow(TEN, TEN)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void a_window_overlaps_itself() {
        TimeWindow tenToEleven = new TimeWindow(TEN, ELEVEN);

        assertThat(tenToEleven.overlaps(tenToEleven)).isTrue();
    }
}
