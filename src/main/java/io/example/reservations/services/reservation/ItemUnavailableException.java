package io.example.reservations.services.reservation;

public final class ItemUnavailableException extends RuntimeException {

    public ItemUnavailableException(String message) {
        super(message);
    }
}
