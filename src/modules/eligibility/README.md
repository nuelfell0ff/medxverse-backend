# HMO Eligibility & Benefit Verification

This module follows the existing HMO Express/Mongoose architecture used by Enrollees, Claims, Pre-Authorizations and the HMO Provider module.

## Routes

- `POST /api/v1/eligibility/verify`
- `GET /api/v1/eligibility/stats`
- `GET /api/v1/eligibility/checks`
- `GET /api/v1/eligibility/checks/:id`
- `GET /api/v1/eligibility/member/:memberId`

## Registration

Mount `eligibility.routes.ts` at `/api/v1/eligibility` in the application's central HMO router.

The service uses the existing Enrollee/member collection, HMOProvider collection, and HMSClaim collection. Benefit rules are read from the populated `benefitPlanId`, so the eligibility module does not create a duplicate benefit-plan collection.
