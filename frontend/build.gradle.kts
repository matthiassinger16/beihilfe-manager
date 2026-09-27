import com.github.gradle.node.npm.task.NpmTask

plugins {
    base
    id("com.github.node-gradle.node")
}

node {
    // Download a pinned Node.js so the build does not depend on a local installation.
    download.set(true)
    version.set("24.21.0")
    npmInstallCommand.set("ci")
}

val npmBuild = tasks.register<NpmTask>("npmBuild") {
    description = "Builds the Angular app for production."
    group = "build"
    dependsOn(tasks.npmInstall)
    args.set(listOf("run", "build"))
    inputs.dir("src")
    inputs.dir("public")
    inputs.files("angular.json", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.app.json")
    outputs.dir(layout.projectDirectory.dir("dist"))
}

val npmTest = tasks.register<NpmTask>("npmTest") {
    description = "Runs the Angular unit tests."
    group = "verification"
    dependsOn(tasks.npmInstall)
    args.set(listOf("test", "--", "--watch=false"))
    inputs.dir("src")
    inputs.files("angular.json", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.spec.json")
    outputs.upToDateWhen { true }
}

tasks.assemble { dependsOn(npmBuild) }
tasks.check { dependsOn(npmTest) }
tasks.clean { delete("dist") }

// Exposes the compiled app to the backend, which packages it into the Spring Boot jar.
val frontendDist = configurations.create("frontendDist") {
    isCanBeConsumed = true
    isCanBeResolved = false
}

artifacts {
    add(frontendDist.name, layout.projectDirectory.dir("dist/frontend/browser")) {
        builtBy(npmBuild)
    }
}
