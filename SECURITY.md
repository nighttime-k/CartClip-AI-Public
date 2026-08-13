# Security Policy

## Secrets

Never commit API keys, access tokens, private keys, service-account JSON, certificates, payment data, or personal information. Provider credentials must be supplied through server environment variables.

Local environment files such as `.env.local` are ignored. Only `.env.example`, containing placeholders, may be committed. Do not rename provider keys with a `NEXT_PUBLIC_` prefix; that would expose them to browser code.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for this repository when it is available. Do not publish credential material or exploit details in a public issue. If private reporting is unavailable, open a minimal issue asking the maintainer for a private contact channel without including sensitive details.

## Public-edition scope

This repository intentionally excludes production credentials, authentication, account databases, administration, billing, payment, slip-verification, and deployment infrastructure. If you add those systems in a fork, perform a separate threat model and secret scan before deployment.
