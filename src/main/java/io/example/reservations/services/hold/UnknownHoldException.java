package io.example.reservations.services.hold;

public final class UnknownHoldException extends RuntimeException {

    public UnknownHoldException(String message) {
        super(message);
    }
}
