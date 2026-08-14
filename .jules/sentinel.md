## 2024-05-24 - [Remove Hardcoded Login Credentials]
**Vulnerability:** Hardcoded credentials (email and password) were found in the initial state of the Login component (`src/pages/Login.tsx`).
**Learning:** Hardcoding credentials in the frontend exposes sensitive information to users, which can be seen in source control and by anyone who inspects the compiled application bundle.
**Prevention:** Always initialize authentication forms with empty strings and never store default or test credentials directly in the source code.
