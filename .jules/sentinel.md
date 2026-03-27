## 2024-05-24 - [Insecure Randomness for Security Tokens/IDs]
**Vulnerability:** Weak random number generation using `Math.random()` as a fallback for generating identifiers, tokens, and session IDs.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted, leading to session hijacking or predictable ID vulnerabilities.
**Prevention:** Remove `Math.random()` fallbacks. If `crypto.randomUUID()` or `crypto.getRandomValues()` are not available, throw an error to fail securely.
