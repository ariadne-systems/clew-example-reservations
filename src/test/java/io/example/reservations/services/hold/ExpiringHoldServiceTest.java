package io.example.reservations.services.hold;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.VerifiesCon;
import clew.traceables.clew.annotation.VerifiesSw;
import io.example.reservations.clock.MutableClock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.services.quota.QuotaExceededException;
import io.example.reservations.services.quota.QuotaService;
import io.example.reservations.services.reservation.ItemUnavailableException;
import io.example.reservations.services.reservation.NotClaimOwnerException;
import io.example.reservations.store.ReservationStore;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExpiringHoldServiceTest {

    private static final User ALICE = new User("alice");
    private static final User BOB = new User("bob");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item PROJECTOR = new Item("projector-1");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant QUARTER_PAST_TEN = Instant.parse("2026-03-01T10:15:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);
    private static final TimeWindow ELEVEN_TO_TWELVE = new TimeWindow(ELEVEN, TWELVE);

    @Mock
    private AvailabilityService availabilityServiceMock;

    @Mock
    private ReservationStore reservationStoreMock;

    @Mock
    private QuotaService quotaServiceMock;

    private MutableClock clock;
    private ExpiringHoldService holdService;

    @BeforeEach
    void beforeEach() {
        clock = new MutableClock(TEN);
        holdService = new ExpiringHoldService(availabilityServiceMock, quotaServiceMock, reservationStoreMock, clock);
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
    @VerifiesSw({SwTraceables.SW_002_HOLD_SERVICE, SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE})
    void a_hold_is_confirmable_while_active_and_stops_being_confirmable_once_the_clock_reaches_its_expiry() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of(hold));

        clock.setTo(QUARTER_PAST_TEN);
        Reservation reservation = holdService.confirm(hold);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        verify(reservationStoreMock).replaceHoldsWithReservation(List.of(hold), reservation);

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
    void a_hold_the_quota_service_refuses_is_rejected_and_leaves_no_trace_in_the_store() {
        when(availabilityServiceMock.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).thenReturn(true);
        doThrow(new QuotaExceededException("over quota")).when(quotaServiceMock).requireHeadroomFor(ALICE);

        assertThatThrownBy(() -> holdService.place(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN))
                .isInstanceOf(QuotaExceededException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    void a_hold_whose_expiry_is_not_after_the_current_instant_is_rejected_as_invalid() {
        assertThatThrownBy(() -> holdService.place(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, TEN))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(availabilityServiceMock, reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_003_CANCEL_RELEASE_SERVICE)
    void a_user_who_does_not_hold_the_hold_changes_nothing_while_its_owner_hands_one_removal_to_the_store() {
        Hold hold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);

        assertThatThrownBy(() -> holdService.release(BOB, hold)).isInstanceOf(NotClaimOwnerException.class);
        verifyNoInteractions(reservationStoreMock);

        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of(hold));

        holdService.release(ALICE, hold);

        verify(reservationStoreMock).holdsFor(MEETING_ROOM);
        verify(reservationStoreMock).remove(hold);
        verifyNoMoreInteractions(reservationStoreMock);
    }

    @Test
    void a_hold_the_store_does_not_hold_cannot_be_released_and_leaves_the_store_unchanged() {
        Hold neverPlaced = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of());

        assertThatThrownBy(() -> holdService.release(ALICE, neverPlaced)).isInstanceOf(UnknownHoldException.class);
        verify(reservationStoreMock).holdsFor(MEETING_ROOM);
        verifyNoMoreInteractions(reservationStoreMock);
    }

    @Test
    void a_hold_the_store_does_not_hold_cannot_be_confirmed_and_leaves_the_store_unchanged() {
        Hold neverPlaced = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of());

        assertThatThrownBy(() -> holdService.confirm(neverPlaced)).isInstanceOf(UnknownHoldException.class);
        verify(reservationStoreMock).holdsFor(MEETING_ROOM);
        verifyNoMoreInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE)
    @VerifiesCon({ConTraceables.CON_002_ATOMIC_CONFIRMATION,
            ConTraceables.CON_004_MULTI_ITEM_CONFIRMATION_NEVER_DEADLOCKS})
    void a_valid_hold_set_reaches_the_store_as_one_change_consuming_every_hold_for_one_reservation() {
        Hold meetingRoomHold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        Hold projectorHold = new Hold(ALICE, PROJECTOR, TEN_TO_ELEVEN, HALF_PAST_TEN);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of(meetingRoomHold));
        when(reservationStoreMock.holdsFor(PROJECTOR)).thenReturn(List.of(projectorHold));
        clock.setTo(QUARTER_PAST_TEN);

        Reservation reservation = holdService.confirm(List.of(meetingRoomHold, projectorHold));

        assertThat(reservation)
                .isEqualTo(new Reservation(ALICE, Set.of(MEETING_ROOM, PROJECTOR), TEN_TO_ELEVEN));
        verify(reservationStoreMock).holdsFor(MEETING_ROOM);
        verify(reservationStoreMock).holdsFor(PROJECTOR);
        verify(reservationStoreMock)
                .replaceHoldsWithReservation(List.of(meetingRoomHold, projectorHold), reservation);
        verifyNoMoreInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE)
    void an_empty_hold_set_is_rejected_before_the_store_is_touched_at_all() {
        List<Hold> noHolds = List.of();

        assertThatThrownBy(() -> holdService.confirm(noHolds)).isInstanceOf(InvalidHoldSetException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE)
    void a_hold_set_belonging_to_two_users_is_rejected_before_the_store_is_touched_at_all() {
        List<Hold> holdsOfTwoUsers = List.of(new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN),
                new Hold(BOB, PROJECTOR, TEN_TO_ELEVEN, HALF_PAST_TEN));

        assertThatThrownBy(() -> holdService.confirm(holdsOfTwoUsers)).isInstanceOf(InvalidHoldSetException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE)
    void a_hold_set_spanning_two_windows_is_rejected_before_the_store_is_touched_at_all() {
        List<Hold> holdsOfTwoWindows = List.of(new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN),
                new Hold(ALICE, PROJECTOR, ELEVEN_TO_TWELVE, HALF_PAST_TEN));

        assertThatThrownBy(() -> holdService.confirm(holdsOfTwoWindows)).isInstanceOf(InvalidHoldSetException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE)
    void a_hold_set_naming_the_same_item_twice_is_rejected_before_the_store_is_touched_at_all() {
        List<Hold> holdsOfOneItemTwice = List.of(new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN),
                new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, ELEVEN));

        assertThatThrownBy(() -> holdService.confirm(holdsOfOneItemTwice)).isInstanceOf(InvalidHoldSetException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesCon(ConTraceables.CON_002_ATOMIC_CONFIRMATION)
    void one_expired_hold_rejects_the_whole_set_and_consumes_none_of_it() {
        Hold liveHold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, ELEVEN);
        Hold expiredHold = new Hold(ALICE, PROJECTOR, TEN_TO_ELEVEN, HALF_PAST_TEN);
        List<Hold> oneOfThemExpired = List.of(liveHold, expiredHold);
        clock.setTo(HALF_PAST_TEN);

        assertThatThrownBy(() -> holdService.confirm(oneOfThemExpired)).isInstanceOf(ExpiredHoldException.class);
        verifyNoInteractions(reservationStoreMock);
    }

    @Test
    @VerifiesCon(ConTraceables.CON_002_ATOMIC_CONFIRMATION)
    void one_hold_the_store_does_not_hold_rejects_the_whole_set_and_consumes_none_of_it() {
        Hold recordedHold = new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_TEN);
        Hold neverPlaced = new Hold(ALICE, PROJECTOR, TEN_TO_ELEVEN, HALF_PAST_TEN);
        List<Hold> oneOfThemUnknown = List.of(recordedHold, neverPlaced);
        when(reservationStoreMock.holdsFor(MEETING_ROOM)).thenReturn(List.of(recordedHold));
        when(reservationStoreMock.holdsFor(PROJECTOR)).thenReturn(List.of());

        assertThatThrownBy(() -> holdService.confirm(oneOfThemUnknown)).isInstanceOf(UnknownHoldException.class);
        verify(reservationStoreMock).holdsFor(MEETING_ROOM);
        verify(reservationStoreMock).holdsFor(PROJECTOR);
        verifyNoMoreInteractions(reservationStoreMock);
    }
}
