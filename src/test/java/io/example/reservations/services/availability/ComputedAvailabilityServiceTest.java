package io.example.reservations.services.availability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.store.ReservationStore;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ComputedAvailabilityServiceTest {

    private static final User ALICE = new User("alice");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");

    @Mock
    private ReservationStore reservationStoreMock;

    private ComputedAvailabilityService availabilityService;

    @BeforeEach
    void beforeEach() {
        availabilityService = new ComputedAvailabilityService(reservationStoreMock);
    }

    @Test
    void an_item_with_no_reservations_is_available() {
        when(reservationStoreMock.reservationsFor(MEETING_ROOM)).thenReturn(List.of());

        assertThat(availabilityService.isAvailable(MEETING_ROOM, new TimeWindow(TEN, ELEVEN))).isTrue();
    }

    @Test
    void an_item_reserved_over_an_overlapping_window_is_not_available() {
        when(reservationStoreMock.reservationsFor(MEETING_ROOM))
                .thenReturn(List.of(new Reservation(ALICE, MEETING_ROOM, new TimeWindow(TEN, TWELVE))));

        assertThat(availabilityService.isAvailable(MEETING_ROOM, new TimeWindow(ELEVEN, TWELVE))).isFalse();
    }

    @Test
    void an_item_reserved_over_an_adjacent_window_stays_available() {
        when(reservationStoreMock.reservationsFor(MEETING_ROOM))
                .thenReturn(List.of(new Reservation(ALICE, MEETING_ROOM, new TimeWindow(TEN, ELEVEN))));

        assertThat(availabilityService.isAvailable(MEETING_ROOM, new TimeWindow(ELEVEN, TWELVE))).isTrue();
    }
}
