package de.beihilfemanager.bill

import jakarta.persistence.AttributeOverride
import jakarta.persistence.AttributeOverrides
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

/** Where a bill stands with one reimbursing party (private insurance or Beihilfe). */
enum class ClaimStatus {
    NOT_SUBMITTED,
    SUBMITTED,
    RECEIVED,
    DENIED,
}

@Embeddable
class Claim(
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ClaimStatus = ClaimStatus.NOT_SUBMITTED,
    var submittedOn: LocalDate? = null,
    var decidedOn: LocalDate? = null,
    @Column(precision = 12, scale = 2)
    var reimbursedAmount: BigDecimal? = null,
)

@Entity
@Table(name = "bill")
class Bill(
    var doctor: String,
    var patient: String?,
    var invoiceNumber: String?,
    var invoiceDate: LocalDate,
    var dueDate: LocalDate?,
    @Column(precision = 12, scale = 2)
    var amount: BigDecimal,
    var description: String?,
    var paidOn: LocalDate? = null,

    @Embedded
    @AttributeOverrides(
        AttributeOverride(name = "status", column = Column(name = "insurance_status", nullable = false)),
        AttributeOverride(name = "submittedOn", column = Column(name = "insurance_submitted_on")),
        AttributeOverride(name = "decidedOn", column = Column(name = "insurance_decided_on")),
        AttributeOverride(name = "reimbursedAmount", column = Column(name = "insurance_reimbursed_amount")),
    )
    var insurance: Claim = Claim(),

    @Embedded
    @AttributeOverrides(
        AttributeOverride(name = "status", column = Column(name = "beihilfe_status", nullable = false)),
        AttributeOverride(name = "submittedOn", column = Column(name = "beihilfe_submitted_on")),
        AttributeOverride(name = "decidedOn", column = Column(name = "beihilfe_decided_on")),
        AttributeOverride(name = "reimbursedAmount", column = Column(name = "beihilfe_reimbursed_amount")),
    )
    var beihilfe: Claim = Claim(),

    var createdAt: Instant = Instant.now(),

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
)
