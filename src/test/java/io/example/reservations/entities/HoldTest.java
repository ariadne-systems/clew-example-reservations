package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import io.example.reservations.clock.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class HoldTest {

    private static final User ALICE = new User("alice");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);

    @Test
    @VerifiesEnt(EntTraceables.ENT_005_HOLD)
    void a_hold_is_active_strictly_before_its_expiry_instant_and_expired_at_and_after_it() {
        MutableClock clock = new MutableClock(TEN);
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);

        assertThat(hold.isActiveAt(clock.now())).isTrue();

        clock.setTo(HALF_PAST_TEN);
        assertThat(hold.isActiveAt(clock.now())).isFalse();

        clock.advanceBy(Duration.ofSeconds(1));
        assertThat(hold.isActiveAt(clock.now())).isFalse();
    }

    @Test
    void a_hold_binds_one_user_one_item_one_window_and_one_expiry_instant() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);

        assertThat(hold.user()).isEqualTo(ALICE);
        assertThat(hold.item()).isEqualTo(MEETING_ROOM);
        assertThat(hold.window()).isEqualTo(TEN_TO_ELEVEN);
        assertThat(hold.expiresAt()).isEqualTo(HALF_PAST_TEN);
    }

}
