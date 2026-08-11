package io.example.reservations.store;

import static org.assertj.core.api.Assertions.assertThat;

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
}
