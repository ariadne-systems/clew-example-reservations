package io.example.reservations.services.hold;

import static java.util.stream.Collectors.toUnmodifiableSet;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.NfTraceables;
import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.RealizesCon;
import clew.traceables.clew.annotation.RealizesNf;
import clew.traceables.clew.annotation.RealizesSw;
import io.example.reservations.clock.Clock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.services.quota.QuotaService;
import io.example.reservations.services.reservation.ItemUnavailableException;
import io.example.reservations.services.reservation.NotClaimOwnerException;
import io.example.reservations.store.ReservationStore;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

public final class ExpiringHoldService implements HoldService {

    private final AvailabilityService availabilityService;
    private final QuotaService quotaService;
    private final ReservationStore reservationStore;
    private final Clock clock;

    public ExpiringHoldService(AvailabilityService availabilityService,
                               QuotaService quotaService,
                               ReservationStore reservationStore,
                               Clock clock) {
        this.availabilityService = availabilityService;
        this.quotaService = quotaService;
        this.reservationStore = reservationStore;
        this.clock = clock;
    }

    @Override
    @RealizesSw(SwTraceables.SW_002_HOLD_SERVICE)
    @RealizesCon({ConTraceables.CON_001_NO_DOUBLE_BOOKING, ConTraceables.CON_003_QUOTA_BOUND})
    public Hold place(User user, Item item, TimeWindow window, Instant expiresAt) {
        if (!expiresAt.isAfter(clock.now())) {
            throw new IllegalArgumentException("A hold must expire after the current instant, but expiry was %s at %s"
                    .formatted(expiresAt, clock.now()));
        }
        if (!availabilityService.isAvailable(item, window)) {
            throw new ItemUnavailableException(
                    "Item %s is not available for [%s, %s)".formatted(item.id(), window.start(), window.end()));
        }
        quotaService.requireHeadroomFor(user);
        Hold hold = new Hold(user, item, window, expiresAt);
        reservationStore.record(hold);
        return hold;
    }

    @Override
    public Reservation confirm(Hold hold) {
        return confirm(List.of(hold));
    }

    @Override
    @RealizesSw({SwTraceables.SW_002_HOLD_SERVICE, SwTraceables.SW_005_VALIDATE_HOLD_SET_BEFORE_ONE_ATOMIC_CHANGE})
    @RealizesNf(NfTraceables.NF_001_DETERMINISTIC_EXPIRY)
    @RealizesCon({ConTraceables.CON_001_NO_DOUBLE_BOOKING, ConTraceables.CON_002_ATOMIC_CONFIRMATION,
            ConTraceables.CON_004_MULTI_ITEM_CONFIRMATION_NEVER_DEADLOCKS})
    public Reservation confirm(List<Hold> holds) {
        requireWellFormedHoldSet(holds);
        requireEveryHoldActive(holds);
        requireEveryHoldRecorded(holds);
        Reservation reservation = reservationOver(holds);
        reservationStore.replaceHoldsWithReservation(holds, reservation);
        return reservation;
    }

    private static void requireWellFormedHoldSet(List<Hold> holds) {
        if (holds.isEmpty()) {
            throw new InvalidHoldSetException("A confirmation needs at least one hold, but the set was empty");
        }
        Set<User> holdingUsers = distinctValuesOf(holds, Hold::user);
        if (holdingUsers.size() > 1) {
            throw new InvalidHoldSetException("A confirmation covers one user, but the set holds for %d"
                    .formatted(holdingUsers.size()));
        }
        Set<TimeWindow> heldWindows = distinctValuesOf(holds, Hold::window);
        if (heldWindows.size() > 1) {
            throw new InvalidHoldSetException("A confirmation covers one window, but the set holds for %d"
                    .formatted(heldWindows.size()));
        }
        Set<Item> heldItems = distinctValuesOf(holds, Hold::item);
        if (heldItems.size() < holds.size()) {
            throw new InvalidHoldSetException("A confirmation covers each item once, but %d holds name %d item(s)"
                    .formatted(holds.size(), heldItems.size()));
        }
    }

    private void requireEveryHoldActive(List<Hold> holds) {
        Instant currentInstant = clock.now();
        holds.stream()
                .filter(hold -> !hold.isActiveAt(currentInstant))
                .findFirst()
                .ifPresent(expiredHold -> {
                    throw new ExpiredHoldException("Hold on item %s expired at %s and cannot be confirmed at %s"
                            .formatted(expiredHold.item().id(), expiredHold.expiresAt(), currentInstant));
                });
    }

    private void requireEveryHoldRecorded(List<Hold> holds) {
        holds.stream()
                .filter(hold -> !reservationStore.holdsFor(hold.item()).contains(hold))
                .findFirst()
                .ifPresent(unknownHold -> {
                    throw new UnknownHoldException("No such hold on item %s for [%s, %s)"
                            .formatted(unknownHold.item().id(), unknownHold.window().start(),
                                    unknownHold.window().end()));
                });
    }

    private static Reservation reservationOver(List<Hold> holds) {
        Hold anyHold = holds.getFirst();
        return new Reservation(anyHold.user(), distinctValuesOf(holds, Hold::item), anyHold.window());
    }

    private static <T> Set<T> distinctValuesOf(List<Hold> holds, Function<Hold, T> attributeOfHold) {
        return holds.stream()
                .map(attributeOfHold)
                .collect(toUnmodifiableSet());
    }

    @Override
    @RealizesSw(SwTraceables.SW_003_CANCEL_RELEASE_SERVICE)
    public void release(User user, Hold hold) {
        if (!hold.user().equals(user)) {
            throw new NotClaimOwnerException("User %s does not hold the hold on item %s for [%s, %s)"
                    .formatted(user.id(), hold.item().id(), hold.window().start(), hold.window().end()));
        }
        if (!reservationStore.holdsFor(hold.item()).contains(hold)) {
            throw new UnknownHoldException("No such hold on item %s for [%s, %s)"
                    .formatted(hold.item().id(), hold.window().start(), hold.window().end()));
        }
        reservationStore.remove(hold);
    }
}
