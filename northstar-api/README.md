# Checklist 

1. employee CRUD
2. protected routes
3. role authorization
4. validation
5. relations between users ↔ employees
6. better error handling
7. service/controller separation cleanup


let's start with the auth middleware, we already have JWT verify, req.user, and protected routes (Authorization)


next we need role middleware which we already do have
so the flow basically goes to, auth middlewarre -> decode token -> attach req.user -> role middleware check


Protected employee routes CRUD
GET /employees

GET /employees/:id

POST /employees

PATCH /employees/:id

DELETE /employees/:id


access to all by default are "admin", and "admin" & "manager" to the GET /employees


lets's check if we have zod installed already.
we will need that for validation.
we don't so let's install it.

let's create the employee routes controller and service.

We just basically finished the employee flow

-> Route
-> Middleware
-> Controller
-> Service
-> Database


Let's try testing the /employees route now.



We first need to install the dependency test runner which is Vitest, and for the Express routes Supertest


















