

# HireOX.AI BY Excommunicado

<p align="center">
  <img src="https://img.shields.io/badge/Domain-hireox.ai-black?style=for-the-badge" />
</p>

Hireox.AI is an AI-powered agentic mock interview platform designed to help candidates build confidence through adaptive, real-time interview simulations.

Upload your resume, select a target role, and experience an AI interviewer that thinks, adapts, probes deeper, and delivers structured performance feedback.

---

## Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-0F172A?style=for-the-badge&logo=tailwind-css&logoColor=38BDF8" />
  <img src="https://img.shields.io/badge/Redux-593D88?style=for-the-badge&logo=redux&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" />
</p>

---

## Features

* Agentic AI mock interviewer
* Resume and job description parsing
* Adaptive follow-up questioning
* Behavioral and technical rounds
* Structured post-interview report
* Confidence and communication scoring
* Payment integration
* Authentication and session tracking

---

## Installation

Clone the repository and install dependencies.

```bash
git clone https://github.com/yourusername/diwakarbhagathireox.git
cd diwakarbhagathireox
npm install
```

---

## Environment Setup

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_RAZORPAY_KEY=your_razorpay_key
VITE_API_BASE_URL=http://localhost:5000
```

Ensure `.env` is added to `.gitignore`.

---

## Start Development Server

```bash
npm run dev
```

Application runs at:

```
http://localhost:5173
```

---

## Production Build

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Usage Example

```javascript
const response = await fetch("/api/interview/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    role: "Frontend Developer",
    experience: "2 years",
    resume_url: "https://example.com/resume.pdf"
  })
});

const data = await response.json();

console.log(data);
```

Example structured feedback response:

```json
{
  "communication_score": 8.2,
  "technical_depth_score": 7.5,
  "confidence_score": 8.8,
  "strengths": ["Clear explanation of state management", "Structured answers"],
  "improvements": ["Optimize time management", "Add real-world metrics to examples"]
}
```

---

## Workflow

1. User selects target role and uploads resume
2. AI parses resume and job context
3. Adaptive interview session begins
4. Follow-up questions generated dynamically
5. Structured performance report generated
6. User reviews feedback and improvement areas

---

## Deployment

Build command:

```bash
npm run build
```

Output directory:

```
dist
```

Recommended platforms:

* Render
* AWS + Kubernetes

Custom domain:

```
hireox.ai
```

---

## Contributing

Pull requests are welcome.
For major changes, open an issue first to discuss proposed updates.

Ensure tests and documentation are updated where applicable.

---
# AIML ON TOP

---


## License

MIT License

---

