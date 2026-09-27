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
- Attach **scans, photos and PDFs** to a bill. On a phone, "Take photo" opens the camera; large
  photos are scaled down in the browser before upload
- Works on phones: amounts accept a decimal comma (`184,62`), and the app can be added to the
  Android home screen

## Running it

Requires Java 17 or newer to run (JDK 17+ to build). Gradle downloads its own Node.js for the
frontend build.

```bash
./gradlew build                                   # build and run all tests
java -jar backend/build/libs/beihilfe-manager.jar
```

Then open <http://localhost:8080>.

The database and uploaded scans are stored in `./data/`, relative to the directory you start the
app from. Set `BEIHILFE_DATA_DIR` to keep them elsewhere.

## Raspberry Pi

Only one process runs on the Pi: the jar serves both the website and the API on port 8080.
A Pi 3, 4 or 5 with a 64-bit Raspberry Pi OS works; the app uses about 350 MB of RAM and takes
roughly 15–60 seconds to start, depending on the model.

1. **Build the jar** on your computer with `./gradlew build` (or download the
   `beihilfe-manager` artifact from a GitHub Actions run). The jar runs on any CPU, so there is
   no need to build on the Pi.
2. **Install Java** on the Pi:
   ```bash
   sudo apt update && sudo apt install openjdk-17-jre-headless   # Bookworm; on Trixie use openjdk-21-jre-headless
   ```
3. **Copy the jar and service file** to the Pi and install them:
   ```bash
   scp backend/build/libs/beihilfe-manager.jar deploy/beihilfe-manager.service deploy/backup.sh pi@raspberrypi.local:
   ssh pi@raspberrypi.local
   sudo useradd --system --no-create-home --shell /usr/sbin/nologin beihilfe
   sudo mkdir -p /opt/beihilfe-manager
   sudo mv beihilfe-manager.jar backup.sh /opt/beihilfe-manager/
   sudo mv beihilfe-manager.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now beihilfe-manager
   journalctl -u beihilfe-manager -f      # wait for "Started BeihilfeManagerApplicationKt"
   ```
4. **Open it** from any device on your network at `http://<pi-ip-address>:8080`. Give the Pi a
   fixed address in your router (DHCP reservation) so the bookmark keeps working; Android does not
   reliably resolve `raspberrypi.local` names.

To **update**, copy the new jar over `/opt/beihilfe-manager/beihilfe-manager.jar` and run
`sudo systemctl restart beihilfe-manager`. Database changes are migrated automatically on start.

There is no login, so only run it on your home network and don't forward port 8080 on your router.

**Backups:** everything lives in `/var/lib/beihilfe-manager` (database plus the `attachments`
folder). `deploy/backup.sh` stops the app for a moment, writes a dated `.tar.gz` and keeps the last
30. Run it nightly, e.g. to a USB stick, with `sudo crontab -e`:
```
15 3 * * * /opt/beihilfe-manager/backup.sh /media/usb/beihilfe-backups
```
SD cards do fail, so keep the backups on a different device.

## Using it on an Android phone

Open `http://<pi-ip-address>:8080` in Chrome. The layout adapts to the phone, bills are shown as
cards, and the bill form and detail page have a **Take photo** button that opens the camera.

To get an app-like icon, use Chrome's menu → *Add to home screen*. Because the app is served over
plain HTTP, Chrome creates a shortcut that opens in a browser tab rather than a full-screen app.
If you want it full-screen, open `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on the
phone, add `http://<pi-ip-address>:8080`, restart Chrome, and then choose *Install app*.

## Development

Run the backend and the Angular dev server side by side:

```bash
./gradlew :backend:bootRun        # API on http://localhost:8080 (data in backend/data/)
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
| `GET`    | `/api/bills/{id}/attachments` |                                               |
| `POST`   | `/api/bills/{id}/attachments` | multipart form with a `file` (JPEG, PNG, WebP, GIF, HEIC or PDF, max. 25 MB) |
| `GET`    | `/api/attachments/{id}/content` | the file itself (`?download=true` to download) |
| `DELETE` | `/api/attachments/{id}`     |                                                 |

`status` is one of `NOT_SUBMITTED`, `SUBMITTED`, `RECEIVED`, `DENIED`. `date` is the date the
claim was sent (`SUBMITTED`) or decided (`RECEIVED`/`DENIED`) and defaults to today.
