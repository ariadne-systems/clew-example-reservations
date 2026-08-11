package io.example.reservations.services.hold;

public final class ExpiredHoldException extends RuntimeException {

    public ExpiredHoldException(String message) {
        super(message);
    }
}
