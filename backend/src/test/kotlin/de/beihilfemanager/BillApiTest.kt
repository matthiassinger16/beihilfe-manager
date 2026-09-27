package de.beihilfemanager

import de.beihilfemanager.bill.BillRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.ObjectMapper

@SpringBootTest
@AutoConfigureMockMvc
class BillApiTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val objectMapper: ObjectMapper,
    @Autowired private val repository: BillRepository,
) {
    @BeforeEach
    fun cleanDatabase() {
        repository.deleteAll()
    }

    private fun createBill(doctor: String = "Dr. Müller", amount: String = "123.45"): Long {
        val response = mockMvc.post("/api/bills") {
            contentType = MediaType.APPLICATION_JSON
            content = """
                {"doctor": "$doctor", "patient": "Anna", "invoiceNumber": "R-1",
                 "invoiceDate": "2026-09-01", "dueDate": "2026-10-01", "amount": $amount}
            """
        }.andExpect {
            status { isCreated() }
            jsonPath("$.doctor") { value(doctor) }
            jsonPath("$.paidOn") { value(null) }
            jsonPath("$.insurance.status") { value("NOT_SUBMITTED") }
            jsonPath("$.beihilfe.status") { value("NOT_SUBMITTED") }
        }.andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asLong()
    }

    @Test
    fun `creates, lists, updates and deletes bills`() {
        val id = createBill()
        createBill(doctor = "Dr. Schmidt")

        mockMvc.get("/api/bills").andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
        }

        mockMvc.put("/api/bills/$id") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"doctor": "Dr. Müller-Lüdenscheidt", "invoiceDate": "2026-09-02", "amount": 99.99}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.doctor") { value("Dr. Müller-Lüdenscheidt") }
            jsonPath("$.amount") { value(99.99) }
            jsonPath("$.patient") { value(null) }
        }

        mockMvc.delete("/api/bills/$id").andExpect { status { isNoContent() } }
        mockMvc.get("/api/bills/$id").andExpect { status { isNotFound() } }
    }

    @Test
    fun `rejects invalid bills`() {
        mockMvc.post("/api/bills") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"doctor": " ", "invoiceDate": "2026-09-01", "amount": 0}"""
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `tracks payment`() {
        val id = createBill()
        mockMvc.put("/api/bills/$id/payment") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"paidOn": "2026-09-10"}"""
        }.andExpect { jsonPath("$.paidOn") { value("2026-09-10") } }

        mockMvc.put("/api/bills/$id/payment") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"paidOn": null}"""
        }.andExpect { jsonPath("$.paidOn") { value(null) } }
    }

    @Test
    fun `tracks insurance and beihilfe claims independently`() {
        val id = createBill()

        mockMvc.put("/api/bills/$id/insurance") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"status": "SUBMITTED", "date": "2026-09-05"}"""
        }.andExpect {
            jsonPath("$.insurance.status") { value("SUBMITTED") }
            jsonPath("$.insurance.submittedOn") { value("2026-09-05") }
            jsonPath("$.beihilfe.status") { value("NOT_SUBMITTED") }
        }

        mockMvc.put("/api/bills/$id/insurance") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"status": "RECEIVED", "date": "2026-09-20", "reimbursedAmount": 61.73}"""
        }.andExpect {
            jsonPath("$.insurance.status") { value("RECEIVED") }
            jsonPath("$.insurance.submittedOn") { value("2026-09-05") }
            jsonPath("$.insurance.decidedOn") { value("2026-09-20") }
            jsonPath("$.insurance.reimbursedAmount") { value(61.73) }
        }

        mockMvc.put("/api/bills/$id/beihilfe") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"status": "DENIED", "date": "2026-09-21"}"""
        }.andExpect {
            jsonPath("$.beihilfe.status") { value("DENIED") }
            jsonPath("$.beihilfe.submittedOn") { value("2026-09-21") }
            jsonPath("$.beihilfe.decidedOn") { value("2026-09-21") }
            jsonPath("$.insurance.status") { value("RECEIVED") }
        }

        mockMvc.put("/api/bills/$id/beihilfe") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"status": "NOT_SUBMITTED"}"""
        }.andExpect {
            jsonPath("$.beihilfe.status") { value("NOT_SUBMITTED") }
            jsonPath("$.beihilfe.submittedOn") { value(null) }
            jsonPath("$.beihilfe.decidedOn") { value(null) }
        }
    }

    @Test
    fun `rejects a decision dated before the submission`() {
        val id = createBill()
        mockMvc.put("/api/bills/$id/beihilfe") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"status": "SUBMITTED", "date": "2026-09-10"}"""
        }
        mockMvc.put("/api/bills/$id/beihilfe") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"status": "RECEIVED", "date": "2026-09-01"}"""
        }.andExpect { status { isBadRequest() } }
    }
}
