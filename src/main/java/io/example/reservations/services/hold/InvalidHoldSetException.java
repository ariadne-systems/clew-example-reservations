package io.example.reservations.services.hold;

public final class InvalidHoldSetException extends RuntimeException {

    public InvalidHoldSetException(String message) {
        super(message);
    }
}
