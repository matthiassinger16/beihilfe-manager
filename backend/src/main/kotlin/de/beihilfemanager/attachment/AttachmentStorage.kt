package de.beihilfemanager.attachment

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.stereotype.Component
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

/** Keeps attachment files in `<data-dir>/attachments`, named by a random key. */
@Component
class AttachmentStorage(@Value("\${beihilfe.data-dir}") dataDir: Path) {
    private val root: Path = dataDir.resolve("attachments").toAbsolutePath().normalize()

    init {
        Files.createDirectories(root)
    }

    fun store(content: InputStream): String {
        val key = UUID.randomUUID().toString()
        content.use { Files.copy(it, root.resolve(key)) }
        return key
    }

    fun load(key: String): Resource = FileSystemResource(root.resolve(key))

    fun delete(key: String) {
        Files.deleteIfExists(root.resolve(key))
    }
}
