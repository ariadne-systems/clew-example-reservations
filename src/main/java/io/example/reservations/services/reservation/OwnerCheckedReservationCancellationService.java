package io.example.reservations.services.reservation;

import static java.util.stream.Collectors.joining;

import clew.traceables.clew.SwTraceables;
import clew.traceables.clew.annotation.RealizesSw;
import io.example.reservations.entities.Item;
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
            throw new NotClaimOwnerException("User %s does not own the reservation on item(s) %s for [%s, %s)"
                    .formatted(user.id(), itemIdsOf(reservation),
                            reservation.window().start(), reservation.window().end()));
        }
        if (!isRecordedForEveryItem(reservation)) {
            throw new UnknownReservationException("No such reservation on item(s) %s for [%s, %s)"
                    .formatted(itemIdsOf(reservation), reservation.window().start(), reservation.window().end()));
        }
        reservationStore.remove(reservation);
    }

    private boolean isRecordedForEveryItem(Reservation reservation) {
        return reservation.items().stream()
                .allMatch(reservedItem -> reservationStore.reservationsFor(reservedItem).contains(reservation));
    }

    private static String itemIdsOf(Reservation reservation) {
        return reservation.items().stream()
                .map(Item::id)
                .sorted()
                .collect(joining(", "));
    }
}
