package de.beihilfemanager.bill

import de.beihilfemanager.attachment.AttachmentService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/bills")
class BillController(
    private val service: BillService,
    private val attachments: AttachmentService,
) {

    @GetMapping
    fun list(): List<BillResponse> {
        val counts = attachments.countPerBill()
        return service.findAll().map { it.toResponse(counts[it.id] ?: 0) }
    }

    @GetMapping("/{id}")
    fun get(@PathVariable id: Long): BillResponse = service.get(id).toResponse()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: BillRequest): BillResponse = service.create(request).toResponse()

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody request: BillRequest): BillResponse =
        service.update(id, request).toResponse()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long) = service.delete(id)

    @PutMapping("/{id}/payment")
    fun setPayment(@PathVariable id: Long, @RequestBody request: PaymentRequest): BillResponse =
        service.setPayment(id, request).toResponse()

    @PutMapping("/{id}/insurance")
    fun updateInsurance(@PathVariable id: Long, @Valid @RequestBody request: ClaimUpdateRequest): BillResponse =
        service.updateClaim(id, Payer.INSURANCE, request).toResponse()

    @PutMapping("/{id}/beihilfe")
    fun updateBeihilfe(@PathVariable id: Long, @Valid @RequestBody request: ClaimUpdateRequest): BillResponse =
        service.updateClaim(id, Payer.BEIHILFE, request).toResponse()

    private fun Bill.toResponse() = toResponse(attachments.count(requireNotNull(id)))
}
