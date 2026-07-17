# HELIOS CM Enterprise
## Identity Module Architecture v1.0

## Objective

Provide a complete authentication and authorization layer for HELIOS CM Enterprise.

This module becomes the single entry point for every authenticated user.

---

# Architecture

Browser
    │
    ▼
Login Page
    │
    ▼
Supabase Auth
    │
    ▼
AuthProvider
    │
    ▼
Profile Loader
    │
    ▼
Role Resolver
    │
    ▼
Protected Routes
    │
    ▼
Application Modules

---

# Folder Structure

src/features/auth/

components/
context/
guards/
hooks/
pages/
repositories/
services/

---

# Responsibilities

## AuthProvider

Responsible for:

- current session
- authenticated user
- loading state
- profile loading
- sign in
- sign out

---

## authRepository

Responsible only for communication with Supabase Auth.

No UI.

No business logic.

---

## authService

Responsible for application authentication logic.

Examples:

- login
- logout
- reset password
- refresh session

---

## Profile Loader

Loads:

- full name
- company
- role
- active status

from table:

public.profiles

---

## Roles

Supported roles:

ADMIN

IPP

DL

EPC

VIEWER

---

## ProtectedRoute

Unauthenticated users

↓

redirect to Login

Authenticated users

↓

access granted

---

## Future Extensions

- MFA
- SSO
- Azure AD
- Google Workspace
- Audit Log

