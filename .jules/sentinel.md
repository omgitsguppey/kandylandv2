## 2024-05-24 - [Insecure Randomness for Security Tokens/IDs]
**Vulnerability:** Weak random number generation using `Math.random()` as a fallback for generating identifiers, tokens, and session IDs.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted, leading to session hijacking or predictable ID vulnerabilities.
**Prevention:** Remove `Math.random()` fallbacks. If `crypto.randomUUID()` or `crypto.getRandomValues()` are not available, throw an error to fail securely.
## 2024-05-24 - [Cryptographic Secret Reuse]
**Vulnerability:** `process.env.FIREBASE_PRIVATE_KEY` was used as a fallback for the symmetric navigation cookie signing secret.
**Learning:** Cryptographic secrets must be strictly single-purpose. Using an asymmetric administrative key (like a Firebase Private Key) as a symmetric HMAC signing key risks exposing the admin credential if the cookie signature is compromised, granting full infrastructure access.
**Prevention:** Remove sensitive fallback credentials. If a specific required secret is missing, fail securely or return empty rather than reusing another high-value credential.
