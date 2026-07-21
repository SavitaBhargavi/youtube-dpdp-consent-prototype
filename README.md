# YouTube DPDP Consent Flow - Full-Stack Demonstration

A high-fidelity, interactive full-stack web application demonstrating **Verifiable Parental Consent (VPC)** compliance for YouTube under India's **Digital Personal Data Protection (DPDP) Act, 2023**.

This project displays a side-by-side presentation: an interactive **mobile phone emulator** simulating the user journey of the teen and parent, and a **live developer dashboard** showing real-time updates to database tables and active HTTP network request logs.

---

## 🚀 Features

* **Dual-Role Simulation**:
  * **Teen Registration (Ananya)**: Input age details. If identified under 18, the profile gets locked until a verified parent completes consent.
  * **Parent Gateway (Rakesh)**: Expand the mock email notification, authenticate via simulated DigiLocker (Aadhaar OTP), toggle DPDP-mandated features (Ads, History, Comments), and grant approval.
* **Real-Time Polling & Sync**: The teen screen automatically detects the parent's approval and unlocks to show the tailormade YouTube feed without needing a page refresh.
* **Developer Inspector Column**:
  * **Live SQLite/JSON database viewer** mapping the `users` and `consent_requests` records.
  * **HTTP Request terminal** logging server endpoints (`POST`, `GET`, status codes) in real time.
* **DPDP-Compliant Design Patterns**: Includes visual alerts detailing how the flow adheres to Section 9 of the DPDP Act (default-off tracking, purpose limitation, verifiable identity).

---

## 🛠️ Tech Stack

* **Frontend**: React.js (Vite), Lucide Icons, Vanilla CSS (YouTube Dark theme design).
* **Backend**: Node.js, Express.js.
* **Database**: Pure JS File Database (`db.json`) for zero-dependency cross-platform portability.

---

## 📂 Project Structure

```text
youtube-dpdp-flow/
├── backend/
│   ├── db.json          # File database (stores users & requests)
│   ├── package.json     # Node scripts & server dependencies
│   └── server.js        # Express REST API, routing & validations
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main simulator dashboard component
│   │   ├── index.css    # Premium CSS design stylesheet
│   │   └── main.jsx     # React DOM renderer
│   ├── index.html       # HTML entrypoint
│   ├── vite.config.js   # Vite config & API dev server proxy settings
│   └── package.json     # Frontend dependencies (React, Lucide)
└── README.md            # Project documentation (this file)
```

---

## 💻 Local Setup & Running Instructions

Ensure you have [Node.js](https://nodejs.org/) installed.

### 1. Start the Backend
Open a terminal in the `backend` folder, install dependencies, and start the server:
```bash
cd backend
npm install
npm start
```
The server will run on **`http://localhost:5000`**.

### 2. Start the Frontend
Open a new terminal window in the `frontend` folder, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
The client will run on **`http://localhost:5173`**.

Open your browser and navigate to **[http://localhost:5173](http://localhost:5173)** to run the demo.

---

## 💡 Preseeded Test Data

To log in and pass the DigiLocker Aadhaar simulation, use one of the following mock profiles preseeded in the database:

* **Aadhaar**: `123456789012` | Name: **Rakesh Rao** (Registered mobile gets OTP)
* **Aadhaar**: `987654321098` | Name: **Sunita Sharma**
* **Aadhaar**: `555566667777` | Name: **Amit Kumar Patel**

*(Note: When you click "Generate OTP", the generated 6-digit passcode will print directly in your browser's Developer Console and in the HTTP Request log on the screen so you can copy and verify it instantly).*

---

## 📜 DPDP Act Section 9 Compliance Notes

1. **Section 9(1) - Verifiable Consent**: A data fiduciary must obtain verifiable consent of the parent or lawful guardian before processing any personal data of a child. This prototype simulates DigiLocker (Aadhaar verification) as the KYC tool to link the parent profile.
2. **Section 9(2) - Targeting Restrictions**: Fiduciaries are restricted from tracking, behavioral profiling, or running targeted advertisements directed at children. In the prototype, watch history profiling and personalized advertising default to **OFF** and must be explicitly turned on by a parent.
