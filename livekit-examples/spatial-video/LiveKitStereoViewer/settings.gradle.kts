pluginManagement {
  repositories {
    mavenCentral()
    google()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    mavenCentral()
    maven(url = "https://jitpack.io")
    google()
  }
}

rootProject.name = "LiveKitStereoViewer"

include(":app")
