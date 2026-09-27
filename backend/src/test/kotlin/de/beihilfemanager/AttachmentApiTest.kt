package de.beihilfemanager

import de.beihilfemanager.attachment.AttachmentRepository
import de.beihilfemanager.bill.BillRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.listDirectoryEntries
import kotlin.test.assertEquals

@SpringBootTest
@AutoConfigureMockMvc
class AttachmentApiTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val objectMapper: ObjectMapper,
    @Autowired private val bills: BillRepository,
    @Autowired private val attachments: AttachmentRepository,
    @Value("\${beihilfe.data-dir}") dataDir: Path,
) {
    private val storageDir = dataDir.resolve("attachments")
    private val jpeg = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte(), 1, 2, 3)

    @BeforeEach
    fun clean() {
        attachments.deleteAll()
        bills.deleteAll()
        storageDir.listDirectoryEntries().forEach(Files::delete)
    }

    private fun createBill(): Long {
        val response = mockMvc.post("/api/bills") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"doctor": "Dr. Müller", "invoiceDate": "2026-09-01", "amount": 50}"""
        }.andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asLong()
    }

    private fun upload(billId: Long, file: MockMultipartFile): Long {
        val response = mockMvc.multipart("/api/bills/$billId/attachments") { file(file) }
            .andExpect { status { isCreated() } }
            .andReturn().response.contentAsString
        return objectMapper.readTree(response)["id"].asLong()
    }

    @Test
    fun `uploads, lists, serves and deletes attachments`() {
        val billId = createBill()
        val id = upload(billId, MockMultipartFile("file", "Rechnung März.jpg", "image/jpeg", jpeg))

        mockMvc.get("/api/bills/$billId/attachments").andExpect {
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].filename") { value("Rechnung März.jpg") }
            jsonPath("$[0].contentType") { value("image/jpeg") }
            jsonPath("$[0].size") { value(jpeg.size) }
            jsonPath("$[0].url") { value("/api/attachments/$id/content") }
        }
        mockMvc.get("/api/bills/$billId").andExpect { jsonPath("$.attachmentCount") { value(1) } }
        mockMvc.get("/api/bills").andExpect { jsonPath("$[0].attachmentCount") { value(1) } }

        mockMvc.get("/api/attachments/$id/content").andExpect {
            status { isOk() }
            content { contentType("image/jpeg") }
            content { bytes(jpeg) }
            header { string("X-Content-Type-Options", "nosniff") }
            header { string("Content-Disposition", "inline; filename=\"Rechnung Maerz.jpg\"; filename*=UTF-8''Rechnung%20M%C3%A4rz.jpg") }
        }

        mockMvc.delete("/api/attachments/$id").andExpect { status { isNoContent() } }
        mockMvc.get("/api/attachments/$id/content").andExpect { status { isNotFound() } }
        assertEquals(0, storageDir.listDirectoryEntries().size)
    }

    @Test
    fun `deleting a bill removes its attachments`() {
        val billId = createBill()
        upload(billId, MockMultipartFile("file", "scan.pdf", "application/pdf", "%PDF-1.4".toByteArray()))
        assertEquals(1, storageDir.listDirectoryEntries().size)

        mockMvc.delete("/api/bills/$billId").andExpect { status { isNoContent() } }

        assertEquals(0, attachments.count())
        assertEquals(0, storageDir.listDirectoryEntries().size)
    }

    @Test
    fun `rejects unsupported files`() {
        val billId = createBill()
        mockMvc.multipart("/api/bills/$billId/attachments") {
            file(MockMultipartFile("file", "evil.svg", "image/svg+xml", "<svg/>".toByteArray()))
        }.andExpect { status { isUnsupportedMediaType() } }
        mockMvc.multipart("/api/bills/$billId/attachments") {
            file(MockMultipartFile("file", "empty.jpg", "image/jpeg", ByteArray(0)))
        }.andExpect { status { isBadRequest() } }
        mockMvc.multipart("/api/bills/999999/attachments") {
            file(MockMultipartFile("file", "a.jpg", "image/jpeg", jpeg))
        }.andExpect { status { isNotFound() } }
        assertEquals(0, storageDir.listDirectoryEntries().size)
    }
}
