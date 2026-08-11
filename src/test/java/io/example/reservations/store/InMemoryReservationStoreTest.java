package io.example.reservations.store;

import static org.assertj.core.api.Assertions.assertThat;

import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class InMemoryReservationStoreTest {

    private static final User ALICE = new User("alice");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item WORKSHOP = new Item("room-2");
    private static final Instant HALF_PAST_NINE = Instant.parse("2026-03-01T09:30:00Z");
    private static final TimeWindow TEN_TO_ELEVEN =
            new TimeWindow(Instant.parse("2026-03-01T10:00:00Z"), Instant.parse("2026-03-01T11:00:00Z"));

    private final InMemoryReservationStore reservationStore = new InMemoryReservationStore();

    @Test
    void a_recorded_reservation_is_returned_for_its_own_item_only() {
        Reservation reservation = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        reservationStore.record(reservation);

        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).containsExactly(reservation);
        assertThat(reservationStore.reservationsFor(WORKSHOP)).isEmpty();
    }

    @Test
    void the_returned_reservations_cannot_be_modified_from_outside_the_store() {
        Reservation reservation = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);
        reservationStore.record(reservation);

        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).isUnmodifiable();
    }

    @Test
    void a_recorded_hold_is_returned_for_its_own_item_only_and_cannot_be_modified_from_outside() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        reservationStore.record(hold);

        assertThat(reservationStore.holdsFor(MEETING_ROOM)).containsExactly(hold).isUnmodifiable();
        assertThat(reservationStore.holdsFor(WORKSHOP)).isEmpty();
    }

    @Test
    void replacing_a_hold_drops_it_and_records_the_reservation_in_one_change() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        reservationStore.record(hold);
        Reservation reservation = hold.toReservation();

        reservationStore.replaceHoldWithReservation(hold, reservation);

        assertThat(reservationStore.holdsFor(MEETING_ROOM)).isEmpty();
        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).containsExactly(reservation);
    }

    @Test
    void replacing_a_hold_the_store_never_recorded_still_records_only_the_reservation() {
        Hold neverRecorded = new Hold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Reservation reservation = neverRecorded.toReservation();

        reservationStore.replaceHoldWithReservation(neverRecorded, reservation);

        assertThat(reservationStore.holdsFor(WORKSHOP)).isEmpty();
        assertThat(reservationStore.reservationsFor(WORKSHOP)).containsExactly(reservation);
    }
}
