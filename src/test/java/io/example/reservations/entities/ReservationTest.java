package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ReservationTest {

    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final User ALICE = new User("alice");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item PROJECTOR = new Item("projector-1");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);

    @Test
    @VerifiesEnt(EntTraceables.ENT_004_RESERVATION)
    void a_reservation_binds_one_user_one_window_and_exactly_the_items_it_was_given() {
        Reservation reservation = new Reservation(ALICE, Set.of(MEETING_ROOM, PROJECTOR), TEN_TO_ELEVEN);

        assertThat(reservation.user()).isEqualTo(ALICE);
        assertThat(reservation.window()).isEqualTo(TEN_TO_ELEVEN);
        assertThat(reservation.items()).containsExactlyInAnyOrder(MEETING_ROOM, PROJECTOR);
    }

    @Test
    @VerifiesEnt(EntTraceables.ENT_004_RESERVATION)
    void a_reservation_over_no_item_at_all_is_rejected() {
        Set<Item> noItems = Set.of();

        assertThatThrownBy(() -> new Reservation(ALICE, noItems, TEN_TO_ELEVEN))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void a_reservation_of_a_single_item_carries_that_item_as_the_one_element_set() {
        Reservation reservation = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservation.items()).containsExactly(MEETING_ROOM);
        assertThat(reservation).isEqualTo(new Reservation(ALICE, Set.of(MEETING_ROOM), TEN_TO_ELEVEN));
    }

    @Test
    void the_items_of_a_reservation_cannot_be_changed_through_the_set_it_was_built_from() {
        Set<Item> mutableItems = new java.util.HashSet<>(Set.of(MEETING_ROOM));

        Reservation reservation = new Reservation(ALICE, mutableItems, TEN_TO_ELEVEN);
        mutableItems.add(PROJECTOR);

        assertThat(reservation.items()).containsExactly(MEETING_ROOM);
    }
}
