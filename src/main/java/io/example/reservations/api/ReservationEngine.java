package io.example.reservations.api;

import clew.traceables.clew.StkTraceables;
import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.RealizesStk;
import clew.traceables.clew.annotation.RealizesSys;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.services.reservation.ReservationConfirmationService;

@RealizesStk(StkTraceables.STK_001_NO_DOUBLE_BOOKING)
public final class ReservationEngine {

    private final ReservationConfirmationService reservationConfirmationService;
    private final AvailabilityService availabilityService;

    public ReservationEngine(ReservationConfirmationService reservationConfirmationService,
                             AvailabilityService availabilityService) {
        this.reservationConfirmationService = reservationConfirmationService;
        this.availabilityService = availabilityService;
    }

    @RealizesSys(SysTraceables.SYS_001_CONFIRM_RESERVATION)
    public Reservation confirm(User user, Item item, TimeWindow window) {
        return reservationConfirmationService.confirm(user, item, window);
    }

    @RealizesSys(SysTraceables.SYS_002_AVAILABILITY_QUERY)
    public boolean isAvailable(Item item, TimeWindow window) {
        return availabilityService.isAvailable(item, window);
    }
}
