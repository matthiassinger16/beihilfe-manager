package de.beihilfemanager.bill

import de.beihilfemanager.attachment.AttachmentService
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.LocalDate

enum class Payer { INSURANCE, BEIHILFE }

@Service
@Transactional
class BillService(
    private val repository: BillRepository,
    private val attachments: AttachmentService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun findAll(): List<Bill> = repository.findAllByOrderByInvoiceDateDescIdDesc()

    @Transactional(readOnly = true)
    fun get(id: Long): Bill = repository.findById(id).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "Bill $id not found")
    }

    fun create(request: BillRequest): Bill {
        val bill = Bill(
            doctor = request.doctor!!.trim(),
            patient = request.patient.blankToNull(),
            invoiceNumber = request.invoiceNumber.blankToNull(),
            invoiceDate = request.invoiceDate!!,
            dueDate = request.dueDate,
            amount = request.amount!!,
            description = request.description.blankToNull(),
            createdAt = clock.instant(),
        )
        return repository.save(bill)
    }

    fun update(id: Long, request: BillRequest): Bill = get(id).apply {
        doctor = request.doctor!!.trim()
        patient = request.patient.blankToNull()
        invoiceNumber = request.invoiceNumber.blankToNull()
        invoiceDate = request.invoiceDate!!
        dueDate = request.dueDate
        amount = request.amount!!
        description = request.description.blankToNull()
    }

    fun delete(id: Long) {
        val bill = get(id)
        attachments.deleteFilesOf(id)
        repository.delete(bill)
    }

    fun setPayment(id: Long, request: PaymentRequest): Bill = get(id).apply {
        paidOn = request.paidOn
    }

    fun updateClaim(id: Long, payer: Payer, request: ClaimUpdateRequest): Bill {
        val bill = get(id)
        val claim = when (payer) {
            Payer.INSURANCE -> bill.insurance
            Payer.BEIHILFE -> bill.beihilfe
        }
        val date = request.date ?: LocalDate.now(clock)
        when (request.status!!) {
            ClaimStatus.NOT_SUBMITTED -> {
                claim.submittedOn = null
                claim.decidedOn = null
                claim.reimbursedAmount = null
            }
            ClaimStatus.SUBMITTED -> {
                claim.submittedOn = date
                claim.decidedOn = null
                claim.reimbursedAmount = null
            }
            ClaimStatus.RECEIVED, ClaimStatus.DENIED -> {
                val submittedOn = claim.submittedOn ?: date
                if (date.isBefore(submittedOn)) {
                    throw ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Decision date $date is before submission date $submittedOn",
                    )
                }
                claim.submittedOn = submittedOn
                claim.decidedOn = date
                claim.reimbursedAmount =
                    if (request.status == ClaimStatus.RECEIVED) request.reimbursedAmount else null
            }
        }
        claim.status = request.status
        return bill
    }

    private fun String?.blankToNull(): String? = this?.trim()?.ifEmpty { null }
}
