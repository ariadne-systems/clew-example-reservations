package io.example.reservations.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.StkTraceables;
import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.VerifiesCon;
import clew.traceables.clew.annotation.VerifiesStk;
import clew.traceables.clew.annotation.VerifiesSys;
import io.example.reservations.Reservations;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.reservation.ItemUnavailableException;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReservationEngineAcceptanceTest {

    private static final User ALICE = new User("alice");
    private static final User BOB = new User("bob");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);
    private static final TimeWindow HALF_PAST_TEN_TO_TWELVE = new TimeWindow(HALF_PAST_TEN, TWELVE);
    private static final TimeWindow ELEVEN_TO_TWELVE = new TimeWindow(ELEVEN, TWELVE);

    private ReservationEngine reservationEngine;

    @BeforeEach
    void beforeEach() {
        reservationEngine = Reservations.newInMemoryReservationEngine();
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
    void an_item_is_reported_available_until_a_confirmed_reservation_covers_an_overlapping_window() {
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isTrue();

        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isFalse();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();
    }

    @Test
    @VerifiesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    void no_item_is_bound_by_two_reservations_over_overlapping_windows_across_a_sequence_of_operations() {
        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);

        reservationEngine.confirm(BOB, MEETING_ROOM, ELEVEN_TO_TWELVE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isFalse();
        assertThatThrownBy(() -> reservationEngine.confirm(ALICE, MEETING_ROOM, ELEVEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    void a_second_item_is_unaffected_by_a_reservation_of_the_first() {
        Item workshop = new Item("room-2");
        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservationEngine.isAvailable(workshop, TEN_TO_ELEVEN)).isTrue();
    }
}
