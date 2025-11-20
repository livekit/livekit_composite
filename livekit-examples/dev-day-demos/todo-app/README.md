# TODO Agent Backend

This directory contains a minimal HTTP API used as the backend for the LiveKit **Agent Builder** todo example. Agents call into this service to create, read, update, and delete tasks for a specific user/session, rather than managing state purely in memory.

The backend is implemented as a small [Sinatra](https://sinatrarb.com/) + ActiveRecord app in `todo-api/`:

- **Users**
  - `POST /users/create` – creates a new user with a random short `username` and returns it. Agents use this identifier to scope all subsequent todo operations to a single session.
- **Todos**
  - `GET /todos/:username` – list all todos for a user.
  - `POST /todos/:username` – create a new todo (title, optional description, optional `completed` flag).
  - `GET /todos/:username/:id` – fetch a single todo by id.
  - `PUT /todos/:username/:id` – replace an existing todo (requires a `title`).
  - `PATCH /todos/:username/:id` – partially update fields like `description` or `completed`.
  - `DELETE /todos/:username/:id` – delete a todo.

Each endpoint returns JSON shaped for easy use from tools/functions in an Agent Builder workflow (e.g., `id`, `title`, `description`, `completed`, timestamps). Validation and errors are expressed with standard HTTP status codes (422 for validation errors, 404 for “not found”, 400 for bad JSON), so your agent can reason about failures and retry or rephrase requests.
