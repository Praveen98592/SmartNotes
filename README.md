# SmartNotes – Full-Stack AI Workspace

A full-stack, privacy-first note-taking application powered by **.NET 10**, **React**, and on-device AI inference using **Llama 3.2** via **Ollama**.

SmartNotes allows you to draft notes, generate executive summaries, and extract structured action items without any text leaving your local machine.

---

## 🚀 Key Features

* **Local AI Processing:** 100% private summarization and task extraction using Llama 3.2 (no cloud API fees, no third-party data transmission).
* **Multi-Mode AI Operations:** Switch seamlessly between narrative summaries and actionable checklist extraction.
* **Persistent Relational Storage:** Notes and generated outputs are managed via Entity Framework Core and SQL Server.
* **Clean Modern UI:** Fast search filtering, instant clipboard copying, and responsive state handling.

---

## 🛠️ Tech Stack

* **Backend:** C#, .NET 10 Web API, Entity Framework Core, SQL Server LocalDB
* **Frontend:** React, Vite, Modern CSS
* **AI Runtime:** Ollama running Llama 3.2

---

## 📂 Project Architecture

```text
SmartNotes/
│
├── SmartNotesApi.slnx        # Solution file
├── SmartNotesApi/            # .NET 10 Web API & EF Core models
└── smartnotes-ui/            # React (Vite) client interface
```

---

## ⚙️ Getting Started

### 1. Prerequisites
* [.NET 10 SDK](https://dotnet.microsoft.com/)
* [Node.js](https://nodejs.org/) (v18+)
* [Ollama](https://ollama.com/) with Llama 3.2 installed:
  ```bash
  ollama run llama3.2
  ```

### 2. Run the Backend API (.NET 10)
```bash
cd SmartNotesApi
dotnet run
```
The API will launch and listen on your configured local port (e.g., `https://localhost:7198`).

### 3. Run the Frontend (React + Vite)
Open a new terminal window or tab:
```bash
cd smartnotes-ui
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.