package io.example.reservations.services.quota;

import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.RealizesSw;
import io.example.reservations.clock.Clock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.User;
import io.example.reservations.store.ReservationStore;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Stream;

public final class ClaimCountingQuotaService implements QuotaService {

    private final ReservationStore reservationStore;
    private final Clock clock;

    public ClaimCountingQuotaService(ReservationStore reservationStore, Clock clock) {
        this.reservationStore = reservationStore;
        this.clock = clock;
    }

    @Override
    @RealizesSw(SwTraceables.SW_004_QUOTA_SERVICE)
    public void requireHeadroomFor(User user) {
        long activeItemClaimCount = activeItemClaimCountOf(user);
        if (activeItemClaimCount >= user.quota()) {
            throw new QuotaExceededException(
                    "User %s already claims %d item(s) and its quota of %d admits no further claim"
                            .formatted(user.id(), activeItemClaimCount, user.quota()));
        }
    }

    private long activeItemClaimCountOf(User user) {
        Instant currentInstant = clock.now();
        Stream<Item> reservedItems = reservationStore.reservationsOwnedBy(user).stream()
                .map(Reservation::items)
                .flatMap(Set::stream);
        Stream<Item> heldItems = reservationStore.holdsOwnedBy(user).stream()
                .filter(hold -> hold.isActiveAt(currentInstant))
                .map(Hold::item);
        return Stream.concat(reservedItems, heldItems).count();
    }
}
