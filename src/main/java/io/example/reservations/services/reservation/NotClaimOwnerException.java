package io.example.reservations.services.reservation;

public final class NotClaimOwnerException extends RuntimeException {

    public NotClaimOwnerException(String message) {
        super(message);
    }
}
