package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    @VerifiesEnt(EntTraceables.ENT_003_USER)
    void users_are_the_same_exactly_when_their_identities_are_equal() {
        User alice = new User("alice");
        User sameAlice = new User("alice");
        User bob = new User("bob");

        assertThat(alice).isEqualTo(sameAlice).hasSameHashCodeAs(sameAlice);
        assertThat(alice).isNotEqualTo(bob);
    }

    @Test
    void a_user_exposes_the_identity_it_was_constructed_with() {
        User alice = new User("alice");

        assertThat(alice.id()).isEqualTo("alice");
    }
}
