/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { bearer, jsonBody } from "../shared";

export const authPaths = {
  "/users": {
    get: {
      summary: "List users",
      tags: ["Users"],
      security: bearer,
      responses: { "200": { description: "List of users" } },
    },
    post: {
      summary: "Create user",
      tags: ["Users"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["email", "password", "displayName"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          displayName: { type: "string" },
          role: { type: "string", enum: ["admin", "editor", "author"], default: "author" },
        },
      }),
      responses: {
        "201": { description: "User created" },
        "400": { description: "Validation error" },
        "409": { description: "Email already exists" },
      },
    },
  },
  "/users/{id}": {
    put: {
      summary: "Update user",
      tags: ["Users"],
      security: bearer,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: jsonBody(
        {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            password: { type: "string", format: "password" },
            role: { type: "string", enum: ["admin", "editor", "author"] },
          },
        },
        false
      ),
      responses: { "200": { description: "User updated" }, "404": { description: "Not found" } },
    },
    delete: {
      summary: "Delete user",
      tags: ["Users"],
      security: bearer,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "User deleted" }, "404": { description: "Not found" } },
    },
  },
  "/profile": {
    get: {
      summary: "Get current user profile",
      tags: ["Profile"],
      security: bearer,
      responses: { "200": { description: "Current user" }, "401": { description: "Unauthorized" } },
    },
    put: {
      summary: "Update current user profile",
      tags: ["Profile"],
      security: bearer,
      requestBody: jsonBody(
        {
          type: "object",
          properties: {
            displayName: { type: "string" },
            email: { type: "string", format: "email" },
            bio: { type: "string" },
            avatarUrl: { type: "string" },
            password: { type: "string", format: "password" },
          },
        },
        false
      ),
      responses: { "200": { description: "Profile updated" }, "401": { description: "Unauthorized" } },
    },
  },
  "/api-keys": {
    get: {
      summary: "List API keys",
      tags: ["API Keys"],
      security: bearer,
      responses: { "200": { description: "List of the caller's API keys (no secrets)" } },
    },
    post: {
      summary: "Create API key",
      tags: ["API Keys"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
      }),
      responses: {
        "201": { description: "API key created; plaintext key returned once in `key`" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/api-keys/{id}": {
    delete: {
      summary: "Revoke API key",
      tags: ["API Keys"],
      security: bearer,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Key revoked" }, "404": { description: "Not found" } },
    },
  },
  "/auth/login": {
    post: {
      summary: "Login",
      tags: ["Auth"],
      requestBody: jsonBody({
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      }),
      responses: {
        "200": { description: "Login successful; returns access token, sets refresh cookie" },
        "401": { description: "Invalid credentials" },
      },
    },
  },
  "/auth/refresh": {
    post: {
      summary: "Refresh access token",
      tags: ["Auth"],
      responses: {
        "200": { description: "New access token" },
        "401": { description: "Invalid refresh token" },
      },
    },
  },
  "/auth/mfa": {
    post: {
      summary: "Complete MFA login",
      description: "Second step of login for MFA-enabled users. Accepts a TOTP code or a recovery code.",
      tags: ["MFA"],
      requestBody: jsonBody({
        type: "object",
        required: ["mfaToken", "code"],
        properties: {
          mfaToken: { type: "string", description: "Short-lived token from the login response" },
          code: { type: "string", description: "TOTP or recovery code" },
        },
      }),
      responses: {
        "200": { description: "MFA verified; returns access and refresh tokens" },
        "400": { description: "Invalid MFA code" },
        "401": { description: "Invalid or expired MFA token" },
      },
    },
  },
  "/profile/mfa/setup": {
    post: {
      summary: "Begin MFA enrollment",
      description: "Generates a new TOTP secret, otpauth URL, and recovery codes. Does not enable MFA yet.",
      tags: ["MFA"],
      security: bearer,
      responses: {
        "200": { description: "Secret, otpauthUrl, and recoveryCodes" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/profile/mfa/verify": {
    post: {
      summary: "Confirm and enable MFA",
      tags: ["MFA"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["secret", "code", "recoveryCodes"],
        properties: {
          secret: { type: "string" },
          code: { type: "string" },
          recoveryCodes: { type: "array", items: { type: "string" } },
        },
      }),
      responses: {
        "200": { description: "MFA enabled" },
        "400": { description: "Invalid verification code" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/profile/mfa/disable": {
    post: {
      summary: "Disable MFA",
      tags: ["MFA"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["password"],
        properties: { password: { type: "string", format: "password" } },
      }),
      responses: {
        "200": { description: "MFA disabled" },
        "400": { description: "Invalid password" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/users/{id}/mfa/reset": {
    post: {
      summary: "Reset a user's MFA (admin)",
      tags: ["MFA"],
      security: bearer,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "MFA reset for the user" },
        "401": { description: "Unauthorized" },
        "404": { description: "User not found" },
      },
    },
  },
};
