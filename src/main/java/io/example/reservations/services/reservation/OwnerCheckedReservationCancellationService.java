package io.example.reservations.services.reservation;

import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.RealizesSw;
import io.example.reservations.entities.Reservation;
import io.example.reservations.entities.User;
import io.example.reservations.store.ReservationStore;

public final class OwnerCheckedReservationCancellationService implements ReservationCancellationService {

    private final ReservationStore reservationStore;

    public OwnerCheckedReservationCancellationService(ReservationStore reservationStore) {
        this.reservationStore = reservationStore;
    }

    @Override
    @RealizesSw(SwTraceables.SW_003_CANCEL_RELEASE_SERVICE)
    public void cancel(User user, Reservation reservation) {
        if (!reservation.user().equals(user)) {
            throw new NotClaimOwnerException("User %s does not own the reservation on item %s for [%s, %s)"
                    .formatted(user.id(), reservation.item().id(),
                            reservation.window().start(), reservation.window().end()));
        }
        if (!reservationStore.reservationsFor(reservation.item()).contains(reservation)) {
            throw new UnknownReservationException("No such reservation on item %s for [%s, %s)"
                    .formatted(reservation.item().id(), reservation.window().start(), reservation.window().end()));
        }
        reservationStore.remove(reservation);
    }
}
