# FinancialPilot: Smart Financial Management for Students

FinancialPilot is a high-fidelity personal finance engine designed to help students move beyond passive expense tracking. By integrating a priority-based Goal Queue and a real-time Daily Safe Limit calculation, the platform transforms static budgeting into an active financial strategy.

---

## Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, Framer Motion |
| **Backend** | Django REST Framework (Python) |
| **Database** | SQLite (Development) / PostgreSQL (Production) |
| **Icons** | Lucide-React |
| **Logic** | RESTful API with Atomic Transaction Management |

---

## Core Features and Pages

### 1. Unified Dashboard
The Dashboard serves as the central command center for the user's financial health.
* **Daily Safe Limit (DSL):** A dynamic calculation providing the user with a specific spending limit for the current day. It is calculated as:
  $$DSL = \frac{\text{Monthly Budget Left}}{\text{Days Remaining in Month}}$$
* **Live Salary Sandbox:** Users can edit their monthly income directly from the header. This triggers a global state refresh, updating the budget, savings rate, and DSL instantly across the application.
* **Overdraft Protection:** A specialized logic engine that prevents negative balances. If an expense exceeds the current budget, the system automatically draws from the user's Life Savings to keep the budget at zero, while flagging a high-priority warning. If the expense added exceeds the sum of current budget and total life savings, the system does not let the user input the expense as enough funds are not present.

### 2. The Goal Engine (My Dreams)
A dedicated interface for long-term financial planning and asset acquisition.
* **Priority Queue (FIFO):** Goals are managed via a First-In-First-Out queue. The system automatically prioritizes funding for the top goal in the list.
* **The Piggybank:** A separate vault for goal-specific funds. Visual progress bars track the percentage of funding completed for each item in the queue.
* **Automated Goal Fulfillment:** When the Piggybank balance reaches a goal's target, a withdrawal endpoint deducts the funds, deletes the completed goal, and re-indexes the remaining queue items.

### 3. Weekly Challenges and Streaks
A gamified layer designed to encourage recurring financial discipline.
* **Category Settlement:** Users set a weekly spending limit for specific categories (e.g., Dining). At the end of the seven-day cycle, the Settlement Engine calculates the actual spend.
* **The Choice Modal:** If a user stays under their limit, they are prompted to move their savings into either their General Savings or their Goal Piggybank.
* **Financial Streak:** A persistent counter that tracks consecutive successful under DSL days. If a user exceeds their DSL on any day, the streak resets to zero, providing a psychological incentive for total discipline.
---

## Technical Implementation

### Data Integrity and Atomic Transactions
To ensure financial accuracy, all critical operations—including goal withdrawals and weekly settlements—are wrapped in Django `@transaction.atomic()` blocks. This guarantees that if any part of a multi-step financial transfer fails, the entire operation rolls back to prevent data corruption or "lost" funds.

### Premium UI/UX Design
The platform utilizes a modern "Glassmorphism" aesthetic characterized by:
* **Backdrop Filters:** Transparent, blurred layers for a deep-dark indigo theme.
* **Ambient Glows:** Soft, context-aware shadows that emit light based on the card's financial status.
* **State Management:** Seamless integration between React state and the Django backend to ensure that dashboard metrics update without requiring a page reload.

---

## Installation and Setup

### Backend (Django)
1. Navigate to the backend directory.
2. Install dependencies: `pip install -r requirements.txt`
3. Execute migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Start the server: `python manage.py runserver`

### Frontend (React)
1. Navigate to the frontend directory.
2. Install packages: `npm install`
3. Launch the application: `npm run dev`

---

## Team 

* **Backend Development:** Harshit Mehta
* **Frontend Implementation:** Kartik Gulati
* **Product Strategy:** Garish Juneja & Rohit Kaushik
