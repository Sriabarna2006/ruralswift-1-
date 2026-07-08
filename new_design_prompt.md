You are a Principal Software Architect, Senior Angular Developer, Senior Express.js Developer, Senior PostgreSQL Database Architect, Senior UI/UX Engineer, DevOps Engineer, QA Engineer, and Code Reviewer.

Your responsibility is to build RuralSwift into a production-ready application from my new [design.html](file;file:///d%3A/ruralswift-venkat/New-design/design.html) design.

This is NOT just an HTML conversion task.

You are responsible for planning, designing, implementing, integrating, testing, validating, and optimizing the complete application.

Your objective is to produce an enterprise-quality codebase that is scalable, maintainable, secure, responsive, and free from architectural issues.

======================================================

CURRENT TECHNOLOGY STACK

======================================================

Frontend

- Angular

- TypeScript

- HTML

- CSS

Backend

- Node.js

- Express.js

Database

- PostgreSQL (Neon)

Authentication

- Existing authentication (extend if necessary)

======================================================

PROJECT GOAL

======================================================

I will provide:

1. [design.html](file;file:///d%3A/ruralswift-venkat/New-design/design.html)

2. Workflow chart

3. Existing project

The workflow chart is the primary business logic reference.

The design.html is the UI reference.

Your responsibility is to convert both into one seamless production application.

======================================================

MOST IMPORTANT RULE

======================================================

DO NOT start coding immediately.

Follow the phases below.

Wait for my approval after every phase.

Never skip phases.

Never merge multiple phases together.

======================================================

PHASE 1

PROJECT ANALYSIS ONLY

(NO CODE)

======================================================

Analyze:

• Entire [design.html](file;file:///d%3A/ruralswift-venkat/New-design/design.html)

• Workflow logic : Based on the flowchart,

---

# Seller Flow

```
Seller Opens App
        │
        ▼
Has Seller Account?
        │
   ┌────┴────┐
 No         Yes
 │           │
 ▼           ▼
Seller Signup / KYC Verification
        │
        ▼
     Sellers DB
        │
        ▼
Seller Hub Dashboard
        │
        ├──────────────► Pack & Ship Order
        │                    │
        │                    ▼
        │              Track Order Live
        │                    │
        │                    ▼
        │                Orders DB
        │                    │
        │        Notify Buyer & Seller (API)
        │
        ▼
Add Product
(title, price, images, stock)
        │
        ▼
Pass Compliance Check?
        │
   ┌────┴────┐
 No         Yes
 │           │
 ▼           ▼
Rejected → Notify Seller     Product Goes Live
                             │
                             ▼
                         Products DB
```

---

# Product Discovery

```
Product Posted To
        │
        ├── Recommendation Engine
        │
        ├── Main Dashboard Feed
        │
        └── Search Engine Index
                │
                ▼
        Browse / Search Products
```

---

# User Flow

```
User Opens App
        │
        ▼
Has Account?
        │
   ┌────┴────┐
 No         Yes
 │           │
 ▼           ▼
Signup      Login
      │
      ▼
    Users DB
      │
      ▼
Main Dashboard
      │
      ▼
Browse / Search Products
```

---

# Wishlist Flow

```
User Action
      │
      ├── API: add_to_wishlist
      ▼
Add to Wishlist
      │
      ▼
Wishlist DB
      │
      ▼
Wishlist Page
      │
      ▼
Move to Cart
```

---

# Cart Flow

```
Browse Product
      │
      ▼
Add to Cart
      │
      ▼
Cart DB
      │
      ▼
View Cart
      │
      ▼
Checkout?
```

---

# Checkout Flow

```
Checkout
     │
     ├── No
     │      │
     │      ▼
     │ Continue Browsing
     │
     └── Yes
            │
            ▼
Proceed to Buy
            │
            ▼
Enter / Select Address
            │
            ▼
Users DB + Addresses
```

---

# Payment Flow

```
Payment Successful?
       │
  ┌────┴────┐
 Yes        No
 │           │
 ▼           ▼
Order Placed   Select Payment Method
       │
       ▼
Products DB
       │
       ▼
Orders DB
```

---

# Order Flow

```
Order Placed
      │
      ▼
Orders DB
      │
      ▼
Seller Packs & Ships
      │
      ▼
Track Order Live
      │
      ▼
Status Updates
      │
      ▼
Buyer Receives Order
      │
      ▼
Order Delivered
```

---

# Review Flow

```
Order Delivered
       │
       ▼
Leave Rating / Review
       │
       ▼
Reviews DB
       │
       ▼
Displayed on Product Details Page
```

---

# Databases

* Users DB
* Sellers DB
* Products DB
* Orders DB
* Cart DB
* Wishlist DB
* Reviews DB
* Users + Addresses DB

---

# APIs Mentioned

* `API: add_to_wishlist`
* `API: add_to_cart`
* `API: buy_now`
* Notify Buyer & Seller API
* Order Status Update API

---

# Overall End-to-End Flow

```
Seller
Open App
→ Signup/KYC
→ Seller Dashboard
→ Add Product
→ Compliance Check
→ Product Live
→ Products DB

↓

User
Open App
→ Login/Signup
→ Dashboard
→ Search/Browse
→ Wishlist/Cart
→ Checkout
→ Address
→ Payment
→ Order Placed
→ Orders DB
→ Seller Ships
→ Track Order
→ Delivered
→ Review
→ Product Details Updated
```

This is the complete textual representation of the architecture shown in your diagram.

• Existing project structure

Understand:

Customer flow

Seller flow

Admin flow

Authentication flow

Product flow

Order flow

Wishlist flow

Cart flow

Payment flow

Delivery flow

Review flow

Search flow

Recommendation flow

Inventory flow

Notification flow

Then generate:

1.

Application Architecture

2.

Complete page hierarchy

3.

Component hierarchy

4.

API hierarchy

5.

Database hierarchy

6.

Feature list

7.

Missing pages

8.

Missing UI

9.

Missing backend logic

10.

Missing database tables

11.

Potential bottlenecks

12.

Security risks

13.

Scalability concerns

14.

Performance improvements

15.

Recommended project structure

DO NOT WRITE CODE.

Wait for approval.

======================================================

PHASE 2

UI IMPLEMENTATION

======================================================

Convert [design.html](file;file:///d%3A/ruralswift-venkat/New-design/design.html)  into Angular.

Requirements:

• Pixel-perfect

• Fully responsive

• Accessible

• Reusable components

• Mobile-first

• No backend

• No APIs

• No demo data

• No fake JSON

Replace every hardcoded/demo item with Angular-ready dynamic placeholders (bindings/interfaces only), ready for future backend integration.

Do not implement business logic yet.

When UI is complete, STOP.

Ask me to review the design.

Do not continue until I approve.

======================================================

PHASE 3

BACKEND ARCHITECTURE

======================================================

Only after UI approval.

Design the backend.

Before writing code explain:

Folder structure

Controllers

Routes

Services

Repositories

Middlewares

Utilities

Validation

Authentication

Authorization

File upload strategy

Error handling

Logging

Environment variables

Rate limiting

Caching (if applicable)

API versioning

Then wait for approval.

======================================================

PHASE 4

DATABASE DESIGN

======================================================

Only after backend approval.

Design PostgreSQL.

Provide:

ER Diagram (text/table form)

Table list

Relationships

Primary keys

Foreign keys

Indexes

Unique constraints

Check constraints

Cascade rules

Soft delete strategy

Audit fields

Timestamps

Data normalization

Explain how every table relates to the workflow.

Example:

Users

Addresses

Products

Categories

Inventory

Seller Profiles

Orders

Order Items

Payments

Payment Methods

Reviews

Wishlist

Cart

Notifications

Coupons

Returns

Shipments

Delivery Tracking

Recommendations

Search History

Activity Logs

Sessions

OTP

Email Verification

Password Reset

Explain WHY each table exists.

Then wait.

======================================================

PHASE 5

DATABASE IMPLEMENTATION

======================================================

Generate:

Migration scripts

Schema

Indexes

Constraints

Seed structure (without demo data)

Connection configuration

Neon PostgreSQL integration

Connection pooling

Transactions

Rollback strategy

======================================================

PHASE 6

API IMPLEMENTATION

======================================================

Generate APIs only after DB approval.

RESTful.

Proper HTTP methods.

Validation.

Authentication.

Authorization.

Pagination.

Filtering.

Searching.

Sorting.

Error responses.

Status codes.

No redundant endpoints.

======================================================

PHASE 7

CONNECT UI TO BACKEND

======================================================

Integrate:

Angular Services

HTTP calls

Interceptors

Authentication

State management

Loading states

Retry handling

Empty states

Error handling

Skeleton loading

======================================================

PHASE 8

REMOVE ALL DEMO DATA

======================================================

Every demo item inside design.html must be removed.

Never keep placeholder products.

Never keep fake users.

Never keep fake reviews.

Never keep fake orders.

Every displayed item must originate from the backend/database once integrated.

Until backend is connected, use typed interfaces and loading states instead of fake content.

======================================================

WORKFLOW IMPLEMENTATION

======================================================

The workflow diagram I provide is the source of truth.

Implement every business process according to it.

If you identify missing steps, race conditions, edge cases, or opportunities for improvement, explain them before implementation.

Suggest enhancements only if they improve reliability, security, maintainability, or user experience without breaking the intended workflow.

======================================================

HOW THE UI SHOULD WORK

======================================================

Design every screen for a real production e-commerce platform.

Include:

Loading states

Empty states

Error states

Offline handling (where appropriate)

Validation

Responsive layouts

Accessibility

Animations only if lightweight

No layout shifts

No overflow

No duplicate components

No dead links

No broken navigation

======================================================

HOW THE BACKEND SHOULD WORK

======================================================

Backend should be modular.

Request Flow:

Angular

↓

Interceptor

↓

Route

↓

Middleware

↓

Controller

↓

Service

↓

Repository

↓

PostgreSQL

↓

Repository

↓

Service

↓

Controller

↓

Response

Implement centralized:

Error handling

Logging

Validation

Authentication

Authorization

======================================================

HOW THE DATABASE SHOULD WORK

======================================================

Normalize data appropriately while balancing performance.

Use transactions for multi-step operations (e.g., placing an order).

Maintain referential integrity with foreign keys.

Prevent orphaned records.

Design for future scalability (e.g., multiple sellers, order history, inventory changes).

======================================================

QUALITY REQUIREMENTS

======================================================

Before every phase verify:

✓ No TypeScript errors

✓ No Angular build errors

✓ No Express errors

✓ No SQL errors

✓ No circular dependencies

✓ No duplicate APIs

✓ No duplicate database tables

✓ No unreachable routes

✓ No security vulnerabilities

✓ No console errors

✓ No unused files

✓ No dead code

✓ No hardcoded credentials

✓ No hardcoded demo content

✓ Mobile responsive

✓ Production-ready

======================================================

ESTIMATION

======================================================

At the start of each phase provide:

• Estimated implementation time

• Complexity (Low / Medium / High)

• Risks

• Dependencies

• Deliverables

At the end of each phase provide:

• Completion checklist

• Files created

• Files modified

• Files untouched

• Next phase preview

Never proceed automatically.

Always wait for my approval before starting the next phase.

additional recommendations

Based on your workflow diagram, I recommend adding these requirements:

Freeze the UI first: Do not start backend or database work until the entire UI is approved. Changing the UI after backend integration creates unnecessary rework.

Use the workflow diagram as the contract: Every API, database table, and business rule should map back to a step in the workflow. If something doesn't support the workflow, question whether it should exist.

Generate an API specification before coding: Have Antigravity produce an endpoint list (method, URL, request body, response, authentication) before implementing controllers.

Review the database schema before migrations: Validate all entities and relationships first, then create migrations. Changing schemas after data exists is more expensive.

Build incrementally: Complete one vertical slice at a time (for example: Authentication → Seller onboarding → Product management → Shopping → Checkout → Orders) and test each slice before moving on.

Require acceptance criteria: At the end of every phase, ask Antigravity to explain how you can verify that the implementation is correct, including manual test steps.