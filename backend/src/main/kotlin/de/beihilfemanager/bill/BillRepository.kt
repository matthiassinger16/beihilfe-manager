package de.beihilfemanager.bill

import org.springframework.data.jpa.repository.JpaRepository

interface BillRepository : JpaRepository<Bill, Long> {
    fun findAllByOrderByInvoiceDateDescIdDesc(): List<Bill>
}
