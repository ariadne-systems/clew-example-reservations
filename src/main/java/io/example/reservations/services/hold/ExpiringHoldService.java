package io.example.reservations.services.hold;

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
import io.example.reservations.services.reservation.ItemUnavailableException;
import io.example.reservations.store.ReservationStore;
import java.time.Instant;

public final class ExpiringHoldService implements HoldService {

    private final AvailabilityService availabilityService;
    private final ReservationStore reservationStore;
    private final Clock clock;

    public ExpiringHoldService(AvailabilityService availabilityService,
                               ReservationStore reservationStore,
                               Clock clock) {
        this.availabilityService = availabilityService;
        this.reservationStore = reservationStore;
        this.clock = clock;
    }

    @Override
    @RealizesSw(SwTraceables.SW_002_HOLD_SERVICE)
    @RealizesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    public Hold place(User user, Item item, TimeWindow window, Instant expiresAt) {
        if (!expiresAt.isAfter(clock.now())) {
            throw new IllegalArgumentException("A hold must expire after the current instant, but expiry was %s at %s"
                    .formatted(expiresAt, clock.now()));
        }
        if (!availabilityService.isAvailable(item, window)) {
            throw new ItemUnavailableException(
                    "Item %s is not available for [%s, %s)".formatted(item.id(), window.start(), window.end()));
        }
        Hold hold = new Hold(user, item, window, expiresAt);
        reservationStore.record(hold);
        return hold;
    }

    @Override
    @RealizesSw(SwTraceables.SW_002_HOLD_SERVICE)
    @RealizesNf(NfTraceables.NF_001_DETERMINISTIC_EXPIRY)
    @RealizesCon(ConTraceables.CON_001_NO_DOUBLE_BOOKING)
    public Reservation confirm(Hold hold) {
        if (!hold.isActiveAt(clock.now())) {
            throw new ExpiredHoldException("Hold on item %s expired at %s and cannot be confirmed at %s"
                    .formatted(hold.item().id(), hold.expiresAt(), clock.now()));
        }
        if (!reservationStore.holdsFor(hold.item()).contains(hold)) {
            throw new UnknownHoldException("No such hold on item %s for [%s, %s)"
                    .formatted(hold.item().id(), hold.window().start(), hold.window().end()));
        }
        Reservation reservation = hold.toReservation();
        reservationStore.replaceHoldWithReservation(hold, reservation);
        return reservation;
    }
}
