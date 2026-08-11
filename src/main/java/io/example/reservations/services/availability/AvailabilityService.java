package io.example.reservations.services.availability;

import io.example.reservations.entities.Item;
import io.example.reservations.entities.TimeWindow;

public interface AvailabilityService {

    boolean isAvailable(Item item, TimeWindow window);
}
