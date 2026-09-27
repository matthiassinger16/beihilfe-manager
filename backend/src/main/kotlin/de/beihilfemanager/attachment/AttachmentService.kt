package de.beihilfemanager.attachment

import de.beihilfemanager.bill.BillRepository
import org.springframework.core.io.Resource
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.util.StringUtils
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.time.Clock

@Service
@Transactional
class AttachmentService(
    private val repository: AttachmentRepository,
    private val billRepository: BillRepository,
    private val storage: AttachmentStorage,
    private val clock: Clock,
) {
    companion object {
        /** Scans and photos only; notably no SVG or HTML, which could run scripts when opened. */
        val ALLOWED_CONTENT_TYPES = setOf(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
        )
    }

    @Transactional(readOnly = true)
    fun list(billId: Long): List<Attachment> {
        requireBill(billId)
        return repository.findAllByBillIdOrderByCreatedAtAscIdAsc(billId)
    }

    @Transactional(readOnly = true)
    fun get(id: Long): Attachment = repository.findById(id).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment $id not found")
    }

    @Transactional(readOnly = true)
    fun count(billId: Long): Int = repository.countByBillId(billId).toInt()

    @Transactional(readOnly = true)
    fun countPerBill(): Map<Long, Int> = repository.countPerBill().associate { it.billId to it.count.toInt() }

    @Transactional(readOnly = true)
    fun load(attachment: Attachment): Resource = storage.load(attachment.storageKey)

    fun add(billId: Long, file: MultipartFile): Attachment {
        requireBill(billId)
        if (file.isEmpty) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The file is empty")
        val contentType = file.contentType?.lowercase()
        if (contentType !in ALLOWED_CONTENT_TYPES) {
            throw ResponseStatusException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Only images and PDF files can be attached (got ${contentType ?: "unknown type"})",
            )
        }
        val key = storage.store(file.inputStream)
        afterRollback { storage.delete(key) }
        return repository.save(
            Attachment(
                billId = billId,
                filename = filenameOf(file),
                contentType = contentType!!,
                size = file.size,
                storageKey = key,
                createdAt = clock.instant(),
            ),
        )
    }

    fun delete(id: Long) {
        val attachment = get(id)
        repository.delete(attachment)
        afterCommit { storage.delete(attachment.storageKey) }
    }

    /** Removes the files of a bill that is being deleted; the rows go with the bill (ON DELETE CASCADE). */
    fun deleteFilesOf(billId: Long) {
        val keys = repository.findAllByBillIdOrderByCreatedAtAscIdAsc(billId).map { it.storageKey }
        afterCommit { keys.forEach(storage::delete) }
    }

    private fun requireBill(billId: Long) {
        if (!billRepository.existsById(billId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Bill $billId not found")
        }
    }

    private fun filenameOf(file: MultipartFile): String =
        StringUtils.getFilename(file.originalFilename?.replace('\\', '/'))
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.take(255)
            ?: "scan"

    private fun afterCommit(action: () -> Unit) = onCompletion(TransactionSynchronization.STATUS_COMMITTED, action)

    private fun afterRollback(action: () -> Unit) = onCompletion(TransactionSynchronization.STATUS_ROLLED_BACK, action)

    private fun onCompletion(expectedStatus: Int, action: () -> Unit) {
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCompletion(status: Int) {
                if (status == expectedStatus) action()
            }
        })
    }
}
