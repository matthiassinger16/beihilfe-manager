package de.beihilfemanager.attachment

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

/** A scan or photo of a bill. The file itself lives in [AttachmentStorage] under [storageKey]. */
@Entity
@Table(name = "attachment")
class Attachment(
    @Column(name = "bill_id", nullable = false)
    var billId: Long,
    var filename: String,
    var contentType: String,
    var size: Long,
    var storageKey: String,
    var createdAt: Instant,

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
)
