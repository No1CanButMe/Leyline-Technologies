
# Leyline Assignment - Settlement System

---

## Overview

The Settlement System is a web-based application designed to manage financial settlements between two parties. It allows parties to propose, accept, or counter-offer settlements in a real-time, interactive environment. The backend is built using FastAPI and SQLAlchemy, while the frontend is developed with React and Material-UI. 

> **Note:** Building the backend was not necessary as a part of the assignment, but I decided to demonstrate my skills.


---

## Features

1. **Settlement Management**: 
   - Creation of new settlements with a specified amount.
   - Fetching the list of all settlements.
   - Fetching details of a specific settlement.
   - Updating the amount of a settlement if it hasn't been agreed upon.
   - Responding to a settlement by accepting or counter-offering.

2. **Real-time Communication**:
   - WebSocket-based notifications for general settlement updates and individual settlement interactions.
   - Real-time broadcasting of settlement status changes to connected clients.

3. **User Interface**:
   - Separate interfaces for Party A and Party B.
   - Party A can create and edit settlements.
   - Party B can respond to settlements with acceptance or counter-offer.
   - Visual indication of settlement status.

4. **Validation**:
   - Input validation for settlement amount and date formats.

---

## Tech Stack

1. **Backend**:
   - **FastAPI**: For creating APIs and WebSocket endpoints.
   - **SQLAlchemy**: For ORM (Object Relational Mapping) to interact with the SQLite database.
   - **SQLite**: As the database for storing settlement information.
   - **Pydantic**: For data validation and serialization.

2. **Frontend**:
   - **React**: For building the user interface.
   - **Material-UI**: For pre-built UI components and styling.
   - **React-Router**: For client-side routing.
   - **Axios**: For making HTTP requests to the backend.
   - **notistack**: For displaying notifications.

3. **WebSocket**:
   - WebSocket protocol for real-time communication between the frontend and backend.

---

## Paradigms and Patterns

1. **RESTful API**:
   - The backend exposes RESTful endpoints for creating, fetching, and updating settlements.

2. **Dependency Injection**:
   - Used in FastAPI for managing database sessions.

3. **WebSocket Communication**:
   - For real-time updates and notifications.

4. **Model-View-Controller (MVC)**:
   - Clear separation of concerns with FastAPI handling the controller logic, SQLAlchemy managing the model, and React handling the view.

5. **Single Responsibility Principle (SRP)**:
   - Each class and function has a single responsibility, making the code more modular and maintainable.

---

## File Structure

1. **Backend (main.py)**:
   - **Models**: SQLAlchemy models for defining the database schema.
   - **Schemas**: Pydantic models for data validation.
   - **Database**: SQLite setup with SQLAlchemy ORM.
   - **WebSocket Manager**: Manages WebSocket connections and broadcasting.
   - **API Endpoints**: CRUD operations for settlements and WebSocket endpoints for real-time communication.

2. **Frontend**:
   - **App.js**: Main application component, handles routing and layout.
   - **partyA.js**: Component for Party A's interface.
   - **partyB.js**: Component for Party B's interface.

---

## API Endpoints

1. **Create Settlement**: 
   - `POST /settlements/`
   - Request Body: `{ "amount": float }`
   - Response: `{ "id": int, "amount": float, "status": "pending" }`

2. **Respond to Settlement**:
   - `POST /settlements/{settlement_id}/respond`
   - Request Body: `{ "accepted": bool, "new_amount": float (optional) }`
   - Response: `{ "id": int, "amount": float, "status": "agreed/disputed", "counter_offered": bool }`

3. **Get All Settlements**:
   - `GET /settlements/`
   - Response: `[{ "id": int, "amount": float, "status": "pending/agreed/disputed", "counter_offered": bool }]`

4. **Get Settlement by ID**:
   - `GET /settlements/{settlement_id}`
   - Response: `{ "id": int, "amount": float, "status": "pending/agreed/disputed", "counter_offered": bool }`

5. **Update Settlement**:
   - `PUT /settlements/{settlement_id}/`
   - Request Body: `{ "amount": float, "last_seen": "datetime" }`
   - Response: `{ "id": int, "amount": float, "status": "pending" }`

6. **WebSocket Endpoints**:
   - `ws://localhost:8000/ws/general` (general updates)
   - `ws://localhost:8000/ws/{settlement_id}` (specific settlement updates)

---

## Conclusion

This Settlement System provides a robust and scalable solution for managing financial settlements with real-time updates and user-friendly interfaces. The chosen tech stack and paradigms ensure maintainability, scalability, and ease of use.
