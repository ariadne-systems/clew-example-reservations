package io.example.reservations.api;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.NfTraceables;
import clew.traceables.clew.StkTraceables;
import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.VerifiesCon;
import clew.traceables.clew.annotation.VerifiesNf;
import clew.traceables.clew.annotation.VerifiesStk;
import clew.traceables.clew.annotation.VerifiesSys;
import io.example.reservations.Reservations;
import io.example.reservations.clock.MutableClock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.hold.ExpiredHoldException;
import io.example.reservations.services.hold.InvalidHoldSetException;
import io.example.reservations.services.hold.UnknownHoldException;
import io.example.reservations.services.quota.QuotaExceededException;
import io.example.reservations.services.reservation.ItemUnavailableException;
import io.example.reservations.services.reservation.NotClaimOwnerException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReservationEngineAcceptanceTest {

    private static final User ALICE = new User("alice");
    private static final User BOB = new User("bob");
    private static final User CARLA_ON_A_QUOTA_OF_TWO = new User("carla", 2);
    private static final User DEREK_ON_A_QUOTA_OF_ONE = new User("derek", 1);
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item WORKSHOP = new Item("room-2");
    private static final Item LIBRARY = new Item("room-3");
    private static final Instant NINE = Instant.parse("2026-03-01T09:00:00Z");
    private static final Instant HALF_PAST_NINE = Instant.parse("2026-03-01T09:30:00Z");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant HALF_PAST_TEN = Instant.parse("2026-03-01T10:30:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");
    private static final Instant FAR_FUTURE = Instant.parse("2026-04-01T00:00:00Z");
    private static final int ROUNDS_OF_CONCURRENT_CONFIRMATION = 50;
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);
    private static final TimeWindow HALF_PAST_TEN_TO_TWELVE = new TimeWindow(HALF_PAST_TEN, TWELVE);
    private static final TimeWindow ELEVEN_TO_TWELVE = new TimeWindow(ELEVEN, TWELVE);

    private MutableClock clock;
    private ReservationEngine reservationEngine;

    @BeforeEach
    void beforeEach() {
        clock = new MutableClock(NINE);
        reservationEngine = Reservations.newInMemoryReservationEngine(clock);
    }

    @Test
    @VerifiesStk(StkTraceables.STK_001_NO_DOUBLE_BOOKING)
    void an_item_booked_by_one_party_is_refused_to_another_for_an_overlapping_window() {
        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_001_CONFIRM_RESERVATION)
    void a_confirmation_into_an_empty_schedule_succeeds_and_an_overlapping_one_is_rejected() {
        Reservation reservation = reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirm(ALICE, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_002_AVAILABILITY_QUERY)
    void availability_follows_the_confirmed_reservations_and_the_still_active_holds_that_bear_on_the_window() {
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isTrue();

        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isFalse();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();

        reservationEngine.placeHold(BOB, MEETING_ROOM, ELEVEN_TO_TWELVE, HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isFalse();

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_003_PLACE_HOLD)
    void a_hold_blocks_overlapping_windows_while_it_lasts_and_stops_blocking_once_it_expires() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThat(hold).isEqualTo(new Hold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE));
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isFalse();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, ELEVEN_TO_TWELVE)).isTrue();
        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isTrue();
        assertThat(reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isEqualTo(new Reservation(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE));
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_003_PLACE_HOLD)
    void an_active_hold_is_confirmed_into_a_reservation_and_is_consumed_by_that_confirmation() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        Reservation reservation = reservationEngine.confirmHold(hold);

        assertThat(reservation).isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirmHold(hold)).isInstanceOf(UnknownHoldException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_003_PLACE_HOLD)
    void an_expired_hold_can_no_longer_be_confirmed() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        clock.setTo(HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirmHold(hold)).isInstanceOf(ExpiredHoldException.class);
    }

    @Test
    @VerifiesNf(NfTraceables.NF_001_DETERMINISTIC_EXPIRY)
    void only_advancing_the_injected_clock_across_the_expiry_instant_turns_a_held_item_free_again() {
        reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();

        clock.setTo(HALF_PAST_NINE.minusMillis(1));

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isTrue();
    }

    @Test
    @VerifiesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    void no_item_is_bound_by_two_active_claims_over_overlapping_windows_across_a_sequence_of_operations() {
        Hold aliceHold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
        assertThatThrownBy(() -> reservationEngine.placeHold(BOB, MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE,
                HALF_PAST_NINE))
                .isInstanceOf(ItemUnavailableException.class);

        reservationEngine.confirmHold(aliceHold);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
        assertThatThrownBy(() -> reservationEngine.confirm(BOB, MEETING_ROOM, TEN_TO_ELEVEN))
                .isInstanceOf(ItemUnavailableException.class);

        reservationEngine.confirm(BOB, MEETING_ROOM, ELEVEN_TO_TWELVE);

        assertThatThrownBy(() -> reservationEngine.confirm(ALICE, MEETING_ROOM, ELEVEN_TO_TWELVE))
                .isInstanceOf(ItemUnavailableException.class);
    }

    @Test
    @VerifiesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    void a_window_a_hold_no_longer_claims_is_admitted_to_another_party_once_that_hold_has_expired() {
        reservationEngine.placeHold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirm(BOB, WORKSHOP, TEN_TO_ELEVEN))
                .isInstanceOf(ItemUnavailableException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.confirm(BOB, WORKSHOP, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(BOB, WORKSHOP, TEN_TO_ELEVEN));
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_004_CANCEL_RELEASE)
    void cancelling_a_reservation_frees_its_window_for_others_and_only_its_owner_may_cancel_it() {
        Reservation reservation = reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThatThrownBy(() -> reservationEngine.cancel(BOB, reservation))
                .isInstanceOf(NotClaimOwnerException.class);
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();

        reservationEngine.cancel(ALICE, reservation);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isTrue();
        assertThat(reservationEngine.confirm(BOB, MEETING_ROOM, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(BOB, MEETING_ROOM, TEN_TO_ELEVEN));
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_004_CANCEL_RELEASE)
    void releasing_an_active_hold_frees_its_window_for_others_and_only_its_owner_may_release_it() {
        Hold hold = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.release(BOB, hold))
                .isInstanceOf(NotClaimOwnerException.class);
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isFalse();

        reservationEngine.release(ALICE, hold);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE)).isTrue();
        assertThat(reservationEngine.confirm(BOB, MEETING_ROOM, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(BOB, MEETING_ROOM, TEN_TO_ELEVEN));
    }

    @Test
    @VerifiesCon(ConTraceables.CON_003_QUOTA_BOUND)
    void a_users_held_and_reserved_items_never_exceed_its_quota_across_place_confirm_release_cancel_and_expiry() {
        Hold heldMeetingRoom =
                reservationEngine.placeHold(CARLA_ON_A_QUOTA_OF_TWO, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Reservation reservedWorkshop = reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN);

        assertThatThrownBy(() -> reservationEngine.placeHold(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN,
                HALF_PAST_NINE))
                .isInstanceOf(QuotaExceededException.class);
        assertThatThrownBy(() -> reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN))
                .isInstanceOf(QuotaExceededException.class);
        assertThat(reservationEngine.isAvailable(LIBRARY, TEN_TO_ELEVEN)).isTrue();

        assertThat(reservationEngine.confirmHold(heldMeetingRoom))
                .isEqualTo(new Reservation(CARLA_ON_A_QUOTA_OF_TWO, MEETING_ROOM, TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN))
                .isInstanceOf(QuotaExceededException.class);

        reservationEngine.cancel(CARLA_ON_A_QUOTA_OF_TWO, reservedWorkshop);
        Hold heldLibrary =
                reservationEngine.placeHold(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN))
                .isInstanceOf(QuotaExceededException.class);

        reservationEngine.release(CARLA_ON_A_QUOTA_OF_TWO, heldLibrary);
        reservationEngine.placeHold(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN))
                .isInstanceOf(QuotaExceededException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThat(reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN));
    }

    @Test
    void one_users_quota_does_not_bound_another_users_claims() {
        reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, MEETING_ROOM, TEN_TO_ELEVEN);
        reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN);

        assertThatThrownBy(() -> reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN))
                .isInstanceOf(QuotaExceededException.class);
        assertThat(reservationEngine.confirm(DEREK_ON_A_QUOTA_OF_ONE, LIBRARY, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(DEREK_ON_A_QUOTA_OF_ONE, LIBRARY, TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirm(DEREK_ON_A_QUOTA_OF_ONE, MEETING_ROOM, ELEVEN_TO_TWELVE))
                .isInstanceOf(QuotaExceededException.class);
    }

    @Test
    void a_second_item_is_unaffected_by_a_reservation_of_the_first() {
        reservationEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN);

        assertThat(reservationEngine.isAvailable(WORKSHOP, TEN_TO_ELEVEN)).isTrue();
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_005_CONFIRM_HOLD_SET_INTO_ONE_RESERVATION)
    @VerifiesStk(StkTraceables.STK_002_ALL_ITEMS_OR_NONE)
    void holds_on_several_items_for_one_window_confirm_into_one_reservation_covering_all_of_them() {
        Hold heldMeetingRoom = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Hold heldWorkshop = reservationEngine.placeHold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);

        Reservation booking = reservationEngine.confirmHolds(List.of(heldMeetingRoom, heldWorkshop));

        assertThat(booking).isEqualTo(new Reservation(ALICE, Set.of(MEETING_ROOM, WORKSHOP), TEN_TO_ELEVEN));
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
        assertThat(reservationEngine.isAvailable(WORKSHOP, TEN_TO_ELEVEN)).isFalse();
        assertThat(reservationEngine.isAvailable(LIBRARY, TEN_TO_ELEVEN)).isTrue();

        reservationEngine.cancel(ALICE, booking);

        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isTrue();
        assertThat(reservationEngine.isAvailable(WORKSHOP, TEN_TO_ELEVEN)).isTrue();
    }

    @Test
    @VerifiesSys(SysTraceables.SYS_005_CONFIRM_HOLD_SET_INTO_ONE_RESERVATION)
    void a_hold_set_that_is_empty_mixed_or_repetitive_is_refused_and_leaves_every_hold_confirmable() {
        Hold heldMeetingRoom = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Hold heldWorkshop = reservationEngine.placeHold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Hold bobsLibrary = reservationEngine.placeHold(BOB, LIBRARY, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Hold alicesLaterLibrary = reservationEngine.placeHold(ALICE, LIBRARY, ELEVEN_TO_TWELVE, HALF_PAST_NINE);
        Hold neverPlaced = new Hold(ALICE, LIBRARY, TEN_TO_ELEVEN, HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirmHolds(List.of()))
                .isInstanceOf(InvalidHoldSetException.class);
        assertThatThrownBy(() -> reservationEngine.confirmHolds(List.of(heldMeetingRoom, bobsLibrary)))
                .isInstanceOf(InvalidHoldSetException.class);
        assertThatThrownBy(() -> reservationEngine.confirmHolds(List.of(heldMeetingRoom, alicesLaterLibrary)))
                .isInstanceOf(InvalidHoldSetException.class);
        assertThatThrownBy(() -> reservationEngine.confirmHolds(List.of(heldMeetingRoom, heldMeetingRoom)))
                .isInstanceOf(InvalidHoldSetException.class);
        assertThatThrownBy(() -> reservationEngine.confirmHolds(List.of(heldMeetingRoom, neverPlaced)))
                .isInstanceOf(UnknownHoldException.class);

        assertThat(reservationEngine.confirmHolds(List.of(heldMeetingRoom, heldWorkshop)))
                .isEqualTo(new Reservation(ALICE, Set.of(MEETING_ROOM, WORKSHOP), TEN_TO_ELEVEN));
        assertThatThrownBy(() -> reservationEngine.confirmHolds(List.of(heldMeetingRoom, heldWorkshop)))
                .isInstanceOf(UnknownHoldException.class);
    }

    @Test
    @VerifiesStk(StkTraceables.STK_002_ALL_ITEMS_OR_NONE)
    @VerifiesSys(SysTraceables.SYS_005_CONFIRM_HOLD_SET_INTO_ONE_RESERVATION)
    void a_group_whose_holds_do_not_all_survive_is_booked_for_no_item_at_all() {
        Hold heldMeetingRoom = reservationEngine.placeHold(ALICE, MEETING_ROOM, TEN_TO_ELEVEN, ELEVEN);
        Hold shortLivedWorkshop = reservationEngine.placeHold(ALICE, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);
        List<Hold> theWholeGroup = List.of(heldMeetingRoom, shortLivedWorkshop);

        clock.setTo(HALF_PAST_NINE);

        assertThatThrownBy(() -> reservationEngine.confirmHolds(theWholeGroup))
                .isInstanceOf(ExpiredHoldException.class);
        assertThat(reservationEngine.isAvailable(WORKSHOP, TEN_TO_ELEVEN)).isTrue();
        assertThat(reservationEngine.isAvailable(MEETING_ROOM, TEN_TO_ELEVEN)).isFalse();
        assertThat(reservationEngine.confirmHolds(List.of(heldMeetingRoom)))
                .isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
    }

    @Test
    void confirming_the_items_a_user_already_holds_consumes_no_further_quota() {
        Hold heldMeetingRoom =
                reservationEngine.placeHold(CARLA_ON_A_QUOTA_OF_TWO, MEETING_ROOM, TEN_TO_ELEVEN, HALF_PAST_NINE);
        Hold heldWorkshop =
                reservationEngine.placeHold(CARLA_ON_A_QUOTA_OF_TWO, WORKSHOP, TEN_TO_ELEVEN, HALF_PAST_NINE);

        Reservation booking = reservationEngine.confirmHolds(List.of(heldMeetingRoom, heldWorkshop));

        assertThat(booking.items()).containsExactlyInAnyOrder(MEETING_ROOM, WORKSHOP);
        assertThatThrownBy(() -> reservationEngine.confirm(CARLA_ON_A_QUOTA_OF_TWO, LIBRARY, TEN_TO_ELEVEN))
                .isInstanceOf(QuotaExceededException.class);
    }

    @Test
    @VerifiesCon(ConTraceables.CON_004_MULTI_ITEM_CONFIRMATION_NEVER_DEADLOCKS)
    void two_confirmations_over_overlapping_items_both_finish_instead_of_waiting_on_each_other() throws Exception {
        ExecutorService confirmationThreads = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < ROUNDS_OF_CONCURRENT_CONFIRMATION; round++) {
                TimeWindow alicesWindow = windowOfRound(round, 0);
                TimeWindow bobsWindow = windowOfRound(round, 1);
                List<Hold> alicesHolds = List.of(
                        reservationEngine.placeHold(ALICE, MEETING_ROOM, alicesWindow, FAR_FUTURE),
                        reservationEngine.placeHold(ALICE, WORKSHOP, alicesWindow, FAR_FUTURE));
                List<Hold> bobsHolds = List.of(
                        reservationEngine.placeHold(BOB, WORKSHOP, bobsWindow, FAR_FUTURE),
                        reservationEngine.placeHold(BOB, MEETING_ROOM, bobsWindow, FAR_FUTURE));
                CountDownLatch bothThreadsReady = new CountDownLatch(2);

                Future<Reservation> alicesBooking =
                        confirmationThreads.submit(confirmationAwaiting(bothThreadsReady, alicesHolds));
                Future<Reservation> bobsBooking =
                        confirmationThreads.submit(confirmationAwaiting(bothThreadsReady, bobsHolds));

                assertThat(alicesBooking.get(10, SECONDS).items())
                        .containsExactlyInAnyOrder(MEETING_ROOM, WORKSHOP);
                assertThat(bobsBooking.get(10, SECONDS).items())
                        .containsExactlyInAnyOrder(MEETING_ROOM, WORKSHOP);
            }
        } finally {
            confirmationThreads.shutdownNow();
        }
    }

    private Callable<Reservation> confirmationAwaiting(CountDownLatch bothThreadsReady, List<Hold> holds) {
        return () -> {
            bothThreadsReady.countDown();
            bothThreadsReady.await();
            return reservationEngine.confirmHolds(holds);
        };
    }

    private static TimeWindow windowOfRound(int round, int hourWithinRound) {
        Instant roundStart = TEN.plus(Duration.ofHours(2L * round + hourWithinRound));
        return new TimeWindow(roundStart, roundStart.plus(Duration.ofHours(1)));
    }

    @Test
    void the_engine_can_be_assembled_with_the_system_clock_and_still_reserves() {
        ReservationEngine systemClockEngine = Reservations.newInMemoryReservationEngine();

        assertThat(systemClockEngine.confirm(ALICE, MEETING_ROOM, TEN_TO_ELEVEN))
                .isEqualTo(new Reservation(ALICE, MEETING_ROOM, TEN_TO_ELEVEN));
    }
}
