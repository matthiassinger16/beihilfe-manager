package de.beihilfemanager.attachment

import org.springframework.core.io.Resource
import org.springframework.http.CacheControl
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.time.Duration
import java.time.Instant

data class AttachmentResponse(
    val id: Long,
    val billId: Long,
    val filename: String,
    val contentType: String,
    val size: Long,
    val createdAt: Instant,
    val url: String,
)

fun Attachment.toResponse(): AttachmentResponse {
    val id = requireNotNull(id)
    return AttachmentResponse(id, billId, filename, contentType, size, createdAt, "/api/attachments/$id/content")
}

@RestController
class AttachmentController(private val service: AttachmentService) {

    @GetMapping("/api/bills/{billId}/attachments")
    fun list(@PathVariable billId: Long): List<AttachmentResponse> = service.list(billId).map { it.toResponse() }

    @PostMapping("/api/bills/{billId}/attachments", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(@PathVariable billId: Long, @RequestParam file: MultipartFile): AttachmentResponse =
        service.add(billId, file).toResponse()

    @GetMapping("/api/attachments/{id}/content")
    fun content(
        @PathVariable id: Long,
        @RequestParam(defaultValue = "false") download: Boolean,
    ): ResponseEntity<Resource> {
        val attachment = service.get(id)
        val disposition = if (download) ContentDisposition.attachment() else ContentDisposition.inline()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(attachment.contentType))
            .contentLength(attachment.size)
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.filename(attachment.filename, Charsets.UTF_8).build().toString())
            .header("X-Content-Type-Options", "nosniff")
            // The content behind an attachment id never changes.
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable())
            .body(service.load(attachment))
    }

    @DeleteMapping("/api/attachments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long) = service.delete(id)
}
