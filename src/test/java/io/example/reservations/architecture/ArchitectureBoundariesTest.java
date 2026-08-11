package io.example.reservations.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaPackage;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import io.example.reservations.store.MutatesState;
import org.jspecify.annotations.NullMarked;

@AnalyzeClasses(packages = "io.example.reservations", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureBoundariesTest {

    private static final String PACKAGE_INFO = "package-info";

    @ArchTest
    static final ArchRule entities_depend_on_nothing_above_them =
            noClasses().that().resideInAPackage("..entities..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("..api..", "..services..", "..store..");

    @ArchTest
    static final ArchRule api_does_not_reach_into_the_store =
            noClasses().that().resideInAPackage("..api..")
                    .should().dependOnClassesThat().resideInAPackage("..store..");

    @ArchTest
    static final ArchRule state_mutating_methods_are_declared_only_in_the_store =
            methods().that().areAnnotatedWith(MutatesState.class)
                    .should().beDeclaredInClassesThat().resideInAPackage("..store..");

    @ArchTest
    static final ArchRule every_package_is_null_marked =
            classes().should(resideInANullMarkedPackage());

    private static ArchCondition<JavaClass> resideInANullMarkedPackage() {
        return new ArchCondition<>("reside in a package carrying a @NullMarked package-info") {
            @Override
            public void check(JavaClass javaClass, ConditionEvents conditionEvents) {
                JavaPackage javaPackage = javaClass.getPackage();
                boolean nullMarked = javaPackage.getClasses().stream()
                        .filter(packageMember -> PACKAGE_INFO.equals(packageMember.getSimpleName()))
                        .anyMatch(packageInfo -> packageInfo.isAnnotatedWith(NullMarked.class));
                conditionEvents.add(new SimpleConditionEvent(javaClass, nullMarked,
                        "package %s has %s @NullMarked package-info"
                                .formatted(javaPackage.getName(), nullMarked ? "a" : "no")));
            }
        };
    }
}
