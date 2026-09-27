package de.beihilfemanager.bill

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Digits
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

/** Payload for creating or editing the core data of a bill. */
data class BillRequest(
    @field:NotBlank @field:Size(max = 200)
    val doctor: String?,
    @field:Size(max = 200)
    val patient: String? = null,
    @field:Size(max = 100)
    val invoiceNumber: String? = null,
    @field:NotNull
    val invoiceDate: LocalDate?,
    val dueDate: LocalDate? = null,
    @field:NotNull @field:DecimalMin("0.01") @field:Digits(integer = 10, fraction = 2)
    val amount: BigDecimal?,
    @field:Size(max = 2000)
    val description: String? = null,
)

/** Marks a bill as paid on the given date, or as unpaid when [paidOn] is null. */
data class PaymentRequest(
    val paidOn: LocalDate?,
)

/**
 * Moves a claim to [status]. [date] is the submission date for SUBMITTED and the decision
 * date for RECEIVED / DENIED; it defaults to today. [reimbursedAmount] only applies to RECEIVED.
 */
data class ClaimUpdateRequest(
    @field:NotNull
    val status: ClaimStatus?,
    val date: LocalDate? = null,
    @field:DecimalMin("0.00") @field:Digits(integer = 10, fraction = 2)
    val reimbursedAmount: BigDecimal? = null,
)

data class ClaimResponse(
    val status: ClaimStatus,
    val submittedOn: LocalDate?,
    val decidedOn: LocalDate?,
    val reimbursedAmount: BigDecimal?,
)

data class BillResponse(
    val id: Long,
    val doctor: String,
    val patient: String?,
    val invoiceNumber: String?,
    val invoiceDate: LocalDate,
    val dueDate: LocalDate?,
    val amount: BigDecimal,
    val description: String?,
    val paidOn: LocalDate?,
    val insurance: ClaimResponse,
    val beihilfe: ClaimResponse,
    val attachmentCount: Int,
    val createdAt: Instant,
)

fun Claim.toResponse() = ClaimResponse(status, submittedOn, decidedOn, reimbursedAmount)

fun Bill.toResponse(attachmentCount: Int) = BillResponse(
    id = requireNotNull(id),
    doctor = doctor,
    patient = patient,
    invoiceNumber = invoiceNumber,
    invoiceDate = invoiceDate,
    dueDate = dueDate,
    amount = amount,
    description = description,
    paidOn = paidOn,
    insurance = insurance.toResponse(),
    beihilfe = beihilfe.toResponse(),
    attachmentCount = attachmentCount,
    createdAt = createdAt,
)
