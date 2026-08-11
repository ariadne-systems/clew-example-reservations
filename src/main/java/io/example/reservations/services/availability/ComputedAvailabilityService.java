package io.example.reservations.services.availability;

import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.RealizesSys;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.store.ReservationStore;

public final class ComputedAvailabilityService implements AvailabilityService {

    private final ReservationStore reservationStore;

    public ComputedAvailabilityService(ReservationStore reservationStore) {
        this.reservationStore = reservationStore;
    }

    @Override
    @RealizesSys(SysTraceables.SYS_002_AVAILABILITY_QUERY)
    public boolean isAvailable(Item item, TimeWindow window) {
        return reservationStore.reservationsFor(item).stream()
                .map(Reservation::window)
                .noneMatch(window::overlaps);
    }
}
