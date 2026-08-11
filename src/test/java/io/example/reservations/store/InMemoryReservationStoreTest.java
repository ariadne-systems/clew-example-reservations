package io.example.reservations.store;

import static org.assertj.core.api.Assertions.assertThat;

import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class InMemoryReservationStoreTest {

    private static final User ALICE = new User("alice");
    private static final User BOB = new User("bob");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item WORKSHOP = new Item("room-2");
    private static final Instant HALF_PAST_NINE = Instant.parse("2026-03-01T09:30:00Z");
    private static final TimeWindow TEN_TO_ELEVEN =
            new TimeWindow(Instant.parse("2026-03-01T10:00:00Z"), Instant.parse("2026-03-01T11:00:00Z"));
    private static final TimeWindow ELEVEN_TO_TWELVE =
            new TimeWindow(Instant.parse("2026-03-01T11:00:00Z"), Instant.parse("2026-03-01T12:00:00Z"));

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
        Reservation reservation = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        reservationStore.replaceHoldsWithReservation(List.of(hold), reservation);

        assertThat(reservationStore.holdsFor(MEETING_ROOM)).isEmpty();
        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).containsExactly(reservation);
    }

    @Test
    void replacing_a_set_of_holds_drops_every_one_of_them_and_records_the_reservation_under_each_of_its_items() {
        Hold meetingRoomHold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Hold workshopHold = new Hold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);
        reservationStore.record(meetingRoomHold);
        reservationStore.record(workshopHold);
        Reservation reservation = new Reservation(ALICE, Set.of(MEETING_ROOM, WORKSHOP), TEN_TO_ELEVEN);

        reservationStore.replaceHoldsWithReservation(List.of(meetingRoomHold, workshopHold), reservation);

        assertThat(reservationStore.holdsFor(MEETING_ROOM)).isEmpty();
        assertThat(reservationStore.holdsFor(WORKSHOP)).isEmpty();
        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).containsExactly(reservation);
        assertThat(reservationStore.reservationsFor(WORKSHOP)).containsExactly(reservation);
    }

    @Test
    void a_multi_item_reservation_is_removed_from_every_one_of_its_items() {
        Reservation reservation = new Reservation(ALICE, Set.of(MEETING_ROOM, WORKSHOP), TEN_TO_ELEVEN);
        reservationStore.record(reservation);

        reservationStore.remove(reservation);

        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).isEmpty();
        assertThat(reservationStore.reservationsFor(WORKSHOP)).isEmpty();
    }

    @Test
    void a_removed_reservation_is_no_longer_returned_for_its_item() {
        Reservation reservation = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);
        reservationStore.record(reservation);

        reservationStore.remove(reservation);

        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).isEmpty();
    }

    @Test
    void a_removed_hold_is_no_longer_returned_for_its_item() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        reservationStore.record(hold);

        reservationStore.remove(hold);

        assertThat(reservationStore.holdsFor(MEETING_ROOM)).isEmpty();
    }

    @Test
    void removing_a_claim_the_store_never_recorded_leaves_the_other_claims_untouched() {
        Reservation reservation = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);
        reservationStore.record(reservation);

        reservationStore.remove(new Reservation(ALICE, WORKSHOP, TEN_TO_ELEVEN));
        reservationStore.remove(new Hold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE));

        assertThat(reservationStore.reservationsFor(MEETING_ROOM)).containsExactly(reservation);
    }

    @Test
    void the_claims_owned_by_a_user_are_gathered_across_every_item_and_exclude_other_users_claims() {
        Reservation aliceInTheMeetingRoom = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);
        Hold aliceInTheWorkshop = new Hold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);
        reservationStore.record(aliceInTheMeetingRoom);
        reservationStore.record(aliceInTheWorkshop);
        reservationStore.record(new Reservation(BOB, WORKSHOP, ELEVEN_TO_TWELVE));
        reservationStore.record(new Hold(BOB, MEETING_ROOM, ELEVEN_TO_TWELVE, HALF_PAST_NINE));

        assertThat(reservationStore.reservationsOwnedBy(ALICE)).containsExactly(aliceInTheMeetingRoom);
        assertThat(reservationStore.holdsOwnedBy(ALICE)).containsExactly(aliceInTheWorkshop);
    }

    @Test
    void a_multi_item_reservation_is_owned_once_however_many_items_it_covers() {
        Reservation aliceInBothRooms = new Reservation(ALICE, Set.of(MEETING_ROOM, WORKSHOP), TEN_TO_ELEVEN);
        reservationStore.record(aliceInBothRooms);

        assertThat(reservationStore.reservationsOwnedBy(ALICE)).containsExactly(aliceInBothRooms);
    }

    @Test
    void a_user_with_no_claims_owns_no_reservations_and_no_holds() {
        reservationStore.record(new Reservation(BOB, MEETING_ROOM, TEN_TO_ELEVEN));

        assertThat(reservationStore.reservationsOwnedBy(ALICE)).isEmpty();
        assertThat(reservationStore.holdsOwnedBy(ALICE)).isEmpty();
    }

    @Test
    void replacing_a_hold_the_store_never_recorded_still_records_only_the_reservation() {
        Hold neverRecorded = new Hold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Reservation reservation = new Reservation(ALICE, WORKSHOP, TEN_TO_ELEVEN);

        reservationStore.replaceHoldsWithReservation(List.of(neverRecorded), reservation);

        assertThat(reservationStore.holdsFor(WORKSHOP)).isEmpty();
        assertThat(reservationStore.reservationsFor(WORKSHOP)).containsExactly(reservation);
    }
}
