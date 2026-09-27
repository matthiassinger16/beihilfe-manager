# Beihilfe Manager

Keep track of doctor's bills and their reimbursement: whether a bill is paid, and where it
stands with the private health insurance and with the Beihilfe.

- **Angular 22** frontend (`frontend/`)
- **Spring Boot 4 + Kotlin** backend (`backend/`) with an H2 file database and Flyway migrations
- One **Gradle** build for both; the Angular app is packaged into the Spring Boot jar

## Features

- Add and edit bills (doctor, patient, invoice number, invoice and due date, amount, notes)
- Mark a bill as **paid** (and undo it); unpaid bills past their due date show as overdue
- Track **insurance** and **Beihilfe** separately: *not sent → sent → received / denied*,
  with dates and the amount received
- Overview with totals still to pay, amounts awaiting insurance and Beihilfe, and the total reimbursed
- Filter by *unpaid*, *to send*, *awaiting reply*, *done*, plus a text search

## Running it

Requires JDK 21. Gradle downloads its own Node.js for the frontend build.

```bash
./gradlew build                                      # build and run all tests
java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar
```

Then open <http://localhost:8080>.

Data is stored in `./data/beihilfe.mv.db`, relative to the directory you start the app from.
Set `BEIHILFE_DB_PATH` to keep it elsewhere, e.g. `BEIHILFE_DB_PATH=$HOME/beihilfe/db`.
To back up, copy that file while the app is stopped.

## Development

Run the backend and the Angular dev server side by side:

```bash
./gradlew :backend:bootRun        # API on http://localhost:8080 (database in backend/data/)
cd frontend && npm install && npm start   # UI on http://localhost:4200, proxies /api to the backend
```

`npm start` needs Node.js 22.22.3+ or 24.15+ installed locally.

Tests:

```bash
./gradlew :backend:test           # Spring Boot API tests
./gradlew :frontend:npmTest       # Angular unit tests (Vitest)
```

## API

| Method   | Path                        | Body                                            |
|----------|-----------------------------|-------------------------------------------------|
| `GET`    | `/api/bills`                |                                                 |
| `GET`    | `/api/bills/{id}`           |                                                 |
| `POST`   | `/api/bills`                | `{doctor, patient, invoiceNumber, invoiceDate, dueDate, amount, description}` |
| `PUT`    | `/api/bills/{id}`           | same as `POST`                                  |
| `DELETE` | `/api/bills/{id}`           |                                                 |
| `PUT`    | `/api/bills/{id}/payment`   | `{paidOn}` (`null` marks it unpaid)             |
| `PUT`    | `/api/bills/{id}/insurance` | `{status, date, reimbursedAmount}`              |
| `PUT`    | `/api/bills/{id}/beihilfe`  | `{status, date, reimbursedAmount}`              |

`status` is one of `NOT_SUBMITTED`, `SUBMITTED`, `RECEIVED`, `DENIED`. `date` is the date the
claim was sent (`SUBMITTED`) or decided (`RECEIVED`/`DENIED`) and defaults to today.
