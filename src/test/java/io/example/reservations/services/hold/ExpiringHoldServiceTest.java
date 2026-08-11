package io.example.reservations.services.hold;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.VerifiesSw;
import io.example.reservations.clock.MutableClock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.services.reservation.ItemUnavailableException;
import io.example.reservations.store.ReservationStore;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExpiringHoldServiceTest {

    private static final User ALICE = new User("alice");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant QUARTER_PAST_TEN = Instant.parse("2026-03-01T10:15:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);

    @Mock
    private AvailabilityService availabilityServiceMock;

    @Mock
    private ReservationStore reservationStoreMock;

    private MutableClock clock;
    private ExpiringHoldService holdService;

    @BeforeEach
    void beforeEach() {
        clock = new MutableClock(TEN);
        holdService = new ExpiringHoldService(availabilityServiceMock, reservationStoreMock, clock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_002_HOLD_SERVICE)
    void availability_is_computed_before_the_single_change_that_places_the_hold_reaches_the_store() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(true);

        Hold hold = holdService.place(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);

        assertThat(hold).isEqualTo(new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN));
        InOrder decisionThenChange = inOrder(availabilityServiceMock, reservationStoreMock);
        decisionThenChange.verify(availabilityServiceMock).isAvailable(MEETING_ROOM, TEN_TO_ELEVEN);
        decisionThenChange.verify(reservationStoreMock).record(hold);
        decisionThenChange.verifyNoMoreInteractions();
    }

    @Test
    @VerifiesSw(SwTraceables.SW_002_HOLD_SERVICE)
    void a_hold_is_confirmable_while_active_and_stops_being_confirmable_once_the_clock_reaches_its_expiry() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of(hold));

        clock.setTo(QUARTER_PAST_TEN);
        Reservation reservation = holdService.confirm(hold);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        verify(reservationStoreMock).replaceHoldWithReservation(hold, reservation);

        clock.setTo(HALF_PAST_TEN);
        assertThatThrownBy(() -> holdService.confirm(hold)).isInstanceOf(ExpiredHoldException.class);

        clock.advanceBy(Duration.ofHours(1));
        assertThatThrownBy(() -> holdService.confirm(hold)).isInstanceOf(ExpiredHoldException.class);
    }

    @Test
    void placing_a_hold_on_an_unavailable_item_is_rejected_and_leaves_no_trace_in_the_store() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(false);

        assertThatThrownBy(() -> holdService.place(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN))
                .isInstanceOf(ItemUnavailableException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    void a_hold_whose_expiry_is_not_after_the_current_instant_is_rejected_as_invalid() {
        assertThatThrownBy(() -> holdService.place(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, TEN))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(availabilityServiceMock, reservationStoreMock);
    }

    @Test
    void a_hold_the_store_does_not_hold_cannot_be_confirmed_and_leaves_the_store_unchanged() {
        Hold neverPlaced = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of());

        assertThatThrownBy(() -> holdService.confirm(neverPlaced)).isInstanceOf(UnknownHoldException.class);
        verify(reservationStoreMock).holdsFor(MEETING_ROOM);
        verifyNoMoreInteractions(reservationStoreMock);
    }
}
