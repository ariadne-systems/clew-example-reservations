package io.example.reservations.entities;

import static org.assertj.core.api.Assertions.assertThat;

import clew.traceables.clew.EntTraceables;
import clew.traceables.clew.annotation.VerifiesEnt;
import org.junit.jupiter.api.Test;

class ItemTest {

    @Test
    @VerifiesEnt(EntTraceables.ENT_001_ITEM)
    void items_are_the_same_exactly_when_their_identities_are_equal() {
        Item meetingRoom = new Item("room-1");
        Item sameMeetingRoom = new Item("room-1");
        Item otherMeetingRoom = new Item("room-2");

        assertThat(meetingRoom).isEqualTo(sameMeetingRoom).hasSameHashCodeAs(sameMeetingRoom);
        assertThat(meetingRoom).isNotEqualTo(otherMeetingRoom);
    }

    @Test
    void an_item_exposes_the_identity_it_was_constructed_with() {
        Item meetingRoom = new Item("room-1");

        assertThat(meetingRoom.id()).isEqualTo("room-1");
    }
}
