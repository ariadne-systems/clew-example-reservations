package io.example.reservations.services.quota;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.VerifiesSw;
import io.example.reservations.clock.MutableClock;
import io.example.reservations.entities.Hold;
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
class ClaimCountingQuotaServiceTest {

    private static final User ALICE_ON_A_QUOTA_OF_TWO = new User("alice", 2);
    private static final User UNBOUNDED_BOB = new User("bob");
    private static final Item MEETING_ROOM = new Item("room-1");
    private static final Item WORKSHOP = new Item("room-2");
    private static final Instant NINE = Instant.parse("2026-03-01T09:00:00Z");
    private static final Instant HALF_PAST_NINE = Instant.parse("2026-03-01T09:30:00Z");
    private static final Instant TEN = Instant.parse("2026-03-01T10:00:00Z");
    private static final Instant ELEVEN = Instant.parse("2026-03-01T11:00:00Z");
    private static final Instant TWELVE = Instant.parse("2026-03-01T12:00:00Z");
    private static final TimeWindow TEN_TO_ELEVEN = new TimeWindow(TEN, ELEVEN);
    private static final TimeWindow ELEVEN_TO_TWELVE = new TimeWindow(ELEVEN, TWELVE);

    @Mock
    private ReservationStore reservationStoreMock;

    private MutableClock clock;
    private ClaimCountingQuotaService quotaService;

    @BeforeEach
    void beforeEach() {
        clock = new MutableClock(NINE);
        quotaService = new ClaimCountingQuotaService(reservationStoreMock, clock);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_004_QUOTA_SERVICE)
    void a_user_one_claim_below_quota_is_admitted_and_a_user_at_exactly_quota_is_refused_the_next_claim() {
        when(reservationStoreMock.reservationsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO)).thenReturn(List.of());
        when(reservationStoreMock.holdsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO))
                .thenReturn(List.of(activeHoldFor(ALICE_ON_A_QUOTA_OF_TWO, MEETING_ROOM)));

        assertThatCode(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO)).doesNotThrowAnyException();

        when(reservationStoreMock.holdsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO))
                .thenReturn(List.of(activeHoldFor(ALICE_ON_A_QUOTA_OF_TWO, MEETING_ROOM),
                        activeHoldFor(ALICE_ON_A_QUOTA_OF_TWO, WORKSHOP)));

        assertThatThrownBy(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO))
                .isInstanceOf(QuotaExceededException.class);
    }

    @Test
    @VerifiesSw(SwTraceables.SW_004_QUOTA_SERVICE)
    void the_count_follows_the_clock_and_the_store_so_an_expired_or_removed_claim_frees_headroom() {
        when(reservationStoreMock.reservationsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO))
                .thenReturn(List.of(new Reservation(ALICE_ON_A_QUOTA_OF_TWO, MEETING_ROOM, TEN_TO_ELEVEN)));
        when(reservationStoreMock.holdsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO))
                .thenReturn(List.of(activeHoldFor(ALICE_ON_A_QUOTA_OF_TWO, WORKSHOP)));

        assertThatThrownBy(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO))
                .isInstanceOf(QuotaExceededException.class);

        clock.setTo(HALF_PAST_NINE);

        assertThatCode(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO)).doesNotThrowAnyException();

        clock.setTo(NINE);
        when(reservationStoreMock.reservationsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO)).thenReturn(List.of());

        assertThatCode(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO)).doesNotThrowAnyException();
    }

    @Test
    void a_held_item_and_a_reserved_item_count_toward_the_same_quota() {
        when(reservationStoreMock.reservationsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO))
                .thenReturn(List.of(new Reservation(ALICE_ON_A_QUOTA_OF_TWO, MEETING_ROOM, ELEVEN_TO_TWELVE)));
        when(reservationStoreMock.holdsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO))
                .thenReturn(List.of(activeHoldFor(ALICE_ON_A_QUOTA_OF_TWO, WORKSHOP)));

        assertThatThrownBy(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO))
                .isInstanceOf(QuotaExceededException.class);
    }

    @Test
    void a_user_carrying_no_bound_is_admitted_however_many_claims_it_already_holds() {
        when(reservationStoreMock.reservationsOwnedBy(UNBOUNDED_BOB))
                .thenReturn(List.of(new Reservation(UNBOUNDED_BOB, MEETING_ROOM, TEN_TO_ELEVEN),
                        new Reservation(UNBOUNDED_BOB, WORKSHOP, TEN_TO_ELEVEN)));
        when(reservationStoreMock.holdsOwnedBy(UNBOUNDED_BOB))
                .thenReturn(List.of(activeHoldFor(UNBOUNDED_BOB, MEETING_ROOM)));

        assertThatCode(() -> quotaService.requireHeadroomFor(UNBOUNDED_BOB)).doesNotThrowAnyException();
    }

    @Test
    void a_user_with_no_claims_at_all_is_admitted() {
        when(reservationStoreMock.reservationsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO)).thenReturn(List.of());
        when(reservationStoreMock.holdsOwnedBy(ALICE_ON_A_QUOTA_OF_TWO)).thenReturn(List.of());

        assertThatCode(() -> quotaService.requireHeadroomFor(ALICE_ON_A_QUOTA_OF_TWO)).doesNotThrowAnyException();
    }

    private static Hold activeHoldFor(User user, Item item) {
        return new Hold(user, item, TEN_TO_ELEVEN, HALF_PAST_NINE);
    }
}
