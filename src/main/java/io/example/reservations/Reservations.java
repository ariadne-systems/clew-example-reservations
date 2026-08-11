package io.example.reservations;

import io.example.reservations.api.ReservationEngine;
import io.example.reservations.clock.Clock;
import io.example.reservations.clock.SystemClock;
import io.example.reservations.services.availability.ComputedAvailabilityService;
import io.example.reservations.services.hold.ExpiringHoldService;
import io.example.reservations.services.quota.ClaimCountingQuotaService;
import io.example.reservations.services.reservation.CheckedReservationConfirmationService;
import io.example.reservations.services.reservation.OwnerCheckedReservationCancellationService;
import io.example.reservations.store.InMemoryReservationStore;
import io.example.reservations.store.ReservationStore;

public final class Reservations {

    private Reservations() {
    }

    public static ReservationEngine newInMemoryReservationEngine() {
        return newInMemoryReservationEngine(new SystemClock());
    }

    public static ReservationEngine newInMemoryReservationEngine(Clock clock) {
        ReservationStore reservationStore = new InMemoryReservationStore();
        ComputedAvailabilityService availabilityService =
                new ComputedAvailabilityService(reservationStore, clock);
        ClaimCountingQuotaService quotaService = new ClaimCountingQuotaService(reservationStore, clock);
        return new ReservationEngine(
                new CheckedReservationConfirmationService(availabilityService, quotaService, reservationStore),
                new OwnerCheckedReservationCancellationService(reservationStore),
                new ExpiringHoldService(availabilityService, quotaService, reservationStore, clock),
                availabilityService);
    }
}
