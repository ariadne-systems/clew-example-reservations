package io.example.reservations.services.reservation;

import clew.traceables.clew.ConTraceables;
import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.RealizesCon;
import clew.traceables.clew.annotation.RealizesSw;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.services.quota.QuotaService;
import io.example.reservations.store.ReservationStore;

public final class CheckedReservationConfirmationService implements ReservationConfirmationService {

    private final AvailabilityService availabilityService;
    private final QuotaService quotaService;
    private final ReservationStore reservationStore;

    public CheckedReservationConfirmationService(AvailabilityService availabilityService,
                                                 QuotaService quotaService,
                                                 ReservationStore reservationStore) {
        this.availabilityService = availabilityService;
        this.quotaService = quotaService;
        this.reservationStore = reservationStore;
    }

    @Override
    @RealizesSw(SwTraceables.SW_001_CONFIRM_SERVICE)
    @RealizesCon({ConTraceables.CON_001_NO_DOUBLE_BOOKING, ConTraceables.CON_002_ATOMIC_CONFIRMATION,
            ConTraceables.CON_003_QUOTA_BOUND})
    public Reservation confirm(User user, Item item, TimeWindow window) {
        if (!availabilityService.isAvailable(item, window)) {
            throw new ItemUnavailableException(
                    "Item %s is not available for [%s, %s)".formatted(item.id(), window.start(), window.end()));
        }
        quotaService.requireHeadroomFor(user);
        Reservation reservation = new Reservation(user, item, window);
        reservationStore.record(reservation);
        return reservation;
    }
}
