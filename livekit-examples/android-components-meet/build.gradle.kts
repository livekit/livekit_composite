@file:Suppress("UNUSED_EXPRESSION")

// Top-level build file where you can add configuration options common to all sub-projects/modules.
@Suppress("DSL_SCOPE_VIOLATION") // TODO: Remove once KTIJ-19369 is fixed
plugins {
    alias(libs.plugins.androidApplication) apply false
    alias(libs.plugins.kotlinAndroid) apply false
    id("com.diffplug.spotless") version "6.19.0" apply false
}
true // Needed to make the Suppress annotation work for the plugins block

subprojects {
    apply(plugin = "com.diffplug.spotless")
    configure<com.diffplug.gradle.spotless.SpotlessExtension> {
        kotlin {
            target("**/*.kt")
            targetExclude("$buildDir/**/*.kt")

            ktlint()
            licenseHeaderFile(rootProject.file("LicenseHeaderFile.txt"))
        }
        java {
            target("**/*.java")
            targetExclude("$buildDir/**/*.java")
            // apply a specific flavor of google-java-format
            googleJavaFormat()
            // fix formatting of type annotations
            formatAnnotations()
            removeUnusedImports()
            toggleOffOn()
            licenseHeaderFile(rootProject.file("LicenseHeaderFile.txt"))
        }
        kotlinGradle {
            target("*.gradle.kts")
            ktlint()
        }
    }
}