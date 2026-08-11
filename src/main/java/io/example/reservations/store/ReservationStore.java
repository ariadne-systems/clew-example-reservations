package io.example.reservations.store;

import clew.traceables.clew.ArchTraceables;
import clew.traceables.clew.annotation.RealizesArch;
import io.example.reservations.entities.Item;
import io.example.reservations.entities.Reservation;
import java.util.List;

@RealizesArch(ArchTraceables.ARCH_001_STATE_CHANGE_THROUGH_STORE)
public interface ReservationStore {

    List<Reservation> reservationsFor(Item item);

    @MutatesState
    void record(Reservation reservation);
}
