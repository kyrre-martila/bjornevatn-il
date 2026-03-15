# AI System Guide

## Purpose
This repository is an agency-ready CMS blueprint used to rapidly build client websites.

## Stack
- Next.js frontend
- NestJS API
- PostgreSQL
- Prisma ORM
- OpenAPI contract
- RBAC roles: `editor`, `admin`, `superadmin`

## Environment model
- `live`
- `staging`

## Core platform features
- content editing
- revisions
- publish workflow
- redirects
- audit logs
- staging management

## Important rules
- Do not modify core CMS logic unless necessary.
- Site-specific UI belongs in `/apps/web`.
- API extensions belong in `/apps/api/modules`.
- Reuse existing services whenever possible.

## Typical AI tasks
- create new page
- create reusable component
- extend content schema
- connect component to CMS data
- add redirect
