package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    @VerifiesEnt(EntTraceables.ENT_003_USER)
    void users_are_the_same_exactly_when_their_identities_are_equal_whatever_quota_each_carries() {
        User alice = new User("alice", 3);
        User sameAlice = new User("alice", 3);
        User aliceOnADifferentQuota = new User("alice", 7);
        User unboundedAlice = new User("alice");
        User bob = new User("bob", 3);

        assertThat(alice).isEqualTo(sameAlice).hasSameHashCodeAs(sameAlice);
        assertThat(alice).isEqualTo(aliceOnADifferentQuota).hasSameHashCodeAs(aliceOnADifferentQuota);
        assertThat(alice).isEqualTo(unboundedAlice).hasSameHashCodeAs(unboundedAlice);
        assertThat(alice).isNotEqualTo(bob);
    }

    @Test
    void a_user_exposes_the_identity_and_the_quota_it_was_constructed_with() {
        User alice = new User("alice", 3);

        assertThat(alice.id()).isEqualTo("alice");
        assertThat(alice.quota()).isEqualTo(3);
    }

    @Test
    void a_user_constructed_without_a_quota_carries_the_unbounded_one() {
        User alice = new User("alice");

        assertThat(alice.quota()).isEqualTo(User.UNBOUNDED_QUOTA);
    }

    @Test
    void a_negative_quota_is_rejected_when_the_user_is_constructed() {
        assertThatThrownBy(() -> new User("alice", -1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void a_user_is_not_equal_to_a_value_of_another_type() {
        User alice = new User("alice", 3);

        assertThat(alice).isNotEqualTo("alice");
    }
}
