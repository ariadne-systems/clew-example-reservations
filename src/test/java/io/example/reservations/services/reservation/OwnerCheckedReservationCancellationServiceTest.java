package io.example.reservations.services.reservation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.VerifiesSw;
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
class OwnerCheckedReservationCancellationServiceTest {

    private static final User ALICE = new User("alice");
    private static final User BOB = new User("bob");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);
    private static final Reservation ALICES_RESERVATION = new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

    @Mock
    private ReservationStore reservationStoreMock;

    private OwnerCheckedReservationCancellationService reservationCancellationService;

    @BeforeEach
    void beforeEach() {
        reservationCancellationService = new OwnerCheckedReservationCancellationService(reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_003_CANCEL_RELEASE_SERVICE)
    void a_user_who_does_not_own_the_reservation_changes_nothing_while_its_owner_hands_one_removal_to_the_store() {
        assertThatThrownBy(() -> reservationCancellationService.cancel(BOB, ALICES_RESERVATION))
                .isInstanceOf(NotClaimOwnerException.class);
        verifyNoInteractions(reservationStoreMock);

        when(reservationStoreMock.reservationsFor(MEETING_ROOM)).thenReturn(List.of(ALICES_RESERVATION));

        reservationCancellationService.cancel(ALICE, ALICES_RESERVATION);

        verify(reservationStoreMock).reservationsFor(MEETING_ROOM);
        verify(reservationStoreMock).remove(ALICES_RESERVATION);
        verifyNoMoreInteractions(reservationStoreMock);
    }

    @Test
    void a_reservation_the_store_does_not_hold_cannot_be_cancelled_and_leaves_the_store_unchanged() {
        when(reservationStoreMock.reservationsFor(MEETING_ROOM)).thenReturn(List.of());

        assertThatThrownBy(() -> reservationCancellationService.cancel(ALICE, ALICES_RESERVATION))
                .isInstanceOf(UnknownReservationException.class);
        verify(reservationStoreMock).reservationsFor(MEETING_ROOM);
        verifyNoMoreInteractions(reservationStoreMock);
    }
}
