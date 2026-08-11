package io.example.reservations.services.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.VerifiesCon;
import clew.traceables.clew.annotation.VerifiesSw;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.store.ReservationStore;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CheckedReservationConfirmationServiceTest {

    private static final User ALICE = new User("alice");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final TimeWindow TEN_TO_ELEVEN =
            new TimeWindow(Instant.parse("2026-03-01T10:00:00Z"), Instant.parse("2026-03-01T11:00:00Z"));

    @Mock
    private AvailabilityService availabilityServiceMock;

    @Mock
    private ReservationStore reservationStoreMock;

    private CheckedReservationConfirmationService confirmationService;

    @BeforeEach
    void beforeEach() {
        confirmationService = new CheckedReservationConfirmationService(availabilityServiceMock, reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_001_CONFIRM_SERVICE)
    void availability_is_computed_before_the_single_change_is_handed_to_the_store() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(true);

        Reservation reservation = confirmationService.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        InOrder decisionThenChange = inOrder(availabilityServiceMock, reservationStoreMock);
        decisionThenChange.verify(availabilityServiceMock).isAvailable(MEETING_ROOM, TEN_TO_ELEVEN);
        decisionThenChange.verify(reservationStoreMock).record(reservation);
        decisionThenChange.verifyNoMoreInteractions();
    }

    @Test
    @VerifiesSw(SwTraceables.SW_001_CONFIRM_SERVICE)
    @VerifiesCon(ConTraceables.CON_002_ATOMIC_CONFIRMATION)
    void a_confirmation_that_fails_the_availability_check_leaves_no_trace_in_the_store() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(false);

        assertThatThrownBy(() -> confirmationService.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN))
                .isInstanceOf(ItemUnavailableException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesCon(ConTraceables.CON_002_ATOMIC_CONFIRMATION)
    void a_successful_confirmation_records_exactly_one_complete_reservation() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(true);

        confirmationService.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        verify(reservationStoreMock, times(1)).record(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        verifyNoMoreInteractions(reservationStoreMock);
    }

    @Test
    void the_confirmed_reservation_binds_the_requested_user_item_and_window() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(true);

        Reservation reservation = confirmationService.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
    }
}
