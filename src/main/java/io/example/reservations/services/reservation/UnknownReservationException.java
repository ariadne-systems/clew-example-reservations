package io.example.reservations.services.reservation;

public final class UnknownReservationException extends RuntimeException {

    public UnknownReservationException(String message) {
        super(message);
    }
}
