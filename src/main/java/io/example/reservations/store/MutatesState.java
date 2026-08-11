package io.example.reservations.store;

import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.RetentionPolicy.CLASS;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * Marks a method as changing persisted state. Retained in the class file so the
 * architecture test can read it from bytecode, but not at runtime — nothing reflects on it.
 */
@Target(METHOD)
@Retention(CLASS)
public @interface MutatesState {
}
