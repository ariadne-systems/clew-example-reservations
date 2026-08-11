package io.example.reservations.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.NfTraceables;
import clew.traceables.clew.StkTraceables;
import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.VerifiesCon;
import clew.traceables.clew.annotation.VerifiesNf;
import clew.traceables.clew.annotation.VerifiesStk;
import clew.traceables.clew.annotation.VerifiesSys;
import io.example.reservations.Reservations;
import io.example.reservations.clock.MutableClock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.hold.ExpiredHoldException;
import io.example.reservations.services.hold.UnknownHoldException;
import io.example.reservations.services.reservation.ItemUnavailableException;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReservationEngineAcceptanceTest {

    private static final User ALICE = new User("alice");
    private static final User BOB = new User("bob");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item WORKSHOP = new Item("room-2");
    private static final Instant NINE = Instant.parse("2026-03-01T09:00:00Z");
    private static final Instant HALF_PAST_NINE = Instant.parse("2026-03-01T09:30:00Z");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);
    private static final TimeWindow HALF_PAST_TEN_TO_TWELVE = new TimeWindow(HALF_PAST_TEN, TWELVE);
    private static final TimeWindow ELEVEN_TO_TWELVE = new TimeWindow(ELEVEN, TWELVE);

    private MutableClock clock;
    private ReservationEngine reservationEngine;

    @BeforeEach
    void beforeEach() {
        clock = new MutableClock(NINE);
        reservationEngine = Reservations.newInMemoryReservationEngine(clock);
    }

    @Test
    @VerifiesStk(StkTraceables.STK_001_NO_DOUBLE_BOOKING)
    void an_item_booked_by_one_party_is_refused_to_another_for_an_overlapping_window() {
        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_001_CONFIRM_RESERVATION)
    void a_confirmation_into_an_empty_schedule_succeeds_and_an_overlapping_one_is_rejected() {
        Reservation reservation = reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirm(ALICE, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_002_AVAILABILITY_QUERY)
    void availability_follows_the_confirmed_reservations_and_the_still_active_holds_that_bear_on_the_window() {
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isTrue();

        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isFalse();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();

        reservationEngine.placeHold(BOB, MEETING_ROOM, ELEVEN_TO_TWELVE, HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isFalse();

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_003_PLACE_HOLD)
    void a_hold_blocks_overlapping_windows_while_it_lasts_and_stops_blocking_once_it_expires() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThat(hold).isEqualTo(new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE));
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isFalse();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();
        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isTrue();
        assertThat(reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isEqualTo(new Reservation(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE));
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_003_PLACE_HOLD)
    void an_active_hold_is_confirmed_into_a_reservation_and_is_consumed_by_that_confirmation() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        Reservation reservation = reservationEngine.confirmHold(hold);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirmHold(hold)).isInstanceOf(UnknownHoldException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_003_PLACE_HOLD)
    void an_expired_hold_can_no_longer_be_confirmed() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        clock.setTo(HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirmHold(hold)).isInstanceOf(ExpiredHoldException.class);
    }

    @Test
    @VerifiesNf(NfTraceables.NF_001_DETERMINISTIC_EXPIRY)
    void only_advancing_the_injected_clock_across_the_expiry_instant_turns_a_held_item_free_again() {
        reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();

        clock.setTo(HALF_PAST_NINE.minusMillis(1));

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isTrue();
    }

    @Test
    @VerifiesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    void no_item_is_bound_by_two_active_claims_over_overlapping_windows_across_a_sequence_of_operations() {
        Hold aliceHold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
        assertThatThrownBy(() -> reservationEngine.placeHold(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE,
                HALF_PAST_NINE))
                .isInstanceOf(ItemUnavailableException.class);

        reservationEngine.confirmHold(aliceHold);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, TEN_TO_ELEVEN))
                .isInstanceOf(ItemUnavailableException.class);

        reservationEngine.confirm(BOB, MEETING_ROOM, ELEVEN_TO_TWELVE);

        assertThatThrownBy(() -> reservationEngine.confirm(ALICE, MEETING_ROOM, ELEVEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    @VerifiesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    void a_window_a_hold_no_longer_claims_is_admitted_to_another_party_once_that_hold_has_expired() {
        reservationEngine.placeHold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, WORKSHOP, TEN_TO_ELEVEN))
                .isInstanceOf(ItemUnavailableException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.confirm(BOB, WORKSHOP, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(BOB, WORKSHOP, TEN_TO_ELEVEN));
    }

    @Test
    void a_second_item_is_unaffected_by_a_reservation_of_the_first() {
        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservationEngine.isAvailable(WORKSHOP, TEN_TO_ELEVEN)).isTrue();
    }

    @Test
    void the_engine_can_be_assembled_with_the_system_clock_and_still_reserves() {
        ReservationEngine systemClockEngine = Reservations.newInMemoryReservationEngine();

        assertThat(systemClockEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
    }
}
