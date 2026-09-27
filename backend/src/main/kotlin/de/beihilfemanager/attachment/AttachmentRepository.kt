package de.beihilfemanager.attachment

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface AttachmentRepository : JpaRepository<Attachment, Long> {
    fun findAllByBillIdOrderByCreatedAtAscIdAsc(billId: Long): List<Attachment>

    fun countByBillId(billId: Long): Long

    @Query("select a.billId as billId, count(a) as count from Attachment a group by a.billId")
    fun countPerBill(): List<AttachmentCount>

    interface AttachmentCount {
        val billId: Long
        val count: Long
    }
}
