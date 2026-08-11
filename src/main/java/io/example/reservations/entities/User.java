package io.example.reservations.entities;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.RealizesEnt;
import org.jspecify.annotations.Nullable;

@RealizesEnt(EntTraceables.ENT_003_USER)
public record User(String id, int quota) {

    public static final int UNBOUNDED_QUOTA = Integer.MAX_VALUE;

    public User {
        if (quota < 0) {
            throw new IllegalArgumentException("A quota cannot be negative, but user %s was given %d"
                    .formatted(id, quota));
        }
    }

    public User(String id) {
        this(id, UNBOUNDED_QUOTA);
    }

    @Override
    public boolean equals(@Nullable Object other) {
        return other instanceof User otherUser && id.equals(otherUser.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}
