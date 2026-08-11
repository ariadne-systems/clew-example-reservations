package io.example.reservations.api;

import clew.traceables.clew.StkTraceables;
import clew.traceables.clew.SysTraceables;
import clew.traceables.clew.annotation.RealizesStk;
import clew.traceables.clew.annotation.RealizesSys;
import io.example.reservations.entities.Hold;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.TimeWindow;
import io.example.reservations.entities.User;
import io.example.reservations.services.availability.AvailabilityService;
import io.example.reservations.services.hold.HoldService;
import io.example.reservations.services.reservation.ReservationCancellationService;
import io.example.reservations.services.reservation.ReservationConfirmationService;
import java.time.Instant;

@RealizesStk(StkTraceables.STK_001_NO_DOUBLE_BOOKING)
public final class ReservationEngine {

    private final ReservationConfirmationService reservationConfirmationService;
    private final ReservationCancellationService reservationCancellationService;
    private final HoldService holdService;
    private final AvailabilityService availabilityService;

    public ReservationEngine(ReservationConfirmationService reservationConfirmationService,
                             ReservationCancellationService reservationCancellationService,
                             HoldService holdService,
                             AvailabilityService availabilityService) {
        this.reservationConfirmationService = reservationConfirmationService;
        this.reservationCancellationService = reservationCancellationService;
        this.holdService = holdService;
        this.availabilityService = availabilityService;
    }

    @RealizesSys(SysTraceables.SYS_001_CONFIRM_RESERVATION)
    public Reservation confirm(User user, Item item, TimeWindow window) {
        return reservationConfirmationService.confirm(user, item, window);
    }

    @RealizesSys(SysTraceables.SYS_003_PLACE_HOLD)
    public Hold placeHold(User user, Item item, TimeWindow window, Instant expiresAt) {
        return holdService.place(user, item, window, expiresAt);
    }

    @RealizesSys(SysTraceables.SYS_003_PLACE_HOLD)
    public Reservation confirmHold(Hold hold) {
        return holdService.confirm(hold);
    }

    @RealizesSys(SysTraceables.SYS_004_CANCEL_RELEASE)
    public void cancel(User user, Reservation reservation) {
        reservationCancellationService.cancel(user, reservation);
    }

    @RealizesSys(SysTraceables.SYS_004_CANCEL_RELEASE)
    public void release(User user, Hold hold) {
        holdService.release(user, hold);
    }

    @RealizesSys(SysTraceables.SYS_002_AVAILABILITY_QUERY)
    public boolean isAvailable(Item item, TimeWindow window) {
        return availabilityService.isAvailable(item, window);
    }
}
