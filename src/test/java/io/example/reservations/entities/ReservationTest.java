package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ReservationTest {

    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");

    @Test
    @VerifiesEnt(EntTraceables.ENT_004_RESERVATION)
    void a_reservation_binds_exactly_one_user_one_item_and_one_window() {
        User alice = new User("alice");
        Item meetingRoom = new Item("room-1");
        TimeWindow tenToEleven = new TimeWindow(TEN, ELEVEN);

        Reservation reservation = new Reservation(alice, meetingRoom, tenToEleven);

        assertThat(reservation.user()).isEqualTo(alice);
        assertThat(reservation.item()).isEqualTo(meetingRoom);
        assertThat(reservation.window()).isEqualTo(tenToEleven);
    }
}
