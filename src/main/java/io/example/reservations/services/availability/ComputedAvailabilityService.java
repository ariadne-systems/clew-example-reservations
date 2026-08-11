package io.example.reservations.services.availability;

import clew.traceables.clew.NfTraceables;
import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.RealizesNf;
import clew.traceables.clew.annotation.RealizesSys;
import io.example.reservations.clock.Clock;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.store.ReservationStore;
import java.time.Instant;
import java.util.stream.Stream;

public final class ComputedAvailabilityService implements AvailabilityService {

    private final ReservationStore reservationStore;
    private final Clock clock;

    public ComputedAvailabilityService(ReservationStore reservationStore, Clock clock) {
        this.reservationStore = reservationStore;
        this.clock = clock;
    }

    @Override
    @RealizesSys(SysTraceables.SYS_002_AVAILABILITY_QUERY)
    @RealizesNf(NfTraceables.NF_001_DETERMINISTIC_EXPIRY)
    public boolean isAvailable(Item item, TimeWindow window) {
        return claimedWindowsOf(item).noneMatch(window::overlaps);
    }

    private Stream<TimeWindow> claimedWindowsOf(Item item) {
        Instant currentInstant = clock.now();
        Stream<TimeWindow> reservedWindows = reservationStore.reservationsFor(item).stream()
                .map(Reservation::window);
        Stream<TimeWindow> activelyHeldWindows = reservationStore.holdsFor(item).stream()
                .filter(hold -> hold.isActiveAt(currentInstant))
                .map(Hold::window);
        return Stream.concat(reservedWindows, activelyHeldWindows);
    }
}
