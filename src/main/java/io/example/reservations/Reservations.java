package io.example.reservations;

import io.example.reservations.api.ReservationEngine;
import io.example.reservations.services.availability.ComputedAvailabilityService;
import io.example.reservations.services.reservation.CheckedReservationConfirmationService;
import io.example.reservations.store.InMemoryReservationStore;
import io.example.reservations.store.ReservationStore;

public final class Reservations {

    private Reservations() {
    }

    public static ReservationEngine newInMemoryReservationEngine() {
        ReservationStore reservationStore = new InMemoryReservationStore();
        ComputedAvailabilityService availabilityService = new ComputedAvailabilityService(reservationStore);
        return new ReservationEngine(
                new CheckedReservationConfirmationService(availabilityService, reservationStore),
                availabilityService);
    }
}
